import { state, setStatus, uid } from './state.js';
import { DEFAULT_LETTERHEAD, DEFAULT_TEAM_MEMBERS, WORKSPACES } from './constants.js';
import { el } from './dom.js';

// ==========================================================================
// CONFIGURACIÓN DE MEMBRETE & EQUIPO
// ==========================================================================
export function loadLetterheadConfig() {
  try {
    const raw = localStorage.getItem('letterhead_config');
    state.letterhead = raw ? { ...DEFAULT_LETTERHEAD, ...JSON.parse(raw) } : { ...DEFAULT_LETTERHEAD };
  } catch (e) {
    state.letterhead = { ...DEFAULT_LETTERHEAD };
  }
}

export function saveLetterheadConfig() {
  localStorage.setItem('letterhead_config', JSON.stringify(state.letterhead));
}

export function loadTeamMembers() {
  try {
    const raw = localStorage.getItem('team_members');
    state.teamMembers = raw ? JSON.parse(raw) : [...DEFAULT_TEAM_MEMBERS];
  } catch (e) {
    state.teamMembers = [...DEFAULT_TEAM_MEMBERS];
  }
  updateTeamAssigneeOptions();
}

export function saveTeamMembers() {
  localStorage.setItem('team_members', JSON.stringify(state.teamMembers));
  updateTeamAssigneeOptions();
  renderTeamMembersList();
}

export function updateTeamAssigneeOptions() {
  if (!el.taskAssigneeSelect) return;
  const currentVal = el.taskAssigneeSelect.value;
  el.taskAssigneeSelect.innerHTML = '<option value="">-- Sin asignar --</option>';
  state.teamMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    opt.textContent = `${m.name} (${m.role})`;
    el.taskAssigneeSelect.appendChild(opt);
  });
  el.taskAssigneeSelect.value = currentVal;
}

export function getFolioPrefix(folderName) {
  const clean = (folderName || '').trim().toUpperCase();
  if (clean.includes('DIRECCIÓN')) return 'DIR';
  if (clean.includes('OPERACION')) return 'OPE';
  if (clean.includes('RECURSOS') || clean.includes('RRHH')) return 'RRHH';
  if (clean.includes('LEGAL')) return 'LEG';
  if (clean.includes('FINANZ')) return 'FIN';
  if (clean.includes('TECNOLOG') || clean.includes('TI')) return 'TI';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
  return clean.slice(0, 3).toUpperCase() || 'DOC';
}

export function generateAutoFolio() {
  const folder = state.folders.find(f => f.id === state.activeFolderId);
  const prefix = getFolioPrefix(folder ? folder.name : 'DOC');
  const year = new Date().getFullYear();
  let count = parseInt(localStorage.getItem('folio_counter') || '101', 10);
  count += 1;
  localStorage.setItem('folio_counter', count.toString());
  return `${prefix}-${year}-${String(count).slice(-3)}`;
}

// ==========================================================================
// VISTA FORMAL CON MEMBRETE CORPORATIVO & IMPRESIÓN / PDF
// ==========================================================================
export function openFormalPrintModal(note = null) {
  const data = note || {
    text: el.editor ? el.editor.value.trim() : '',
    docType: el.docTypeSelect ? el.docTypeSelect.value : 'general',
    docFolio: el.docFolioInput ? (el.docFolioInput.value || generateAutoFolio()) : 'DIR-2026-001',
    taskAssignee: el.taskAssigneeSelect ? el.taskAssigneeSelect.value : 'Responsable Asignado',
    taskDueDate: el.taskDueDate ? el.taskDueDate.value : '',
    taskPriority: el.taskPrioritySelect ? el.taskPrioritySelect.value : 'normal',
    taskStatus: el.taskStatusSelect ? el.taskStatusSelect.value : 'pendiente',
    docAttendees: el.docAttendeesInput ? el.docAttendeesInput.value : '',
    createdAt: Date.now()
  };

  if (!data.text) {
    setStatus('Escribe o carga un documento para generar la vista con membrete.', true);
    return;
  }

  const folder = state.folders.find(f => f.id === state.activeFolderId);
  const deptName = folder ? folder.name : state.letterhead.orgDept;

  // Poblar elementos del membrete
  if (el.sheetOrgLogo) el.sheetOrgLogo.src = state.letterhead.orgLogo || './app_icon.jpg';
  if (el.sheetOrgName) el.sheetOrgName.textContent = state.letterhead.orgName;
  if (el.sheetOrgDept) el.sheetOrgDept.textContent = deptName;
  if (el.sheetOrgSub) el.sheetOrgSub.textContent = state.letterhead.orgSub;

  if (el.sheetFolio) el.sheetFolio.textContent = data.docFolio || 'FOL-001';
  if (el.sheetDate) {
    el.sheetDate.textContent = new Date(data.createdAt || Date.now()).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  const docTypeLabels = {
    general: 'Nota General',
    minuta: 'Minuta de Reunión Ejecutiva',
    incidencia: 'Reporte de Incidencia en Terreno',
    acta: 'Acta de Acuerdos y Resoluciones',
    turno: 'Bitácora de Turno y Relevo',
    inspeccion: 'Pauta de Inspección Técnica'
  };
  if (el.sheetDocType) el.sheetDocType.textContent = docTypeLabels[data.docType] || 'Documento Institucional';
  if (el.sheetDepartment) el.sheetDepartment.textContent = deptName;
  if (el.sheetAssignee) el.sheetAssignee.textContent = data.taskAssignee || 'Sin asignar';
  if (el.sheetDeadline) el.sheetDeadline.textContent = data.taskDueDate || 'Sin plazo fijado';
  if (el.sheetPriority) el.sheetPriority.textContent = (data.taskPriority || 'Normal').toUpperCase();

  const statusLabels = {
    pendiente: 'Pendiente de ejecución',
    en_progreso: 'En Progreso',
    completado: 'Completado y validado',
    archivado: 'Archivado'
  };
  if (el.sheetStatus) el.sheetStatus.textContent = statusLabels[data.taskStatus] || 'Registrado';

  if (data.docAttendees && el.sheetAttendeesRow) {
    el.sheetAttendeesRow.style.display = 'flex';
    if (el.sheetAttendees) el.sheetAttendees.textContent = data.docAttendees;
  } else if (el.sheetAttendeesRow) {
    el.sheetAttendeesRow.style.display = 'none';
  }

  // Título y cuerpo del documento
  const lines = data.text.split('\n').filter(Boolean);
  const firstLine = lines[0] || 'Documento Oficial';
  if (el.sheetDocTitle) el.sheetDocTitle.textContent = firstLine;
  if (el.sheetDocBody) el.sheetDocBody.textContent = data.text;

  // Firmas
  if (el.sheetSigAuthorName) el.sheetSigAuthorName.textContent = data.taskAssignee || 'Responsable de Turno';
  if (el.sheetSigAuthorTitle) el.sheetSigAuthorTitle.textContent = state.letterhead.sigAuthor || 'Elaborado por';
  if (el.sheetSigReviewerName) {
    el.sheetSigReviewerName.textContent = state.teamMembers.length > 0 ? state.teamMembers[0].name : 'Dirección General';
  }
  if (el.sheetSigReviewerTitle) el.sheetSigReviewerTitle.textContent = state.letterhead.sigReviewer || 'Revisado y Aprobado';
  if (el.sheetFooterLegal) el.sheetFooterLegal.textContent = state.letterhead.footerLegal;

  if (el.formalPrintOverlay) el.formalPrintOverlay.classList.add('open');
}

export function openLetterheadConfigModal() {
  if (!el.letterheadOverlay) return;
  if (el.cfgOrgName) el.cfgOrgName.value = state.letterhead.orgName || '';
  if (el.cfgOrgDept) el.cfgOrgDept.value = state.letterhead.orgDept || '';
  if (el.cfgOrgSub) el.cfgOrgSub.value = state.letterhead.orgSub || '';
  if (el.cfgOrgLogo) el.cfgOrgLogo.value = state.letterhead.orgLogo || '';
  if (el.cfgSigAuthor) el.cfgSigAuthor.value = state.letterhead.sigAuthor || '';
  if (el.cfgSigReviewer) el.cfgSigReviewer.value = state.letterhead.sigReviewer || '';
  if (el.cfgFooterLegal) el.cfgFooterLegal.value = state.letterhead.footerLegal || '';
  el.letterheadOverlay.classList.add('open');
}

export function renderTeamMembersList() {
  if (!el.teamList) return;
  el.teamList.innerHTML = '';
  if (el.teamMemberCount) el.teamMemberCount.textContent = state.teamMembers.length.toString();

  if (state.teamMembers.length === 0) {
    el.teamList.innerHTML = '<div class="empty-state" style="padding:12px;"><p>No hay integrantes registrados.</p></div>';
    return;
  }

  state.teamMembers.forEach(m => {
    const item = document.createElement('div');
    item.className = 'team-member-item';

    const info = document.createElement('div');
    info.className = 'member-info';

    const name = document.createElement('span');
    name.className = 'member-name';
    name.textContent = m.name;

    const role = document.createElement('span');
    role.className = 'member-role-badge';
    role.textContent = m.role;

    const dept = document.createElement('span');
    dept.className = 'member-dept-badge';
    dept.textContent = m.dept ? `• ${m.dept}` : '';

    info.appendChild(name);
    info.appendChild(role);
    if (m.dept) info.appendChild(dept);

    const delBtn = document.createElement('button');
    delBtn.className = 'member-del-btn';
    delBtn.type = 'button';
    delBtn.title = 'Eliminar integrante';
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => deleteTeamMember(m.id));

    item.appendChild(info);
    item.appendChild(delBtn);
    el.teamList.appendChild(item);
  });
}

export function deleteTeamMember(id) {
  state.teamMembers = state.teamMembers.filter(m => m.id !== id);
  saveTeamMembers();
  setStatus('Integrante eliminado');
}

export function openTeamModal() {
  renderTeamMembersList();
  if (el.teamOverlay) el.teamOverlay.classList.add('open');
}

export function initPrintAndTeamListeners(callbacks = {}) {
  if (el.formalPrintBtn) el.formalPrintBtn.addEventListener('click', () => openFormalPrintModal());
  if (el.quickPrintBtn) el.quickPrintBtn.addEventListener('click', () => openFormalPrintModal());
  if (el.formalPrintOptionRow) {
    el.formalPrintOptionRow.addEventListener('click', () => {
      if (el.editorOptionsMenu) el.editorOptionsMenu.classList.remove('open');
      openFormalPrintModal();
    });
  }
  if (el.planOpenLetterheadBtn) {
    el.planOpenLetterheadBtn.addEventListener('click', () => openFormalPrintModal());
  }
  if (el.planManageTeamBtn) {
    el.planManageTeamBtn.addEventListener('click', openTeamModal);
  }
  if (el.manageTeamBtn) {
    el.manageTeamBtn.addEventListener('click', openTeamModal);
  }
  if (el.letterheadConfigBtn) {
    el.letterheadConfigBtn.addEventListener('click', openLetterheadConfigModal);
  }

  if (el.formalPrintCloseX) {
    el.formalPrintCloseX.addEventListener('click', () => el.formalPrintOverlay.classList.remove('open'));
  }
  if (el.formalPrintCloseBtn) {
    el.formalPrintCloseBtn.addEventListener('click', () => el.formalPrintOverlay.classList.remove('open'));
  }

  if (el.doPrintBtn) {
    el.doPrintBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (el.copyFormalTextBtn) {
    el.copyFormalTextBtn.addEventListener('click', () => {
      const header = `========================================================================\n` +
        `${state.letterhead.orgName}\n` +
        `${el.sheetDepartment.textContent} | Folio: ${el.sheetFolio.textContent} | Fecha: ${el.sheetDate.textContent}\n` +
        `========================================================================\n` +
        `Tipo: ${el.sheetDocType.textContent} | Responsable: ${el.sheetAssignee.textContent} | Prioridad: ${el.sheetPriority.textContent}\n\n` +
        `${el.sheetDocBody.textContent}\n\n` +
        `------------------------------------------------------------------------\n` +
        `Elaborado por: ${el.sheetSigAuthorName.textContent} (${el.sheetSigAuthorTitle.textContent})\n` +
        `Aprobado por: ${el.sheetSigReviewerName.textContent} (${el.sheetSigReviewerTitle.textContent})\n` +
        `========================================================================`;
      navigator.clipboard.writeText(header).then(() => setStatus('Documento formal copiado al portapapeles ✓'));
    });
  }

  if (el.editLetterheadFromPreviewBtn) {
    el.editLetterheadFromPreviewBtn.addEventListener('click', () => {
      if (el.formalPrintOverlay) el.formalPrintOverlay.classList.remove('open');
      openLetterheadConfigModal();
    });
  }

  if (el.letterheadCloseX) {
    el.letterheadCloseX.addEventListener('click', () => el.letterheadOverlay.classList.remove('open'));
  }
  if (el.letterheadCancelBtn) {
    el.letterheadCancelBtn.addEventListener('click', () => el.letterheadOverlay.classList.remove('open'));
  }

  if (el.letterheadForm) {
    el.letterheadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.letterhead.orgName = el.cfgOrgName.value.trim() || DEFAULT_LETTERHEAD.orgName;
      state.letterhead.orgDept = el.cfgOrgDept.value.trim() || DEFAULT_LETTERHEAD.orgDept;
      state.letterhead.orgSub = el.cfgOrgSub.value.trim() || DEFAULT_LETTERHEAD.orgSub;
      state.letterhead.orgLogo = el.cfgOrgLogo.value.trim() || DEFAULT_LETTERHEAD.orgLogo;
      state.letterhead.sigAuthor = el.cfgSigAuthor.value.trim() || DEFAULT_LETTERHEAD.sigAuthor;
      state.letterhead.sigReviewer = el.cfgSigReviewer.value.trim() || DEFAULT_LETTERHEAD.sigReviewer;
      state.letterhead.footerLegal = el.cfgFooterLegal.value.trim() || DEFAULT_LETTERHEAD.footerLegal;

      saveLetterheadConfig();
      if (el.letterheadOverlay) el.letterheadOverlay.classList.remove('open');
      setStatus('Membrete institucional actualizado ✓');
    });
  }

  if (el.cfgLogoFile) {
    el.cfgLogoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        el.cfgOrgLogo.value = event.target.result;
        setStatus('Logotipo cargado');
      };
      reader.readAsDataURL(file);
    });
  }

  if (el.teamCloseX) el.teamCloseX.addEventListener('click', () => el.teamOverlay.classList.remove('open'));
  if (el.teamCloseBtn) el.teamCloseBtn.addEventListener('click', () => el.teamOverlay.classList.remove('open'));

  if (el.addMemberForm) {
    el.addMemberForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = el.memberFullName.value.trim();
      const role = el.memberRole.value.trim();
      const dept = el.memberDept.value.trim();
      if (!name || !role) return;

      state.teamMembers.push({
        id: uid(),
        name,
        role,
        dept
      });

      saveTeamMembers();
      el.memberFullName.value = '';
      el.memberRole.value = '';
      el.memberDept.value = '';
      setStatus(`Integrante ${name} agregado ✓`);
    });
  }
}
