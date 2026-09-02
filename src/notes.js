import { 
  state, 
  notesCache, 
  uid, 
  getNotesKey, 
  getDraftKey, 
  setStatus, 
  askConfirm 
} from './state.js';
import { WORKSPACES, INSTITUTIONAL_TEMPLATES } from './constants.js';
import { el } from './dom.js';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  analyzeEmailDomain, 
  handleFirestoreError 
} from './firebase.js';
import { loadTrash, saveTrash } from './trash.js';
import { generateAutoFolio, openFormalPrintModal } from './print.js';
import { speakText } from './speech.js';

let currentPreviewNote = null;
let pendingTemplate = null;

// ==========================================================================
// PERSISTENCIA Y CARGA DE NOTAS / REPORTES (FIRESTORE + LOCAL)
// ==========================================================================
export async function loadNotes(folderId, ws = state.workspace) {
  const cacheKey = `${ws}:${folderId}`;
  const localKey = getNotesKey(folderId, ws);

  // 1. Try Firebase Firestore if logged in
  if (db && state.currentUser && state.currentUser.uid) {
    try {
      let notes = [];
      if (ws === WORKSPACES.PERSONAL) {
        const q = query(
          collection(db, 'users', state.currentUser.uid, 'notes'),
          where('folder', '==', folderId),
          where('isTrash', '==', false)
        );
        const snap = await getDocs(q);
        notes = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      } else {
        // Multi-tenant Org Domain Filter
        const orgDomain = state.currentUser.orgDomain || analyzeEmailDomain(state.currentUser.email).domain;
        const q = query(
          collection(db, 'reports'),
          where('orgDomain', '==', orgDomain),
          where('folder', '==', folderId),
          where('isTrash', '==', false)
        );
        const snap = await getDocs(q);
        notes = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      }

      notesCache[cacheKey] = notes;
      localStorage.setItem(localKey, JSON.stringify(notes));
      if (ws === state.workspace && folderId === state.activeFolderId) {
        state.notes = notes;
      }
      return notes;
    } catch (err) {
      handleFirestoreError(err, 'list', ws === WORKSPACES.PERSONAL ? `users/${state.currentUser.uid}/notes` : 'reports');
      console.warn('Firestore load failed, falling back to local cache:', err);
      setStatus('Aviso: Trabajando con caché local (sin conexión al servidor)', true);
    }
  }

  // 2. Read Local Storage
  let notes = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) notes = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading notes from localStorage:', e);
  }

  // Backward compatibility
  if ((!notes || notes.length === 0) && ws === WORKSPACES.PERSONAL) {
    try {
      const leg = localStorage.getItem(`notes_${folderId}`);
      if (leg) notes = JSON.parse(leg);
    } catch (e) {}
  }

  notesCache[cacheKey] = notes || [];
  if (ws === state.workspace && folderId === state.activeFolderId) {
    state.notes = notesCache[cacheKey];
  }
  return notesCache[cacheKey];
}

/**
 * Persist a single note into Firestore (surgical write, optimal quota usage)
 */
export async function persistSingleNote(folderId, note, ws = state.workspace) {
  if (!db || !state.currentUser || !state.currentUser.uid) return;

  try {
    const firstLine = note.text ? note.text.split('\n')[0].slice(0, 100) : 'Nota';
    if (ws === WORKSPACES.PERSONAL) {
      const ref = doc(db, 'users', state.currentUser.uid, 'notes', note.id);
      await setDoc(ref, {
        ...note,
        title: note.title || firstLine,
        folder: folderId,
        authorUid: state.currentUser.uid,
        isTrash: note.isTrash === true,
        updatedAt: Date.now()
      }, { merge: true });
    } else {
      const orgDomain = state.currentUser.orgDomain || analyzeEmailDomain(state.currentUser.email).domain;
      const ref = doc(db, 'reports', note.id);
      await setDoc(ref, {
        ...note,
        title: note.title || firstLine,
        folder: folderId,
        orgDomain: orgDomain,
        authorUid: state.currentUser.uid,
        authorEmail: state.currentUser.email || '',
        authorName: state.currentUser.displayName || state.currentUser.email,
        isTrash: note.isTrash === true,
        updatedAt: Date.now()
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, 'write', ws === WORKSPACES.PERSONAL ? `users/${state.currentUser.uid}/notes/${note.id}` : `reports/${note.id}`);
    console.warn('Firestore single note sync failed:', err);
    setStatus('Error de sincronización con la nube. Guardado en navegador.', true);
  }
}

/**
 * Persist collection of notes locally and in memory
 */
export async function persistNotes(folderId, notes, ws = state.workspace) {
  const cacheKey = `${ws}:${folderId}`;
  notesCache[cacheKey] = notes;
  localStorage.setItem(getNotesKey(folderId, ws), JSON.stringify(notes));
}

// ==========================================================================
// GESTIÓN DE BORRADORES (AUTOSAVE)
// ==========================================================================
export function loadDraft(folderId) {
  const saved = localStorage.getItem(getDraftKey(folderId));
  if (saved && !state.currentNoteId) {
    try {
      const d = JSON.parse(saved);
      if (el.editor) el.editor.value = d.text || '';
      if (el.tagsInput) el.tagsInput.value = (d.tags || []).join(', ');
      if (el.docTypeSelect && d.docType) el.docTypeSelect.value = d.docType;
      if (el.docFolioInput && d.docFolio) el.docFolioInput.value = d.docFolio;
      if (el.taskAssigneeSelect && d.taskAssignee) el.taskAssigneeSelect.value = d.taskAssignee;
      if (el.taskDueDate && d.taskDueDate) el.taskDueDate.value = d.taskDueDate;
      if (el.taskPrioritySelect && d.taskPriority) el.taskPrioritySelect.value = d.taskPriority;
      if (el.taskStatusSelect && d.taskStatus) el.taskStatusSelect.value = d.taskStatus;
      if (el.docAttendeesInput && d.docAttendees) el.docAttendeesInput.value = d.docAttendees;
    } catch (e) {
      if (el.editor) el.editor.value = saved;
    }
  } else if (!state.currentNoteId) {
    resetEditorForm();
  }
}

export function saveDraft() {
  if (!state.activeFolderId || state.currentNoteId) return;
  const text = el.editor ? el.editor.value.trim() : '';
  if (!text) {
    localStorage.removeItem(getDraftKey(state.activeFolderId));
    return;
  }
  const draftObj = {
    text: el.editor.value,
    tags: (el.tagsInput ? el.tagsInput.value : '').split(',').map(s => s.trim()).filter(Boolean),
    docType: el.docTypeSelect ? el.docTypeSelect.value : 'general',
    docFolio: el.docFolioInput ? el.docFolioInput.value : '',
    taskAssignee: el.taskAssigneeSelect ? el.taskAssigneeSelect.value : '',
    taskDueDate: el.taskDueDate ? el.taskDueDate.value : '',
    taskPriority: el.taskPrioritySelect ? el.taskPrioritySelect.value : 'normal',
    taskStatus: el.taskStatusSelect ? el.taskStatusSelect.value : 'pendiente',
    docAttendees: el.docAttendeesInput ? el.docAttendeesInput.value : ''
  };
  localStorage.setItem(getDraftKey(state.activeFolderId), JSON.stringify(draftObj));
}

export function resetEditorForm() {
  if (el.editor) el.editor.value = '';
  if (el.tagsInput) el.tagsInput.value = '';
  if (el.docTypeSelect) el.docTypeSelect.value = 'general';
  if (el.docFolioInput) el.docFolioInput.value = '';
  if (el.taskAssigneeSelect) el.taskAssigneeSelect.value = '';
  if (el.taskDueDate) el.taskDueDate.value = '';
  if (el.taskPrioritySelect) el.taskPrioritySelect.value = 'normal';
  if (el.taskStatusSelect) el.taskStatusSelect.value = 'pendiente';
  if (el.docAttendeesInput) el.docAttendeesInput.value = '';
  if (el.currentFolioBadge) el.currentFolioBadge.textContent = 'Folio: Auto';
}

// ==========================================================================
// EDITOR & CARGA DE DOCUMENTOS
// ==========================================================================
export function loadNoteIntoEditor(note) {
  state.currentNoteId = note.id;
  if (el.editor) el.editor.value = note.text;
  if (el.tagsInput) el.tagsInput.value = (note.tags || []).join(', ');

  if (el.docTypeSelect) el.docTypeSelect.value = note.docType || 'general';
  if (el.docFolioInput) el.docFolioInput.value = note.docFolio || '';
  if (el.taskAssigneeSelect) el.taskAssigneeSelect.value = note.taskAssignee || '';
  if (el.taskDueDate) el.taskDueDate.value = note.taskDueDate || '';
  if (el.taskPrioritySelect) el.taskPrioritySelect.value = note.taskPriority || 'normal';
  if (el.taskStatusSelect) el.taskStatusSelect.value = note.taskStatus || 'pendiente';
  if (el.docAttendeesInput) el.docAttendeesInput.value = note.docAttendees || '';
  if (el.currentFolioBadge) {
    el.currentFolioBadge.textContent = note.docFolio ? `Folio: ${note.docFolio}` : 'Folio: Auto';
  }

  // Switch to editor tab on mobile
  if (window.innerWidth <= 820 && el.tabEditorBtn) {
    el.tabEditorBtn.click();
  }
  if (el.editor) el.editor.focus();
  setStatus('Documento cargado en editor');
}

export async function saveCurrentNote() {
  const text = el.editor ? el.editor.value.trim() : '';
  if (!text) {
    setStatus('No puedes guardar un documento vacío.', true);
    return;
  }

  const tags = (el.tagsInput ? el.tagsInput.value : '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isEnterprise = state.workspace === WORKSPACES.ENTERPRISE;

  let docFolio = el.docFolioInput ? el.docFolioInput.value.trim() : '';
  if (isEnterprise && !docFolio) {
    docFolio = generateAutoFolio();
    if (el.docFolioInput) el.docFolioInput.value = docFolio;
  }

  const docType = el.docTypeSelect ? el.docTypeSelect.value : 'general';
  const taskAssignee = el.taskAssigneeSelect ? el.taskAssigneeSelect.value : '';
  const taskDueDate = el.taskDueDate ? el.taskDueDate.value : '';
  const taskPriority = el.taskPrioritySelect ? el.taskPrioritySelect.value : 'normal';
  const taskStatus = el.taskStatusSelect ? el.taskStatusSelect.value : 'pendiente';
  const docAttendees = el.docAttendeesInput ? el.docAttendeesInput.value.trim() : '';

  if (state.currentNoteId) {
    // Editar nota existente
    const idx = state.notes.findIndex(n => n.id === state.currentNoteId);
    if (idx !== -1) {
      state.notes[idx] = {
        ...state.notes[idx],
        text,
        tags,
        docType,
        docFolio: isEnterprise ? docFolio : (state.notes[idx].docFolio || ''),
        taskAssignee,
        taskDueDate,
        taskPriority,
        taskStatus,
        docAttendees,
        updatedAt: Date.now()
      };
      await persistSingleNote(state.activeFolderId, state.notes[idx]);
      setStatus('Documento actualizado ✓');
    }
  } else {
    // Crear nueva nota
    const newNote = {
      id: uid(),
      text,
      tags,
      docType,
      docFolio: isEnterprise ? docFolio : '',
      taskAssignee,
      taskDueDate,
      taskPriority,
      taskStatus,
      docAttendees,
      pinned: false,
      createdAt: Date.now()
    };
    state.notes.unshift(newNote);
    state.currentNoteId = newNote.id;
    localStorage.removeItem(getDraftKey(state.activeFolderId));
    await persistSingleNote(state.activeFolderId, newNote);
    setStatus('Documento registrado ✓');
  }

  if (el.currentFolioBadge) {
    el.currentFolioBadge.textContent = docFolio ? `Folio: ${docFolio}` : 'Folio: Auto';
  }

  await persistNotes(state.activeFolderId, state.notes);
  renderNotesList();
  renderTagFilters();
}

export async function togglePinNote(noteId) {
  const idx = state.notes.findIndex(n => n.id === noteId);
  if (idx === -1) return;
  state.notes[idx].pinned = !state.notes[idx].pinned;
  await persistSingleNote(state.activeFolderId, state.notes[idx]);
  await persistNotes(state.activeFolderId, state.notes);
  renderNotesList();
}

export async function trashNote(noteId) {
  const idx = state.notes.findIndex(n => n.id === noteId);
  if (idx === -1) return;
  const [removed] = state.notes.splice(idx, 1);
  await persistNotes(state.activeFolderId, state.notes);

  // Soft-delete in Firestore (marks isTrash: true) so it can be restored on any device
  const softDeletedNote = {
    ...removed,
    isTrash: true,
    deletedAt: Date.now()
  };
  await persistSingleNote(state.activeFolderId, softDeletedNote);

  const folder = state.folders.find(f => f.id === state.activeFolderId);
  const trash = loadTrash();
  trash.unshift({
    ...removed,
    folderId: state.activeFolderId,
    folderName: folder ? folder.name : 'Carpeta',
    deletedAt: Date.now()
  });
  saveTrash(trash);

  if (state.currentNoteId === noteId) {
    state.currentNoteId = null;
    resetEditorForm();
  }

  renderNotesList();
  renderTagFilters();
  setStatus('Nota movida a la papelera (Recuperable durante 30 días) ✓');
}

// ==========================================================================
// RENDERIZADO DE LA LISTA DE NOTAS Y TARJETAS
// ==========================================================================
export function renderNotesList() {
  if (!el.notesList) return;
  el.notesList.innerHTML = '';

  let list = [...state.notes];

  // Tag filter
  if (state.tagFilter) {
    list = list.filter(n => (n.tags || []).includes(state.tagFilter));
  }

  // Enterprise Status filter
  if (state.workspace === WORKSPACES.ENTERPRISE && state.statusFilter && state.statusFilter !== 'all') {
    list = list.filter(n => (n.taskStatus || 'pendiente') === state.statusFilter);
  }

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(n => {
      const matchText = n.text.toLowerCase().includes(q);
      const matchTags = (n.tags || []).some(t => t.toLowerCase().includes(q));
      const matchFolio = (n.docFolio || '').toLowerCase().includes(q);
      const matchAssignee = (n.taskAssignee || '').toLowerCase().includes(q);
      const matchAttendees = (n.docAttendees || '').toLowerCase().includes(q);
      return matchText || matchTags || matchFolio || matchAssignee || matchAttendees;
    });
  }

  // Sort
  list.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    if (state.sortMode === 'antiguas') {
      return (a.createdAt || 0) - (b.createdAt || 0);
    } else if (state.sortMode === 'az') {
      return a.text.localeCompare(b.text);
    } else if (state.sortMode === 'za') {
      return b.text.localeCompare(a.text);
    } else if (state.sortMode === 'prioridad') {
      const pWeights = { alta: 3, media: 2, normal: 1, baja: 0 };
      return (pWeights[b.taskPriority] || 1) - (pWeights[a.taskPriority] || 1);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const term = state.workspace === WORKSPACES.ENTERPRISE ? 'reportes' : 'notas';
  if (el.notesCount) el.notesCount.textContent = `${list.length} ${term}`;
  if (el.mobileNotesBadge) el.mobileNotesBadge.textContent = list.length.toString();

  if (list.length === 0) {
    const emptyMsg = state.workspace === WORKSPACES.ENTERPRISE 
      ? 'No hay reportes ni expedientes en esta área.' 
      : 'No hay notas en esta carpeta.';
    el.notesList.innerHTML = `<div class="empty-state"><p>${emptyMsg}</p></div>`;
    return;
  }

  list.forEach(n => {
    const card = document.createElement('div');
    card.className = 'note-card' + 
      (n.id === state.currentNoteId ? ' current' : '') + 
      (n.pinned ? ' pinned' : '') +
      (n.taskPriority === 'alta' ? ' priority-high' : '');
    card.dataset.id = n.id;

    // Header with Folio or Pin
    const header = document.createElement('div');
    header.className = 'note-card-header';

    const leftMeta = document.createElement('div');
    leftMeta.className = 'card-left-meta';

    if (state.workspace === WORKSPACES.ENTERPRISE && n.docFolio) {
      const folio = document.createElement('span');
      folio.className = 'badge-folio';
      folio.textContent = n.docFolio;
      leftMeta.appendChild(folio);
    }

    if (state.workspace === WORKSPACES.ENTERPRISE && n.taskStatus) {
      const statusBadge = document.createElement('span');
      statusBadge.className = `badge-status ${n.taskStatus}`;
      statusBadge.textContent = n.taskStatus.toUpperCase();
      leftMeta.appendChild(statusBadge);
    }

    if (n.pinned) {
      const pin = document.createElement('span');
      pin.className = 'pin-indicator';
      pin.textContent = '📌 Fijada';
      leftMeta.appendChild(pin);
    }

    header.appendChild(leftMeta);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'note-card-actions';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'card-action-btn';
    prevBtn.title = 'Vista previa rápida';
    prevBtn.textContent = '👁️';
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuickPreview(n);
    });

    const speakBtn = document.createElement('button');
    speakBtn.className = 'card-action-btn';
    speakBtn.title = 'Escuchar nota';
    speakBtn.textContent = '🔊';
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(n.text);
    });

    const pinBtn = document.createElement('button');
    pinBtn.className = 'card-action-btn';
    pinBtn.title = n.pinned ? 'Desfijar' : 'Fijar arriba';
    pinBtn.textContent = n.pinned ? '📌' : '📍';
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePinNote(n.id);
    });

    const trashBtn = document.createElement('button');
    trashBtn.className = 'card-action-btn card-trash-btn';
    trashBtn.title = 'Enviar a papelera';
    trashBtn.textContent = '🗑️';
    trashBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trashNote(n.id);
    });

    actions.appendChild(prevBtn);
    actions.appendChild(speakBtn);
    actions.appendChild(pinBtn);
    actions.appendChild(trashBtn);
    header.appendChild(actions);

    card.appendChild(header);

    // Note snippet
    const snippet = document.createElement('div');
    snippet.className = 'note-snippet';
    snippet.textContent = n.text;
    card.appendChild(snippet);

    // Enterprise details meta bar
    if (state.workspace === WORKSPACES.ENTERPRISE && (n.taskAssignee || n.taskDueDate || n.docAttendees)) {
      const entMeta = document.createElement('div');
      entMeta.className = 'card-enterprise-meta';
      if (n.taskAssignee) entMeta.innerHTML += `<span>👤 ${n.taskAssignee}</span>`;
      if (n.taskDueDate) entMeta.innerHTML += `<span>📅 ${n.taskDueDate}</span>`;
      if (n.docAttendees) entMeta.innerHTML += `<span>👥 Asistentes</span>`;
      card.appendChild(entMeta);
    }

    // Tags
    if (n.tags && n.tags.length > 0) {
      const tagCont = document.createElement('div');
      tagCont.className = 'note-tags';
      n.tags.forEach(t => {
        const sp = document.createElement('span');
        sp.className = 'tag';
        sp.textContent = `#${t}`;
        tagCont.appendChild(sp);
      });
      card.appendChild(tagCont);
    }

    // Date
    if (n.createdAt) {
      const dateEl = document.createElement('div');
      dateEl.className = 'note-date';
      const d = new Date(n.createdAt);
      dateEl.textContent = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      card.appendChild(dateEl);
    }

    // Click to open in editor
    card.addEventListener('click', () => loadNoteIntoEditor(n));
    el.notesList.appendChild(card);
  });
}

// ==========================================================================
// TAG FILTERS & ENTERPRISE STATUS PILLS
// ==========================================================================
export function renderTagFilters() {
  if (!el.tagFilterRow) return;
  el.tagFilterRow.innerHTML = '';
  const allTags = new Set();
  state.notes.forEach(n => (n.tags || []).forEach(t => allTags.add(t)));

  if (allTags.size === 0) return;

  const allChip = document.createElement('button');
  allChip.className = 'tag-chip' + (!state.tagFilter ? ' active' : '');
  allChip.textContent = 'Todas las etiquetas';
  allChip.addEventListener('click', () => {
    state.tagFilter = null;
    renderTagFilters();
    renderNotesList();
  });
  el.tagFilterRow.appendChild(allChip);

  allTags.forEach(t => {
    const chip = document.createElement('button');
    chip.className = 'tag-chip' + (state.tagFilter === t ? ' active' : '');
    chip.textContent = `#${t}`;
    chip.addEventListener('click', () => {
      state.tagFilter = state.tagFilter === t ? null : t;
      renderTagFilters();
      renderNotesList();
    });
    el.tagFilterRow.appendChild(chip);
  });
}

// ==========================================================================
// VISTA PREVIA RÁPIDA (QUICK PREVIEW MODAL)
// ==========================================================================
export function openQuickPreview(note) {
  currentPreviewNote = note;
  const isEnt = state.workspace === WORKSPACES.ENTERPRISE;

  if (el.quickPreviewBadges) {
    el.quickPreviewBadges.innerHTML = '';
    if (isEnt && note.docFolio) {
      const b = document.createElement('span');
      b.className = 'badge-folio';
      b.textContent = note.docFolio;
      el.quickPreviewBadges.appendChild(b);
    }
    if (isEnt && note.taskStatus) {
      const b = document.createElement('span');
      b.className = `badge-status ${note.taskStatus}`;
      b.textContent = note.taskStatus.toUpperCase();
      el.quickPreviewBadges.appendChild(b);
    }
  }

  const lines = note.text.split('\n').filter(Boolean);
  if (el.quickPreviewTitle) el.quickPreviewTitle.textContent = lines[0] || 'Nota';
  if (el.quickPreviewMeta) {
    el.quickPreviewMeta.textContent = `Creada el ${new Date(note.createdAt).toLocaleString('es-ES')} • ${note.text.length} caracteres`;
  }
  if (el.quickPreviewContent) el.quickPreviewContent.textContent = note.text;

  if (el.quickPreviewTags) {
    el.quickPreviewTags.innerHTML = '';
    (note.tags || []).forEach(t => {
      const sp = document.createElement('span');
      sp.className = 'tag';
      sp.textContent = `#${t}`;
      el.quickPreviewTags.appendChild(sp);
    });
  }

  if (el.quickPreviewOverlay) el.quickPreviewOverlay.classList.add('open');
}

// ==========================================================================
// APLICACIÓN DE PLANTILLAS INSTITUCIONALES
// ==========================================================================
export function applyInstitutionalTemplate(tplKey) {
  const tpl = INSTITUTIONAL_TEMPLATES[tplKey];
  if (!tpl) return;

  const currentText = el.editor ? el.editor.value.trim() : '';

  if (!currentText) {
    insertTemplateDirectly(tpl);
    return;
  }

  pendingTemplate = tpl;
  if (el.templateConfirmOverlay) el.templateConfirmOverlay.classList.add('open');
}

function insertTemplateDirectly(tpl, append = false) {
  if (append && el.editor) {
    el.editor.value = el.editor.value + '\n\n' + tpl.content;
  } else if (el.editor) {
    el.editor.value = tpl.content;
  }

  if (el.docTypeSelect) el.docTypeSelect.value = tpl.type;
  if (el.taskPrioritySelect) el.taskPrioritySelect.value = tpl.priority;
  if (el.docFolioInput && !el.docFolioInput.value) {
    el.docFolioInput.value = generateAutoFolio();
  }

  if (el.metaDrawerBody && !state.metaDrawerOpen) {
    state.metaDrawerOpen = true;
    el.metaDrawerBody.style.display = 'block';
  }

  // Switch to editor on mobile
  if (window.innerWidth <= 820 && el.tabEditorBtn) {
    el.tabEditorBtn.click();
  }
  if (el.editor) el.editor.focus();
  saveDraft();
  setStatus(`Plantilla "${tpl.title}" cargada en el editor ✓`);
}

// ==========================================================================
// INICIALIZACIÓN DE LISTENERS DE NOTAS Y EDITOR
// ==========================================================================
export function initNotesListeners() {
  if (el.saveBtn) el.saveBtn.addEventListener('click', saveCurrentNote);

  if (el.clearBtn) {
    el.clearBtn.addEventListener('click', async () => {
      if (el.editor && el.editor.value.trim()) {
        const ok = await askConfirm('¿Limpiar editor?', 'Se descartará el texto no guardado actualmente en el editor.');
        if (!ok) return;
      }
      state.currentNoteId = null;
      resetEditorForm();
      if (state.activeFolderId) {
        localStorage.removeItem(getDraftKey(state.activeFolderId));
      }
      renderNotesList();
      if (el.editor) el.editor.focus();
      setStatus('Editor listo para un nuevo documento');
    });
  }

  if (el.editor) {
    el.editor.addEventListener('input', () => {
      if (state.autoSave && !state.currentNoteId) {
        saveDraft();
      }
    });
  }

  if (el.genFolioBtn) {
    el.genFolioBtn.addEventListener('click', () => {
      const folio = generateAutoFolio();
      if (el.docFolioInput) el.docFolioInput.value = folio;
      if (el.currentFolioBadge) el.currentFolioBadge.textContent = `Folio: ${folio}`;
      setStatus(`Folio ${folio} generado`);
    });
  }

  if (el.metaDrawerToggleBtn && el.metaDrawerBody) {
    el.metaDrawerToggleBtn.addEventListener('click', () => {
      state.metaDrawerOpen = !state.metaDrawerOpen;
      el.metaDrawerBody.style.display = state.metaDrawerOpen ? 'block' : 'none';
      if (el.metaDrawerToggleBtn.querySelector('.drawer-icon')) {
        el.metaDrawerToggleBtn.querySelector('.drawer-icon').textContent = state.metaDrawerOpen ? '▼' : '▶';
      }
    });
  }

  // Templates
  if (el.templatesBar) {
    el.templatesBar.querySelectorAll('.template-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tplKey = chip.dataset.tpl;
        applyInstitutionalTemplate(tplKey);
      });
    });
  }

  // Template confirm modal
  if (el.templateCancelBtn) {
    el.templateCancelBtn.addEventListener('click', () => {
      if (el.templateConfirmOverlay) el.templateConfirmOverlay.classList.remove('open');
      pendingTemplate = null;
    });
  }
  if (el.templateAppendBtn) {
    el.templateAppendBtn.addEventListener('click', () => {
      if (pendingTemplate) insertTemplateDirectly(pendingTemplate, true);
      if (el.templateConfirmOverlay) el.templateConfirmOverlay.classList.remove('open');
      pendingTemplate = null;
    });
  }
  if (el.templateReplaceBtn) {
    el.templateReplaceBtn.addEventListener('click', () => {
      if (pendingTemplate) insertTemplateDirectly(pendingTemplate, false);
      if (el.templateConfirmOverlay) el.templateConfirmOverlay.classList.remove('open');
      pendingTemplate = null;
    });
  }

  // Status pills
  if (el.statusFilterPills) {
    el.statusFilterPills.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        el.statusFilterPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.statusFilter = btn.dataset.filter;
        renderNotesList();
      });
    });
  }

  // Sort & Search
  if (el.sortSelect) {
    el.sortSelect.addEventListener('change', () => {
      state.sortMode = el.sortSelect.value;
      renderNotesList();
    });
  }

  if (el.searchInput) {
    el.searchInput.addEventListener('input', () => {
      state.searchQuery = el.searchInput.value.trim();
      if (el.searchClearBtn) el.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
      renderNotesList();
    });
  }

  if (el.searchClearBtn) {
    el.searchClearBtn.addEventListener('click', () => {
      if (el.searchInput) el.searchInput.value = '';
      state.searchQuery = '';
      el.searchClearBtn.style.display = 'none';
      renderNotesList();
    });
  }

  if (el.searchGlobalCheckbox) {
    el.searchGlobalCheckbox.addEventListener('change', () => {
      state.searchGlobal = el.searchGlobalCheckbox.checked;
      renderNotesList();
    });
  }

  // View modes
  if (el.viewModeDetailedBtn && el.viewModeCompactBtn) {
    el.viewModeDetailedBtn.addEventListener('click', () => {
      state.viewMode = 'detailed';
      el.viewModeDetailedBtn.classList.add('active');
      el.viewModeCompactBtn.classList.remove('active');
      if (el.notesList) el.notesList.classList.remove('compact-view');
    });
    el.viewModeCompactBtn.addEventListener('click', () => {
      state.viewMode = 'compact';
      el.viewModeCompactBtn.classList.add('active');
      el.viewModeDetailedBtn.classList.remove('active');
      if (el.notesList) el.notesList.classList.add('compact-view');
    });
  }

  // Quick preview modal listeners
  if (el.quickPreviewCloseX) {
    el.quickPreviewCloseX.addEventListener('click', () => el.quickPreviewOverlay.classList.remove('open'));
  }
  if (el.quickPreviewCloseBtn) {
    el.quickPreviewCloseBtn.addEventListener('click', () => el.quickPreviewOverlay.classList.remove('open'));
  }
  if (el.quickPreviewCopyBtn) {
    el.quickPreviewCopyBtn.addEventListener('click', () => {
      if (!currentPreviewNote) return;
      navigator.clipboard.writeText(currentPreviewNote.text).then(() => setStatus('Texto copiado ✓'));
    });
  }
  if (el.quickPreviewEditBtn) {
    el.quickPreviewEditBtn.addEventListener('click', () => {
      if (!currentPreviewNote) return;
      if (el.quickPreviewOverlay) el.quickPreviewOverlay.classList.remove('open');
      loadNoteIntoEditor(currentPreviewNote);
    });
  }
  if (el.quickPreviewSpeakBtn) {
    el.quickPreviewSpeakBtn.addEventListener('click', () => {
      if (!currentPreviewNote) return;
      if (el.quickPreviewOverlay) el.quickPreviewOverlay.classList.remove('open');
      speakText(currentPreviewNote.text);
    });
  }
}
