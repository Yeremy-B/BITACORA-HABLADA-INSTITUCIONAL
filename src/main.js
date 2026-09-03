/**
 * BH Enterprise - Bitácora Hablada & Gestión Documental
 * Módulo Principal / Entry Point
 */
import { state, initModalListeners, setStatus } from './state.js';
import { WORKSPACES } from './constants.js';
import { el } from './dom.js';
import { setupAuthHandlers } from './auth.js';
import { 
  loadFolders, 
  renderFolders, 
  selectFolder, 
  switchWorkspace, 
  updateWorkspaceUI, 
  initFolderListeners 
} from './folders.js';
import { 
  loadNotes, 
  persistNotes, 
  loadDraft, 
  renderNotesList, 
  renderTagFilters, 
  initNotesListeners 
} from './notes.js';
import { 
  loadLetterheadConfig, 
  loadTeamMembers, 
  openFormalPrintModal, 
  openTeamModal, 
  initPrintAndTeamListeners 
} from './print.js';
import { 
  updateTrashBadge, 
  initTrashListeners 
} from './trash.js';
import { 
  initBackupListeners 
} from './backup.js';
import { 
  initSpeechRecognition, 
  initSpeechSynthesis 
} from './speech.js';

// ==========================================================================
// MODO CLARO / OSCURO (THEME)
// ==========================================================================
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    if (el.themeIcon) el.themeIcon.textContent = '☀️';
    if (el.themeText) el.themeText.textContent = 'Modo claro';
  } else {
    document.body.classList.remove('dark-mode');
    if (el.themeIcon) el.themeIcon.textContent = '🌙';
    if (el.themeText) el.themeText.textContent = 'Modo oscuro';
  }

  if (el.themeToggleBtn) {
    el.themeToggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (el.themeIcon) el.themeIcon.textContent = isDark ? '☀️' : '🌙';
      if (el.themeText) el.themeText.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    });
  }
}

// ==========================================================================
// NAVEGACIÓN Y VISTAS DE PESTAÑAS (ESCRIBIR, PLANIFICACIÓN, NOTAS)
// ==========================================================================
export function setActiveTab(tabName) {
  const isMobile = window.innerWidth <= 860;

  if (el.tabEditorBtn) el.tabEditorBtn.classList.toggle('active', tabName === 'editor');
  if (el.tabPlanBtn) el.tabPlanBtn.classList.toggle('active', tabName === 'plan');
  if (el.tabNotesBtn) el.tabNotesBtn.classList.toggle('active', tabName === 'notes');

  if (tabName === 'editor') {
    if (el.editorPane) {
      el.editorPane.style.display = 'flex';
      el.editorPane.classList.remove('hidden-mobile');
    }
    if (el.planPane) {
      el.planPane.style.display = 'none';
      el.planPane.classList.add('hidden-mobile');
    }
    if (el.notesPane) {
      if (isMobile) {
        el.notesPane.classList.add('hidden-mobile');
      } else {
        el.notesPane.style.display = 'flex';
        el.notesPane.classList.remove('hidden-mobile');
      }
    }
  } else if (tabName === 'plan') {
    if (el.editorPane) {
      el.editorPane.style.display = 'none';
      el.editorPane.classList.add('hidden-mobile');
    }
    if (el.planPane) {
      el.planPane.style.display = 'flex';
      el.planPane.classList.remove('hidden-mobile');
    }
    if (el.notesPane) {
      if (isMobile) {
        el.notesPane.classList.add('hidden-mobile');
      } else {
        el.notesPane.style.display = 'flex';
        el.notesPane.classList.remove('hidden-mobile');
      }
    }
  } else if (tabName === 'notes') {
    if (el.editorPane) {
      if (isMobile) {
        el.editorPane.style.display = 'none';
        el.editorPane.classList.add('hidden-mobile');
      } else {
        el.editorPane.style.display = 'flex';
        el.editorPane.classList.remove('hidden-mobile');
      }
    }
    if (el.planPane) {
      el.planPane.style.display = 'none';
      el.planPane.classList.add('hidden-mobile');
    }
    if (el.notesPane) {
      el.notesPane.style.display = 'flex';
      el.notesPane.classList.remove('hidden-mobile');
    }
  }
}

function initNavigationListeners() {
  if (el.tabEditorBtn) {
    el.tabEditorBtn.addEventListener('click', () => setActiveTab('editor'));
  }
  if (el.tabPlanBtn) {
    el.tabPlanBtn.addEventListener('click', () => setActiveTab('plan'));
  }
  if (el.tabNotesBtn) {
    el.tabNotesBtn.addEventListener('click', () => setActiveTab('notes'));
  }

  if (el.mobileNewNoteBtn) {
    el.mobileNewNoteBtn.addEventListener('click', () => {
      setActiveTab('editor');
      if (el.editor) el.editor.focus();
    });
  }

  // Plan pane quick actions
  if (el.goToEditorBtn) {
    el.goToEditorBtn.addEventListener('click', () => {
      setActiveTab('editor');
      if (el.editor) el.editor.focus();
    });
  }
  if (el.planSaveReportBtn && el.saveBtn) {
    el.planSaveReportBtn.addEventListener('click', () => el.saveBtn.click());
  }

  // Window resize handler for mobile responsiveness
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 860;
    if (!isMobile) {
      if (el.tabPlanBtn && el.tabPlanBtn.classList.contains('active')) {
        if (el.planPane) el.planPane.style.display = 'flex';
        if (el.editorPane) el.editorPane.style.display = 'none';
      } else {
        if (el.editorPane) el.editorPane.style.display = 'flex';
        if (el.planPane) el.planPane.style.display = 'none';
      }
      if (el.notesPane) el.notesPane.style.display = 'flex';
    }
  });

  // Editor Options Menu
  if (el.editorOptionsBtn && el.editorOptionsMenu) {
    el.editorOptionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.editorOptionsMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => el.editorOptionsMenu.classList.remove('open'));
    el.editorOptionsMenu.addEventListener('click', (e) => e.stopPropagation());
  }

  if (el.autoSaveCheckbox) {
    el.autoSaveCheckbox.addEventListener('change', () => {
      state.autoSave = el.autoSaveCheckbox.checked;
      if (el.autoSaveStatusLabel) {
        el.autoSaveStatusLabel.textContent = state.autoSave ? 'Activado (guarda al escribir)' : 'Desactivado (guardado manual)';
      }
      setStatus(state.autoSave ? 'Guardado automático activado' : 'Guardado automático desactivado');
    });
  }

  // Settings Modal
  if (el.settingsBtn) {
    el.settingsBtn.addEventListener('click', () => {
      if (el.settingsOverlay) el.settingsOverlay.classList.add('open');
    });
  }
  if (el.settingsCloseX) {
    el.settingsCloseX.addEventListener('click', () => {
      if (el.settingsOverlay) el.settingsOverlay.classList.remove('open');
    });
  }
  if (el.settingsCloseBtn) {
    el.settingsCloseBtn.addEventListener('click', () => {
      if (el.settingsOverlay) el.settingsOverlay.classList.remove('open');
    });
  }
  if (el.settingsOverlay) {
    el.settingsOverlay.addEventListener('click', (e) => {
      if (e.target === el.settingsOverlay) el.settingsOverlay.classList.remove('open');
    });
  }
}

// ==========================================================================
// INICIALIZACIÓN GLOBAL DE LA APLICACIÓN
// ==========================================================================
async function onFolderChanged(folderId) {
  state.currentNoteId = null;
  loadDraft(folderId);
  await loadNotes(folderId);
  renderNotesList();
  renderTagFilters();
}

async function initApp() {
  initTheme();
  initModalListeners();
  loadLetterheadConfig();
  loadTeamMembers();

  // Callbacks bundle for folder and note synchronization
  const folderCallbacks = {
    onFolderSelect: onFolderChanged
  };

  initFolderListeners(folderCallbacks);
  initNotesListeners();
  initPrintAndTeamListeners();
  initTrashListeners({
    onRestore: async (targetFolder, restoredItem) => {
      const notes = await loadNotes(targetFolder.id);
      delete restoredItem.deletedAt;
      delete restoredItem.folderName;
      restoredItem.isTrash = false;
      notes.unshift(restoredItem);
      await persistSingleNote(targetFolder.id, restoredItem);
      await persistNotes(targetFolder.id, notes);
      if (targetFolder.id === state.activeFolderId) {
        state.notes = notes;
        renderNotesList();
      }
    }
  });

  initBackupListeners(loadNotes, {
    onRestoreComplete: async () => {
      loadLetterheadConfig();
      loadTeamMembers();
      await loadFolders(folderCallbacks);
      renderFolders(folderCallbacks);
      await selectFolder(state.folders[0].id, folderCallbacks);
      updateTrashBadge();
    }
  });

  initSpeechRecognition((transcript) => {
    if (el.editor) {
      const cur = el.editor.value;
      const addSpace = cur.length > 0 && !/\s$/.test(cur) ? ' ' : '';
      el.editor.value = cur + addSpace + transcript.trim();
      el.editor.dispatchEvent(new Event('input'));
    }
  });
  initSpeechSynthesis();
  initNavigationListeners();

  // Setup Auth with callbacks
  setupAuthHandlers({
    onLogin: async (user, domainInfo) => {
      if (domainInfo.isInstitutional) {
        if (state.workspace !== WORKSPACES.ENTERPRISE) {
          await switchWorkspace(WORKSPACES.ENTERPRISE, folderCallbacks);
        }
        setStatus(`¡Bienvenido! Espacio Institucional (${domainInfo.orgName}) conectado ✓`);
      } else {
        if (state.workspace !== WORKSPACES.PERSONAL) {
          await switchWorkspace(WORKSPACES.PERSONAL, folderCallbacks);
        }
        setStatus(`¡Bienvenido ${user.displayName}! Cuenta personal conectada ✓`);
      }
      await loadNotes(state.activeFolderId);
      renderNotesList();
    },
    onAuthChange: async () => {
      await loadNotes(state.activeFolderId);
      renderNotesList();
    }
  });

  updateWorkspaceUI();
  await loadFolders(folderCallbacks);
  renderFolders(folderCallbacks);
  await selectFolder(state.activeFolderId, folderCallbacks);
  updateTrashBadge();
}

// Registro de Service Worker para capacidades PWA y caché offline
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.info('[PWA] SW registration:', err.message);
    });
  });
}

// Ejecutar al cargar el documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
