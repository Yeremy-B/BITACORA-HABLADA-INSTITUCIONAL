import { 
  auth, 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  analyzeEmailDomain,
  db 
} from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';

(function(){
  // ==========================================================================
  // CONFIGURACIÓN INICIAL & CONSTANTES
  // ==========================================================================
  const WORKSPACES = {
    PERSONAL: 'personal',
    ENTERPRISE: 'enterprise'
  };

  const DEFAULT_PERSONAL_FOLDERS = [
    { name: 'General', color: null },
    { name: 'Ideas', color: null },
    { name: 'Trabajo', color: null },
    { name: 'Personal', color: null },
    { name: 'Lecturas', color: null }
  ];

  const DEFAULT_ENTERPRISE_FOLDERS = [
    { name: 'Dirección General', code: 'DIR', color: '#1F5E5B' },
    { name: 'Operaciones & Terreno', code: 'OPE', color: '#C77A2B' },
    { name: 'Recursos Humanos', code: 'RRHH', color: '#5B7FBD' },
    { name: 'Legal & Cumplimiento', code: 'LEG', color: '#8A5FBD' },
    { name: 'Finanzas & Presupuesto', code: 'FIN', color: '#4FA98F' },
    { name: 'Tecnología e Innovación', code: 'TI', color: '#BD5F8A' }
  ];

  const DEFAULT_TEAM_MEMBERS = [
    { id: 'm1', name: 'Lic. Roberto Méndez', role: 'Director General', dept: 'Dirección General' },
    { id: 'm2', name: 'Ing. Valentina Soto', role: 'Jefa de Operaciones', dept: 'Operaciones & Terreno' },
    { id: 'm3', name: 'Dra. Camila Morales', role: 'Asesora Legal & Cumplimiento', dept: 'Legal & Cumplimiento' },
    { id: 'm4', name: 'Lic. Javier Silva', role: 'Especialista en RRHH', dept: 'Recursos Humanos' }
  ];

  const DEFAULT_LETTERHEAD = {
    orgName: 'INSTITUCIÓN / CORPORACIÓN OFICIAL',
    orgDept: 'Dirección General de Operaciones',
    orgSub: 'Sistema Institucional de Gestión y Control Documental',
    orgLogo: './app_icon.jpg',
    sigAuthor: 'Responsable de Emisión / Inspector',
    sigReviewer: 'Dirección General / Jefatura',
    footerLegal: 'Documento oficial generado por Bitácora Hablada Empresarial. Confidencial y de uso institucional.'
  };

  const INSTITUTIONAL_TEMPLATES = {
    minuta: {
      type: 'minuta',
      title: 'MINUTA DE REUNIÓN EJECUTIVA',
      priority: 'normal',
      content: `MINUTA DE REUNIÓN EJECUTIVA

1. OBJETIVO DE LA REUNIÓN:
Definir los lineamientos operativos y dar seguimiento a los compromisos del período.

2. ASISTENTES Y CONVOCADOS:
- Convocó: Dirección General
- Participantes: Equipo de Operaciones, Finanzas y Legal

3. PUNTOS TRATADOS:
- Revisión de indicadores clave de desempeño (KPIs).
- Estado de avance de los proyectos en terreno.
- Requerimientos presupuestarios extraordinarios.

4. ACUERDOS Y COMPROMISOS ALCANZADOS:
- [ ] Acuerdo 1: Validación del cronograma de trabajo para el próximo trimestre.
- [ ] Acuerdo 2: Envío de informe financiero consolidado antes del viernes.
- [ ] Acuerdo 3: Coordinación de inspección técnica en terreno.

5. PRÓXIMA REUNIÓN:
Fecha tentativa: Lunes de la próxima semana a las 09:30 hrs.`
    },
    incidencia: {
      type: 'incidencia',
      title: 'REPORTE DE INCIDENCIA / INSPECCIÓN',
      priority: 'alta',
      content: `REPORTE DE INCIDENCIA Y HALLAZGOS EN TERRENO

1. DATOS GENERALES:
- Sector / Área afectada: Operaciones / Faena Principal
- Nivel de Criticidad: Alta
- Fecha y Hora del evento: ${new Date().toLocaleDateString('es-ES')}

2. DESCRIPCIÓN DE LOS HECHOS:
Se detecta una desviación respecto al estándar operativo durante la ronda de supervisión programada.

3. CAUSA RAÍZ ESTIMADA:
Falla de calibración en equipo secundario y retraso en suministro de insumos críticos.

4. MEDIDAS CORRECTIVAS INMEDIATAS ADOPTADAS:
- Detención preventiva de la línea afectada.
- Notificación al personal de turno y aislamiento del sector.
- Activación de protocolo de contingencia N° 4.

5. ACCIONES PREVENTIVAS Y SEGUIMIENTO:
- Subsanar mantenimiento correctivo en un plazo máximo de 24 horas.
- Re-entrenamiento al operador a cargo.`
    },
    acta: {
      type: 'acta',
      title: 'ACTA FORMAL DE ACUERDOS Y RESOLUCIONES',
      priority: 'media',
      content: `ACTA DE SESIÓN Y RESOLUCIONES FORMALES

1. ANTECEDENTES Y QUÓRUM:
En dependencias institucionales se constituye la mesa de trabajo con el quórum reglamentario para sesionar.

2. TABLA DE PUNTOS A TRATAR:
1. Aprobación del acta anterior.
2. Propuesta de actualización reglamentaria.
3. Asignación de recursos y designación de comisiones.

3. DELIBERACIÓN:
Los miembros presentes analizan los antecedentes técnicos expuestos por la jefatura de área, valorando la factibilidad y cumplimiento normativo.

4. RESOLUCIONES VINCULANTES:
- RESOLUCIÓN 01: Se aprueba por unanimidad el plan de trabajo presentado.
- RESOLUCIÓN 02: Se encomienda a la unidad legal la redacción del convenio respectivo.

5. CIERRE DE SESIÓN:
Habiéndose cumplido el objeto de la convocatoria, se levanta la sesión en conformidad de todos los intervinientes.`
    },
    turno: {
      type: 'turno',
      title: 'BITÁCORA DE TURNO Y RELEVO OPERATIVO',
      priority: 'normal',
      content: `BITÁCORA DE TURNO Y RELEVO OPERATIVO

1. DATOS DEL SERVICIO:
- Turno: Diurno (08:00 - 18:00 hrs)
- Supervisor a cargo: Responsable de Operaciones
- Dotación de personal activa: 100% operativo

2. RESUMEN DE NOVEDADES OPERATIVAS:
- Inicio de jornada sin contratiempos.
- Verificación de inventario de herramientas y equipos críticos conforme.
- Cumplimiento de la pauta de tareas asignadas al 95%.

3. INCIDENCIAS O ANOMALÍAS REGISTRADAS:
- Variación temporal de suministro eléctrico a las 11:20 hrs (subsanada de inmediato).

4. TAREAS PENDIENTES PARA EL TURNO ENTRANTE:
- [ ] Recibir despacho de materiales programado para las 20:00 hrs.
- [ ] Monitorear lectura de sensores en sala técnica.
- [ ] Realizar cierre de bitácora nocturna.

5. CONFORMIDAD DE ENTREGA:
Se entrega el puesto en orden y en condiciones seguras de operatividad.`
    },
    inspeccion: {
      type: 'inspeccion',
      title: 'PAUTA DE INSPECCIÓN TÉCNICA EN TERRENO',
      priority: 'media',
      content: `PAUTA DE INSPECCIÓN TÉCNICA Y AUDITORÍA EN TERRENO

1. IDENTIFICACIÓN DE LA VISITA:
- Unidad / Instalación: Faena / Oficinas Centrales
- Motivo: Inspección periódica de control de calidad y seguridad
- Inspector responsable: Equipo de Fiscalización

2. CRITERIOS EVALUADOS:
[C = Conforme | NC = No Conforme | NA = No Aplica]
- [C] Elementos de Protección Personal (EPP) y protocolos de seguridad.
- [C] Señalética institucional y vías de evacuación despejadas.
- [NC] Registro de mantenimiento de extintores (plazo de recarga próximo a vencer).
- [C] Orden y limpieza en puestos de trabajo.

3. OBSERVACIONES Y NO CONFORMIDADES DETECTADAS:
Se requiere actualizar la bitácora física de inspecciones y reubicar kit de primeros auxilios.

4. CONCLUSIÓN Y PLAZO DE REGULARIZACIÓN:
Se fija un plazo de 72 horas para subsanar los puntos observados.`
    }
  };

  // ==========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================================================
  const state = {
    workspace: localStorage.getItem('current_workspace') || WORKSPACES.PERSONAL,
    folders: [],
    activeFolderId: null,
    notes: [],
    currentNoteId: null,
    speaking: false,
    voices: [],
    allVoices: [],
    recognizing: false,
    sortMode: 'recientes',
    viewMode: 'detailed',
    tagFilter: null,
    statusFilter: 'all',
    searchQuery: '',
    searchGlobal: false,
    autoSave: true,
    teamMembers: [],
    letterhead: { ...DEFAULT_LETTERHEAD },
    metaDrawerOpen: true,
    currentUser: null,
    isRegisterMode: false
  };

  const notesCache = {};

  // ==========================================================================
  // ELEMENTOS DOM
  // ==========================================================================
  const el = {
    // Workspaces & Sidebar
    wsPersonalBtn: document.getElementById('wsPersonalBtn'),
    wsEnterpriseBtn: document.getElementById('wsEnterpriseBtn'),
    foldersSectionLabel: document.getElementById('foldersSectionLabel'),
    sidebarWorkspaceBadge: document.getElementById('sidebarWorkspaceBadge'),
    topbarWorkspaceTag: document.getElementById('topbarWorkspaceTag'),
    manageTeamBtn: document.getElementById('manageTeamBtn'),
    letterheadConfigBtn: document.getElementById('letterheadConfigBtn'),
    quickPrintBtn: document.getElementById('quickPrintBtn'),
    folderList: document.getElementById('folderList'),
    newFolderInput: document.getElementById('newFolderInput'),
    addFolderBtn: document.getElementById('addFolderBtn'),
    folderTitle: document.getElementById('folderTitle'),
    folderEyebrow: document.getElementById('folderEyebrow'),
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
    trashBtn: document.getElementById('trashBtn'),
    trashCount: document.getElementById('trashCount'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFileInput: document.getElementById('importFileInput'),

    // Dedicated Plan Pane & Templates
    planPane: document.getElementById('planPane'),
    templatesBar: document.getElementById('templatesBar'),
    goToEditorBtn: document.getElementById('goToEditorBtn'),
    planOpenLetterheadBtn: document.getElementById('planOpenLetterheadBtn'),
    planSaveReportBtn: document.getElementById('planSaveReportBtn'),
    planManageTeamBtn: document.getElementById('planManageTeamBtn'),

    // Enterprise Metadata Drawer
    metaDrawer: document.getElementById('metaDrawer'),
    metaDrawerToggleBtn: document.getElementById('metaDrawerToggleBtn'),
    metaDrawerToggleText: document.getElementById('metaDrawerToggleText'),
    metaDrawerBody: document.getElementById('metaDrawerBody'),
    currentFolioBadge: document.getElementById('currentFolioBadge'),
    docTypeSelect: document.getElementById('docTypeSelect'),
    docFolioInput: document.getElementById('docFolioInput'),
    genFolioBtn: document.getElementById('genFolioBtn'),
    taskAssigneeSelect: document.getElementById('taskAssigneeSelect'),
    taskDueDate: document.getElementById('taskDueDate'),
    taskPrioritySelect: document.getElementById('taskPrioritySelect'),
    taskStatusSelect: document.getElementById('taskStatusSelect'),
    docAttendeesInput: document.getElementById('docAttendeesInput'),

    // Editor & Toolbar
    editor: document.getElementById('editor'),
    tagsInput: document.getElementById('tagsInput'),
    playBtn: document.getElementById('playBtn'),
    stopBtn: document.getElementById('stopBtn'),
    dictateBtn: document.getElementById('dictateBtn'),
    saveBtn: document.getElementById('saveBtn'),
    formalPrintBtn: document.getElementById('formalPrintBtn'),
    clearBtn: document.getElementById('clearBtn'),
    waveform: document.getElementById('waveform'),
    voiceSelect: document.getElementById('voiceSelect'),
    previewVoiceBtn: document.getElementById('previewVoiceBtn'),
    editorOptionsBtn: document.getElementById('editorOptionsBtn'),
    editorOptionsMenu: document.getElementById('editorOptionsMenu'),
    autoSaveCheckbox: document.getElementById('autoSaveCheckbox'),
    autoSaveStatusLabel: document.getElementById('autoSaveStatusLabel'),
    formalPrintOptionRow: document.getElementById('formalPrintOptionRow'),
    optionsMenuDivider: document.getElementById('optionsMenuDivider'),
    statusLine: document.getElementById('statusLine'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    themeText: document.getElementById('themeText'),

    // Notes Pane & Filters
    notesPaneTitle: document.getElementById('notesPaneTitle'),
    notesList: document.getElementById('notesList'),
    notesCount: document.getElementById('notesCount'),
    sortSelect: document.getElementById('sortSelect'),
    viewModeToggle: document.getElementById('viewModeToggle'),
    viewModeDetailedBtn: document.getElementById('viewModeDetailedBtn'),
    viewModeCompactBtn: document.getElementById('viewModeCompactBtn'),
    enterpriseFiltersRow: document.getElementById('enterpriseFiltersRow'),
    statusFilterPills: document.getElementById('statusFilterPills'),
    tagFilterRow: document.getElementById('tagFilterRow'),
    searchInput: document.getElementById('searchInput'),
    searchGlobalCheckbox: document.getElementById('searchGlobalCheckbox'),
    searchGlobalLabel: document.getElementById('searchGlobalLabel'),
    searchClearBtn: document.getElementById('searchClearBtn'),

    // Main / Mobile Navigation
    tabEditorBtn: document.getElementById('tabEditorBtn'),
    tabPlanBtn: document.getElementById('tabPlanBtn'),
    tabNotesBtn: document.getElementById('tabNotesBtn'),
    tabNotesLabel: document.getElementById('tabNotesLabel'),
    mobileNotesBadge: document.getElementById('mobileNotesBadge'),
    mobileNewNoteBtn: document.getElementById('mobileNewNoteBtn'),
    editorPane: document.getElementById('editorPane'),
    notesPane: document.getElementById('notesPane'),

    // Modals
    trashOverlay: document.getElementById('trashOverlay'),
    trashList: document.getElementById('trashList'),
    trashCloseBtn: document.getElementById('trashCloseBtn'),
    emptyTrashBtn: document.getElementById('emptyTrashBtn'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalText: document.getElementById('modalText'),
    modalCancel: document.getElementById('modalCancel'),
    modalConfirm: document.getElementById('modalConfirm'),
    quickPreviewOverlay: document.getElementById('quickPreviewOverlay'),
    quickPreviewBadges: document.getElementById('quickPreviewBadges'),
    quickPreviewCloseX: document.getElementById('quickPreviewCloseX'),
    quickPreviewTitle: document.getElementById('quickPreviewTitle'),
    quickPreviewMeta: document.getElementById('quickPreviewMeta'),
    quickPreviewContent: document.getElementById('quickPreviewContent'),
    quickPreviewTags: document.getElementById('quickPreviewTags'),
    quickPreviewCopyBtn: document.getElementById('quickPreviewCopyBtn'),
    quickPreviewSpeakBtn: document.getElementById('quickPreviewSpeakBtn'),
    quickPreviewEditBtn: document.getElementById('quickPreviewEditBtn'),
    quickPreviewCloseBtn: document.getElementById('quickPreviewCloseBtn'),
    readingOverlay: document.getElementById('readingOverlay'),
    readingText: document.getElementById('readingText'),
    readingStopBtn: document.getElementById('readingStopBtn'),

    // Formal Print Modal
    formalPrintOverlay: document.getElementById('formalPrintOverlay'),
    formalPrintCloseX: document.getElementById('formalPrintCloseX'),
    formalPrintCloseBtn: document.getElementById('formalPrintCloseBtn'),
    doPrintBtn: document.getElementById('doPrintBtn'),
    copyFormalTextBtn: document.getElementById('copyFormalTextBtn'),
    editLetterheadFromPreviewBtn: document.getElementById('editLetterheadFromPreviewBtn'),
    sheetOrgLogo: document.getElementById('sheetOrgLogo'),
    sheetOrgName: document.getElementById('sheetOrgName'),
    sheetOrgDept: document.getElementById('sheetOrgDept'),
    sheetOrgSub: document.getElementById('sheetOrgSub'),
    sheetFolio: document.getElementById('sheetFolio'),
    sheetDate: document.getElementById('sheetDate'),
    sheetDocType: document.getElementById('sheetDocType'),
    sheetDepartment: document.getElementById('sheetDepartment'),
    sheetAssignee: document.getElementById('sheetAssignee'),
    sheetDeadline: document.getElementById('sheetDeadline'),
    sheetPriority: document.getElementById('sheetPriority'),
    sheetStatus: document.getElementById('sheetStatus'),
    sheetAttendeesRow: document.getElementById('sheetAttendeesRow'),
    sheetAttendees: document.getElementById('sheetAttendees'),
    sheetDocTitle: document.getElementById('sheetDocTitle'),
    sheetDocBody: document.getElementById('sheetDocBody'),
    sheetSigAuthorName: document.getElementById('sheetSigAuthorName'),
    sheetSigAuthorTitle: document.getElementById('sheetSigAuthorTitle'),
    sheetSigReviewerName: document.getElementById('sheetSigReviewerName'),
    sheetSigReviewerTitle: document.getElementById('sheetSigReviewerTitle'),
    sheetFooterLegal: document.getElementById('sheetFooterLegal'),

    // Letterhead Config Modal
    letterheadOverlay: document.getElementById('letterheadOverlay'),
    letterheadCloseX: document.getElementById('letterheadCloseX'),
    letterheadCancelBtn: document.getElementById('letterheadCancelBtn'),
    letterheadForm: document.getElementById('letterheadForm'),
    cfgOrgName: document.getElementById('cfgOrgName'),
    cfgOrgDept: document.getElementById('cfgOrgDept'),
    cfgOrgSub: document.getElementById('cfgOrgSub'),
    cfgOrgLogo: document.getElementById('cfgOrgLogo'),
    cfgLogoFile: document.getElementById('cfgLogoFile'),
    cfgSigAuthor: document.getElementById('cfgSigAuthor'),
    cfgSigReviewer: document.getElementById('cfgSigReviewer'),
    cfgFooterLegal: document.getElementById('cfgFooterLegal'),

    // Team Modal
    teamOverlay: document.getElementById('teamOverlay'),
    teamCloseX: document.getElementById('teamCloseX'),
    teamCloseBtn: document.getElementById('teamCloseBtn'),
    addMemberForm: document.getElementById('addMemberForm'),
    memberFullName: document.getElementById('memberFullName'),
    memberRole: document.getElementById('memberRole'),
    memberDept: document.getElementById('memberDept'),
    teamMemberCount: document.getElementById('teamMemberCount'),
    teamList: document.getElementById('teamList'),

    // Template Confirm Modal
    templateConfirmOverlay: document.getElementById('templateConfirmOverlay'),
    templateCancelBtn: document.getElementById('templateCancelBtn'),
    templateAppendBtn: document.getElementById('templateAppendBtn'),
    templateReplaceBtn: document.getElementById('templateReplaceBtn'),

    // Auth & Profile
    userAuthWidget: document.getElementById('userAuthWidget'),
    userLoginTriggerBtn: document.getElementById('userLoginTriggerBtn'),
    userAuthLabel: document.getElementById('userAuthLabel'),
    userProfileDropdown: document.getElementById('userProfileDropdown'),
    userAvatar: document.getElementById('userAvatar'),
    userDisplayName: document.getElementById('userDisplayName'),
    userEmail: document.getElementById('userEmail'),
    userAccountBadge: document.getElementById('userAccountBadge'),
    syncStatusItem: document.getElementById('syncStatusItem'),
    syncStatusText: document.getElementById('syncStatusText'),
    userLogoutBtn: document.getElementById('userLogoutBtn'),

    // Auth Modal
    authModalOverlay: document.getElementById('authModalOverlay'),
    authModalCloseX: document.getElementById('authModalCloseX'),
    authModalCloseBtn: document.getElementById('authModalCloseBtn'),
    googleAuthBtn: document.getElementById('googleAuthBtn'),
    emailAuthForm: document.getElementById('emailAuthForm'),
    authNameGroup: document.getElementById('authNameGroup'),
    authNameInput: document.getElementById('authNameInput'),
    authEmailInput: document.getElementById('authEmailInput'),
    authPasswordInput: document.getElementById('authPasswordInput'),
    authErrorMsg: document.getElementById('authErrorMsg'),
    emailAuthSubmitBtn: document.getElementById('emailAuthSubmitBtn'),
    authTogglePrompt: document.getElementById('authTogglePrompt'),
    authToggleModeBtn: document.getElementById('authToggleModeBtn')
  };

  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  // ==========================================================================
  // SISTEMA DE CONFIRMACIÓN MODAL
  // ==========================================================================
  let modalResolver = null;
  function askConfirm(title, text){
    el.modalTitle.textContent = title;
    el.modalText.textContent = text;
    el.modalOverlay.classList.add('open');
    return new Promise((resolve) => { modalResolver = resolve; });
  }
  function closeModal(result){
    el.modalOverlay.classList.remove('open');
    if(modalResolver){ modalResolver(result); modalResolver = null; }
  }
  el.modalCancel.addEventListener('click', () => closeModal(false));
  el.modalConfirm.addEventListener('click', () => closeModal(true));
  el.modalOverlay.addEventListener('click', (e) => { if(e.target === el.modalOverlay) closeModal(false); });

  function setStatus(msg, isError){
    el.statusLine.textContent = msg || '';
    el.statusLine.style.color = isError ? '#DC2626' : '';
    if(msg){
      clearTimeout(setStatus._t);
      setStatus._t = setTimeout(()=>{ el.statusLine.textContent=''; }, 3500);
    }
  }

  // ==========================================================================
  // PERSISTENCIA Y ALMACENAMIENTO POR ESPACIO
  // ==========================================================================
  function getFoldersKey(ws = state.workspace){
    return ws === WORKSPACES.ENTERPRISE ? 'folders_enterprise' : 'folders_personal';
  }
  function getActiveFolderKey(ws = state.workspace){
    return ws === WORKSPACES.ENTERPRISE ? 'active_folder_enterprise' : 'active_folder_personal';
  }
  function getNotesKey(folderId, ws = state.workspace){
    return `notes_${ws}:${folderId}`;
  }
  function getDraftKey(folderId, ws = state.workspace){
    return `draft_${ws}:${folderId}`;
  }

  function loadTeamMembers(){
    try {
      const raw = localStorage.getItem('team_members');
      state.teamMembers = raw ? JSON.parse(raw) : [...DEFAULT_TEAM_MEMBERS];
    } catch(e) {
      state.teamMembers = [...DEFAULT_TEAM_MEMBERS];
    }
    updateTeamAssigneeOptions();
  }

  function saveTeamMembers(){
    localStorage.setItem('team_members', JSON.stringify(state.teamMembers));
    updateTeamAssigneeOptions();
    renderTeamMembersList();
  }

  function loadLetterheadConfig(){
    try {
      const raw = localStorage.getItem('letterhead_config');
      state.letterhead = raw ? { ...DEFAULT_LETTERHEAD, ...JSON.parse(raw) } : { ...DEFAULT_LETTERHEAD };
    } catch(e) {
      state.letterhead = { ...DEFAULT_LETTERHEAD };
    }
  }

  function saveLetterheadConfig(){
    localStorage.setItem('letterhead_config', JSON.stringify(state.letterhead));
  }

  function updateTeamAssigneeOptions(){
    if(!el.taskAssigneeSelect) return;
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

  function getFolioPrefix(folderName){
    const clean = (folderName || '').trim().toUpperCase();
    if(clean.includes('DIRECCIÓN')) return 'DIR';
    if(clean.includes('OPERACION')) return 'OPE';
    if(clean.includes('RECURSOS') || clean.includes('RRHH')) return 'RRHH';
    if(clean.includes('LEGAL')) return 'LEG';
    if(clean.includes('FINANZ')) return 'FIN';
    if(clean.includes('TECNOLOG') || clean.includes('TI')) return 'TI';
    const words = clean.split(/\s+/).filter(Boolean);
    if(words.length >= 2) return (words[0].slice(0,2) + words[1].slice(0,1)).toUpperCase();
    return clean.slice(0,3).toUpperCase() || 'DOC';
  }

  function generateAutoFolio(){
    const folder = state.folders.find(f => f.id === state.activeFolderId);
    const prefix = getFolioPrefix(folder ? folder.name : 'DOC');
    const year = new Date().getFullYear();
    let count = parseInt(localStorage.getItem('folio_counter') || '101', 10);
    count += 1;
    localStorage.setItem('folio_counter', count.toString());
    return `${prefix}-${year}-${String(count).slice(-3)}`;
  }

  async function loadFolders(){
    const key = getFoldersKey();
    let folders = [];
    try {
      const raw = localStorage.getItem(key);
      if(raw) {
        folders = JSON.parse(raw);
      } else if(state.workspace === WORKSPACES.PERSONAL) {
        // Fallback for legacy personal folders
        const legacy = localStorage.getItem('folders');
        if(legacy) folders = JSON.parse(legacy);
      }
    } catch(e){}

    if(!folders || !folders.length){
      if(state.workspace === WORKSPACES.ENTERPRISE){
        folders = DEFAULT_ENTERPRISE_FOLDERS.map(d => ({
          id: uid(),
          name: d.name,
          code: d.code,
          color: d.color,
          createdAt: Date.now()
        }));
      } else {
        folders = DEFAULT_PERSONAL_FOLDERS.map(d => ({
          id: uid(),
          name: d.name,
          color: d.color,
          createdAt: Date.now()
        }));
      }
      localStorage.setItem(key, JSON.stringify(folders));
    }

    state.folders = folders;

    const savedActive = localStorage.getItem(getActiveFolderKey());
    if(savedActive && state.folders.some(f => f.id === savedActive)){
      state.activeFolderId = savedActive;
    } else {
      state.activeFolderId = state.folders[0].id;
    }
  }

  async function persistFolders(){
    localStorage.setItem(getFoldersKey(), JSON.stringify(state.folders));
    if(state.workspace === WORKSPACES.PERSONAL){
      localStorage.setItem('folders', JSON.stringify(state.folders)); // legacy sync
    }
  }

  async function loadNotes(folderId){
    const key = getNotesKey(folderId);
    let notes = [];
    try {
      const raw = localStorage.getItem(key);
      if(raw){
        notes = JSON.parse(raw);
      } else if(state.workspace === WORKSPACES.PERSONAL){
        // Legacy fallback
        const legacy = localStorage.getItem(`notes:${folderId}`);
        if(legacy) notes = JSON.parse(legacy);
      }
    } catch(e){}

    // If user is authenticated in cloud, sync cloud notes
    if(state.currentUser && db){
      try {
        if(state.workspace === WORKSPACES.ENTERPRISE){
          // Query shared institutional reports for this department/folder
          const reportsRef = collection(db, 'reports');
          const q = query(reportsRef, where('folder', '==', folderId), where('isTrash', '==', false));
          const snap = await getDocs(q);
          if(!snap.empty){
            const cloudNotes = [];
            snap.forEach(d => {
              const data = d.data();
              cloudNotes.push({
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
              });
            });
            if(cloudNotes.length){
              notes = cloudNotes;
              localStorage.setItem(key, JSON.stringify(notes));
            }
          }
        } else {
          // Query user private notes
          const userNotesRef = collection(db, 'users', state.currentUser.uid, 'notes');
          const q = query(userNotesRef, where('folder', '==', folderId), where('isTrash', '==', false));
          const snap = await getDocs(q);
          if(!snap.empty){
            const cloudNotes = [];
            snap.forEach(d => {
              const data = d.data();
              cloudNotes.push({
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
              });
            });
            if(cloudNotes.length){
              notes = cloudNotes;
              localStorage.setItem(key, JSON.stringify(notes));
            }
          }
        }
      } catch(cloudErr){
        console.warn('Firestore load fallback to local:', cloudErr);
      }
    }

    notesCache[folderId] = notes || [];
    return notes || [];
  }

  async function persistNotes(folderId, notes){
    notesCache[folderId] = notes;
    localStorage.setItem(getNotesKey(folderId), JSON.stringify(notes));
    if(state.workspace === WORKSPACES.PERSONAL){
      localStorage.setItem(`notes:${folderId}`, JSON.stringify(notes));
    }

    // Sync to Firestore if logged in
    if(state.currentUser && db){
      try {
        if(state.workspace === WORKSPACES.ENTERPRISE){
          // Save to reports collection
          for(const note of notes){
            const reportRef = doc(db, 'reports', note.id);
            await setDoc(reportRef, {
              title: note.text ? note.text.split('\n')[0].slice(0, 80) : 'Sin título',
              text: note.text || '',
              folder: folderId,
              tags: note.tags || [],
              docType: note.docType || 'general',
              docFolio: note.docFolio || '',
              taskAssignee: note.taskAssignee || '',
              taskDueDate: note.taskDueDate || '',
              taskPriority: note.taskPriority || 'normal',
              taskStatus: note.taskStatus || 'pendiente',
              docAttendees: note.docAttendees || '',
              authorUid: state.currentUser.uid,
              authorEmail: state.currentUser.email || '',
              authorName: state.currentUser.displayName || state.currentUser.email || 'Anónimo',
              orgDomain: state.currentUser.orgDomain || '',
              createdAt: note.createdAt || Date.now(),
              updatedAt: Date.now(),
              isTrash: false
            }, { merge: true });
          }
        } else {
          // Save to user private notes
          for(const note of notes){
            const noteRef = doc(db, 'users', state.currentUser.uid, 'notes', note.id);
            await setDoc(noteRef, {
              title: note.text ? note.text.split('\n')[0].slice(0, 80) : 'Sin título',
              text: note.text || '',
              folder: folderId,
              tags: note.tags || [],
              createdAt: note.createdAt || Date.now(),
              updatedAt: Date.now(),
              isTrash: false,
              workspace: 'personal'
            }, { merge: true });
          }
        }
      } catch(syncErr){
        console.warn('Error syncing note to Firestore:', syncErr);
      }
    }
  }

  function getTrashKey(){
    return `trash_${state.workspace}`;
  }

  function loadTrash(){
    try {
      const raw = localStorage.getItem(getTrashKey());
      if(raw) return JSON.parse(raw);
      if(state.workspace === WORKSPACES.PERSONAL){
        const leg = localStorage.getItem('trash');
        if(leg) return JSON.parse(leg);
      }
    } catch(e){}
    return [];
  }

  function saveTrash(trash){
    localStorage.setItem(getTrashKey(), JSON.stringify(trash));
    updateTrashBadge();
  }

  function updateTrashBadge(){
    const trash = loadTrash();
    if(el.trashCount){
      el.trashCount.textContent = trash.length ? `(${trash.length})` : '';
    }
  }

  // ==========================================================================
  // GESTIÓN DEL ESPACIO DE TRABAJO (PERSONAL VS. EMPRESARIAL)
  // ==========================================================================
  async function switchWorkspace(newWorkspace){
    if(state.workspace === newWorkspace) return;
    saveCurrentEditorDraft();

    state.workspace = newWorkspace;
    localStorage.setItem('current_workspace', newWorkspace);
    state.currentNoteId = null;
    state.tagFilter = null;
    state.statusFilter = 'all';
    state.searchQuery = '';
    el.searchInput.value = '';

    updateWorkspaceUI();
    await loadFolders();
    renderFolders();
    await selectFolder(state.activeFolderId);
    setStatus(`Espacio ${newWorkspace === WORKSPACES.ENTERPRISE ? 'Institucional' : 'Personal'} activado`);
  }

  function updateWorkspaceUI(){
    const isEnterprise = state.workspace === WORKSPACES.ENTERPRISE;

    if(isEnterprise){
      el.wsEnterpriseBtn.classList.add('active');
      el.wsPersonalBtn.classList.remove('active');
      el.topbarWorkspaceTag.textContent = '🏢 Institucional';
      el.topbarWorkspaceTag.classList.add('enterprise');
      el.sidebarWorkspaceBadge.textContent = 'Espacio Institucional';
      el.foldersSectionLabel.textContent = 'Departamentos & Equipos';
      el.newFolderInput.placeholder = 'Nuevo departamento o área…';
      el.notesPaneTitle.textContent = 'Reportes y Actas';
      el.searchGlobalLabel.textContent = 'Todos los departamentos';
      if(el.tabNotesLabel) el.tabNotesLabel.textContent = '📑 Reportes';
      if(el.tabPlanBtn) el.tabPlanBtn.style.display = 'flex';
      if(el.formalPrintOptionRow) el.formalPrintOptionRow.style.display = 'flex';
      if(el.optionsMenuDivider) el.optionsMenuDivider.style.display = 'block';
      if(el.manageTeamBtn) el.manageTeamBtn.style.display = 'inline-block';
      if(el.letterheadConfigBtn) el.letterheadConfigBtn.style.display = 'block';
      if(el.enterpriseFiltersRow) el.enterpriseFiltersRow.style.display = 'block';
    } else {
      el.wsPersonalBtn.classList.add('active');
      el.wsEnterpriseBtn.classList.remove('active');
      el.topbarWorkspaceTag.textContent = '👤 Personal';
      el.topbarWorkspaceTag.classList.remove('enterprise');
      el.sidebarWorkspaceBadge.textContent = 'Espacio Personal';
      el.foldersSectionLabel.textContent = 'Carpetas';
      el.newFolderInput.placeholder = 'Nueva carpeta…';
      el.notesPaneTitle.textContent = 'Notas guardadas';
      el.searchGlobalLabel.textContent = 'Todas las carpetas';
      if(el.tabNotesLabel) el.tabNotesLabel.textContent = '🗒️ Notas';
      if(el.tabPlanBtn) el.tabPlanBtn.style.display = 'none';
      if(el.formalPrintOptionRow) el.formalPrintOptionRow.style.display = 'none';
      if(el.optionsMenuDivider) el.optionsMenuDivider.style.display = 'none';
      if(el.manageTeamBtn) el.manageTeamBtn.style.display = 'none';
      if(el.letterheadConfigBtn) el.letterheadConfigBtn.style.display = 'none';
      if(el.enterpriseFiltersRow) el.enterpriseFiltersRow.style.display = 'none';

      // Ensure we switch out of Planificación if user was on it
      if(el.tabPlanBtn && el.tabPlanBtn.classList.contains('active')){
        setActiveTab('editor');
      }
    }

    updateTrashBadge();
  }

  el.wsPersonalBtn.addEventListener('click', () => switchWorkspace(WORKSPACES.PERSONAL));
  el.wsEnterpriseBtn.addEventListener('click', () => switchWorkspace(WORKSPACES.ENTERPRISE));

  // ==========================================================================
  // RENDERIZADO DE CARPETAS / DEPARTAMENTOS
  // ==========================================================================
  function renderFolders(){
    el.folderList.innerHTML = '';
    state.folders.forEach(f => {
      const li = document.createElement('li');
      li.className = 'folder-item' + (f.id === state.activeFolderId ? ' active' : '');
      li.dataset.id = f.id;

      const btn = document.createElement('button');
      btn.className = 'folder-btn';
      btn.type = 'button';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'folder-icon';
      iconSpan.textContent = state.workspace === WORKSPACES.ENTERPRISE ? '🏢' : '📁';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'folder-name';

      if(f.code && state.workspace === WORKSPACES.ENTERPRISE){
        const tag = document.createElement('span');
        tag.className = 'dept-tag';
        tag.textContent = `[${f.code}]`;
        nameSpan.appendChild(tag);
      }

      const textNode = document.createTextNode(f.name);
      nameSpan.appendChild(textNode);

      btn.appendChild(iconSpan);
      btn.appendChild(nameSpan);
      btn.addEventListener('click', () => selectFolder(f.id));

      li.appendChild(btn);

      // Botón de eliminar carpeta (solo si hay más de 1)
      if(state.folders.length > 1){
        const delBtn = document.createElement('button');
        delBtn.className = 'folder-del';
        delBtn.type = 'button';
        delBtn.title = 'Eliminar carpeta';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteFolder(f.id);
        });
        li.appendChild(delBtn);
      }

      el.folderList.appendChild(li);
    });
  }

  async function selectFolder(folderId){
    saveCurrentEditorDraft();
    state.activeFolderId = folderId;
    localStorage.setItem(getActiveFolderKey(), folderId);

    const folder = state.folders.find(f => f.id === folderId);
    if(folder){
      el.folderTitle.textContent = folder.name;
      el.folderEyebrow.textContent = state.workspace === WORKSPACES.ENTERPRISE ? 'departamento activo' : 'carpeta activa';
    }

    renderFolders();
    state.notes = await loadNotes(folderId);
    renderNotesList();
    renderTagFilters();
    loadEditorDraft(folderId);

    if(state.workspace === WORKSPACES.ENTERPRISE && !el.docFolioInput.value){
      el.docFolioInput.value = generateAutoFolio();
      el.currentFolioBadge.textContent = `Folio: ${el.docFolioInput.value}`;
    }

    closeSidebar();
  }

  function openSidebar(){
    if(el.sidebar) el.sidebar.classList.add('open');
    if(el.sidebarBackdrop) el.sidebarBackdrop.classList.add('open');
  }

  function closeSidebar(){
    if(el.sidebar) el.sidebar.classList.remove('open');
    if(el.sidebarBackdrop) el.sidebarBackdrop.classList.remove('open');
  }

  if(el.hamburgerBtn) el.hamburgerBtn.addEventListener('click', openSidebar);
  if(el.sidebarCloseBtn) el.sidebarCloseBtn.addEventListener('click', closeSidebar);
  if(el.sidebarBackdrop) el.sidebarBackdrop.addEventListener('click', closeSidebar);

  async function createFolder(name){
    const trimmed = (name || '').trim();
    if(!trimmed) return;
    const isEnt = state.workspace === WORKSPACES.ENTERPRISE;
    const code = isEnt ? getFolioPrefix(trimmed) : null;
    const folder = {
      id: uid(),
      name: trimmed,
      code: code,
      color: null,
      createdAt: Date.now()
    };
    state.folders.push(folder);
    await persistFolders();
    await selectFolder(folder.id);
    el.newFolderInput.value = '';
    setStatus(isEnt ? `Departamento «${trimmed}» creado` : `Carpeta «${trimmed}» creada`);
  }

  el.addFolderBtn.addEventListener('click', () => createFolder(el.newFolderInput.value));
  el.newFolderInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') createFolder(el.newFolderInput.value);
  });

  async function deleteFolder(folderId){
    if(state.folders.length <= 1){
      setStatus('No puedes eliminar la única carpeta.', true);
      return;
    }
    const folder = state.folders.find(f => f.id === folderId);
    const notes = await loadNotes(folderId);
    const ok = await askConfirm(
      '¿Eliminar carpeta?',
      `Se moverán ${notes.length} nota(s) de «${folder.name}» a la papelera.`
    );
    if(!ok) return;

    if(notes.length > 0){
      const trash = loadTrash();
      notes.forEach(n => trash.push({ ...n, folderId, folderName: folder.name, deletedAt: Date.now() }));
      saveTrash(trash);
    }

    localStorage.removeItem(getNotesKey(folderId));
    localStorage.removeItem(getDraftKey(folderId));
    delete notesCache[folderId];

    state.folders = state.folders.filter(f => f.id !== folderId);
    await persistFolders();

    const nextFolder = state.folders[0];
    await selectFolder(nextFolder.id);
    setStatus(`Carpeta eliminada`);
  }

  // ==========================================================================
  // CONTROL DE BORRADORES Y EDITOR
  // ==========================================================================
  let autoSaveTimeout = null;

  function saveCurrentEditorDraft(){
    if(!state.activeFolderId) return;
    const draft = {
      text: el.editor.value,
      tags: el.tagsInput.value,
      docType: el.docTypeSelect ? el.docTypeSelect.value : 'general',
      docFolio: el.docFolioInput ? el.docFolioInput.value : '',
      taskAssignee: el.taskAssigneeSelect ? el.taskAssigneeSelect.value : '',
      taskDueDate: el.taskDueDate ? el.taskDueDate.value : '',
      taskPriority: el.taskPrioritySelect ? el.taskPrioritySelect.value : 'normal',
      taskStatus: el.taskStatusSelect ? el.taskStatusSelect.value : 'pendiente',
      docAttendees: el.docAttendeesInput ? el.docAttendeesInput.value : '',
      noteId: state.currentNoteId
    };
    localStorage.setItem(getDraftKey(state.activeFolderId), JSON.stringify(draft));
  }

  function loadEditorDraft(folderId){
    state.currentNoteId = null;
    try {
      const raw = localStorage.getItem(getDraftKey(folderId));
      if(raw){
        const draft = JSON.parse(raw);
        el.editor.value = draft.text || '';
        el.tagsInput.value = draft.tags || '';
        if(el.docTypeSelect) el.docTypeSelect.value = draft.docType || 'general';
        if(el.docFolioInput) el.docFolioInput.value = draft.docFolio || '';
        if(el.taskAssigneeSelect) el.taskAssigneeSelect.value = draft.taskAssignee || '';
        if(el.taskDueDate) el.taskDueDate.value = draft.taskDueDate || '';
        if(el.taskPrioritySelect) el.taskPrioritySelect.value = draft.taskPriority || 'normal';
        if(el.taskStatusSelect) el.taskStatusSelect.value = draft.taskStatus || 'pendiente';
        if(el.docAttendeesInput) el.docAttendeesInput.value = draft.docAttendees || '';
        if(draft.docFolio && el.currentFolioBadge) el.currentFolioBadge.textContent = `Folio: ${draft.docFolio}`;
        state.currentNoteId = draft.noteId || null;
        return;
      }
    } catch(e){}

    el.editor.value = '';
    el.tagsInput.value = '';
    if(el.docTypeSelect) el.docTypeSelect.value = 'general';
    if(el.docFolioInput) el.docFolioInput.value = '';
    if(el.taskAssigneeSelect) el.taskAssigneeSelect.value = '';
    if(el.taskDueDate) el.taskDueDate.value = '';
    if(el.taskPrioritySelect) el.taskPrioritySelect.value = 'normal';
    if(el.taskStatusSelect) el.taskStatusSelect.value = 'pendiente';
    if(el.docAttendeesInput) el.docAttendeesInput.value = '';
  }

  function handleEditorInput(){
    if(!state.autoSave) return;
    if(autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveCurrentEditorDraft();
    }, 600);
  }

  el.editor.addEventListener('input', handleEditorInput);
  el.tagsInput.addEventListener('input', handleEditorInput);

  // Metadata drawer collapse toggle
  if(el.metaDrawerToggleBtn){
    el.metaDrawerToggleBtn.addEventListener('click', () => {
      state.metaDrawerOpen = !state.metaDrawerOpen;
      el.metaDrawerBody.style.display = state.metaDrawerOpen ? 'block' : 'none';
      el.metaDrawerToggleText.textContent = state.metaDrawerOpen ? 'Minimizar' : 'Mostrar campos';
    });
  }

  // Auto Folio button
  if(el.genFolioBtn){
    el.genFolioBtn.addEventListener('click', () => {
      const folio = generateAutoFolio();
      el.docFolioInput.value = folio;
      el.currentFolioBadge.textContent = `Folio: ${folio}`;
      setStatus(`Folio ${folio} asignado`);
    });
  }

  if(el.docFolioInput){
    el.docFolioInput.addEventListener('input', () => {
      el.currentFolioBadge.textContent = el.docFolioInput.value ? `Folio: ${el.docFolioInput.value}` : 'Folio: Auto';
    });
  }

  // ==========================================================================
  // CATÁLOGO DE PLANTILLAS INSTITUCIONALES
  // ==========================================================================
  let pendingTemplate = null;

  function applyTemplate(tplKey, mode = 'replace'){
    const tpl = INSTITUTIONAL_TEMPLATES[tplKey];
    if(!tpl) return;

    if(mode === 'replace'){
      el.editor.value = tpl.content;
    } else {
      el.editor.value = (el.editor.value.trim() ? el.editor.value + '\n\n---\n\n' : '') + tpl.content;
    }

    if(el.docTypeSelect) el.docTypeSelect.value = tpl.type;
    if(el.taskPrioritySelect) el.taskPrioritySelect.value = tpl.priority;
    if(!el.docFolioInput.value) {
      const fol = generateAutoFolio();
      el.docFolioInput.value = fol;
      el.currentFolioBadge.textContent = `Folio: ${fol}`;
    }

    saveCurrentEditorDraft();
    setActiveTab('editor');
    el.editor.focus();
    setStatus(`Plantilla «${tpl.title}» cargada en el editor ✓`);
  }

  document.querySelectorAll('.template-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const tplKey = btn.dataset.template;
      if(el.editor.value.trim()){
        pendingTemplate = tplKey;
        el.templateConfirmOverlay.classList.add('open');
      } else {
        applyTemplate(tplKey, 'replace');
      }
    });
  });

  el.templateCancelBtn.addEventListener('click', () => {
    pendingTemplate = null;
    el.templateConfirmOverlay.classList.remove('open');
  });
  el.templateAppendBtn.addEventListener('click', () => {
    if(pendingTemplate) applyTemplate(pendingTemplate, 'append');
    pendingTemplate = null;
    el.templateConfirmOverlay.classList.remove('open');
  });
  el.templateReplaceBtn.addEventListener('click', () => {
    if(pendingTemplate) applyTemplate(pendingTemplate, 'replace');
    pendingTemplate = null;
    el.templateConfirmOverlay.classList.remove('open');
  });

  // ==========================================================================
  // GUARDAR NOTA
  // ==========================================================================
  async function saveNote(){
    const text = el.editor.value.trim();
    if(!text){
      setStatus('El editor está vacío. Escribe algo antes de guardar.', true);
      return;
    }
    const tags = el.tagsInput.value
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const docType = el.docTypeSelect ? el.docTypeSelect.value : 'general';
    const docFolio = el.docFolioInput ? (el.docFolioInput.value.trim() || generateAutoFolio()) : '';
    const taskAssignee = el.taskAssigneeSelect ? el.taskAssigneeSelect.value : '';
    const taskDueDate = el.taskDueDate ? el.taskDueDate.value : '';
    const taskPriority = el.taskPrioritySelect ? el.taskPrioritySelect.value : 'normal';
    const taskStatus = el.taskStatusSelect ? el.taskStatusSelect.value : 'pendiente';
    const docAttendees = el.docAttendeesInput ? el.docAttendeesInput.value.trim() : '';

    if(state.currentNoteId){
      // Actualizar nota existente
      const idx = state.notes.findIndex(n => n.id === state.currentNoteId);
      if(idx !== -1){
        state.notes[idx] = {
          ...state.notes[idx],
          text,
          tags,
          docType,
          docFolio,
          taskAssignee,
          taskDueDate,
          taskPriority,
          taskStatus,
          docAttendees,
          updatedAt: Date.now()
        };
        await persistNotes(state.activeFolderId, state.notes);
        setStatus('Documento actualizado correctamente ✓');
      }
    } else {
      // Crear nueva nota
      const newNote = {
        id: uid(),
        text,
        tags,
        docType,
        docFolio,
        taskAssignee,
        taskDueDate,
        taskPriority,
        taskStatus,
        docAttendees,
        createdAt: Date.now(),
        pinned: false
      };
      state.notes.unshift(newNote);
      await persistNotes(state.activeFolderId, state.notes);
      state.currentNoteId = newNote.id;
      setStatus(state.workspace === WORKSPACES.ENTERPRISE ? `Reporte ${docFolio} registrado ✓` : 'Nota guardada ✓');
    }

    renderNotesList();
    renderTagFilters();
    saveCurrentEditorDraft();
  }

  el.saveBtn.addEventListener('click', saveNote);

  // Limpiar editor
  let lastCleared = null;
  el.clearBtn.addEventListener('click', () => {
    if(!el.editor.value.trim()) return;
    lastCleared = {
      text: el.editor.value,
      tags: el.tagsInput.value,
      noteId: state.currentNoteId
    };
    el.editor.value = '';
    el.tagsInput.value = '';
    state.currentNoteId = null;
    saveCurrentEditorDraft();
    setStatus('Editor vaciado');
  });

  // ==========================================================================
  // LISTA DE NOTAS Y TARJETAS
  // ==========================================================================
  function renderNotesList(){
    el.notesList.innerHTML = '';
    let filtered = [...state.notes];

    // Filtro por búsqueda
    if(state.searchQuery){
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(n => {
        const tMatch = n.text.toLowerCase().includes(q);
        const fMatch = (n.docFolio || '').toLowerCase().includes(q);
        const aMatch = (n.taskAssignee || '').toLowerCase().includes(q);
        const tagMatch = (n.tags || []).some(t => t.toLowerCase().includes(q));
        return tMatch || fMatch || aMatch || tagMatch;
      });
    }

    // Filtro por etiqueta
    if(state.tagFilter){
      filtered = filtered.filter(n => (n.tags || []).includes(state.tagFilter));
    }

    // Filtro por estado empresarial
    if(state.workspace === WORKSPACES.ENTERPRISE && state.statusFilter !== 'all'){
      filtered = filtered.filter(n => (n.taskStatus || 'pendiente') === state.statusFilter);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      if(a.pinned && !b.pinned) return -1;
      if(!a.pinned && b.pinned) return 1;

      if(state.sortMode === 'recientes') return (b.createdAt || 0) - (a.createdAt || 0);
      if(state.sortMode === 'antiguas') return (a.createdAt || 0) - (b.createdAt || 0);
      if(state.sortMode === 'alfabetico') return a.text.localeCompare(b.text);
      if(state.sortMode === 'prioridad'){
        const pVal = { urgente: 4, alta: 3, media: 2, normal: 1 };
        return (pVal[b.taskPriority] || 1) - (pVal[a.taskPriority] || 1);
      }
      if(state.sortMode === 'plazo'){
        if(!a.taskDueDate) return 1;
        if(!b.taskDueDate) return -1;
        return a.taskDueDate.localeCompare(b.taskDueDate);
      }
      return 0;
    });

    const isEnt = state.workspace === WORKSPACES.ENTERPRISE;
    const totalCount = state.notes.length;
    el.notesCount.textContent = `${totalCount} ${isEnt ? (totalCount === 1 ? 'reporte' : 'reportes') : (totalCount === 1 ? 'nota' : 'notas')}`;
    if(el.mobileNotesBadge) el.mobileNotesBadge.textContent = totalCount.toString();

    if(filtered.length === 0){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-icon">${isEnt ? '📑' : '🗒️'}</div>
        <h4>${isEnt ? 'No hay documentos en este departamento' : 'No hay notas en esta carpeta'}</h4>
        <p>${isEnt ? 'Carga una plantilla o pulsa «Dictar» para generar el primer reporte institucional.' : 'Escribe tus ideas en el editor o pulsa «Dictar» para comenzar.'}</p>
      `;
      el.notesList.appendChild(empty);
      return;
    }

    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = 'note-card' + (n.pinned ? ' pinned' : '') + (state.currentNoteId === n.id ? ' active-editing' : '');
      card.dataset.id = n.id;

      // Card Header
      const topRow = document.createElement('div');
      topRow.className = 'note-card-top';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'note-date';
      dateSpan.textContent = new Date(n.createdAt).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      topRow.appendChild(dateSpan);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'note-actions';

      // Pin button
      const pinBtn = document.createElement('button');
      pinBtn.className = 'icon-btn' + (n.pinned ? ' active' : '');
      pinBtn.title = n.pinned ? 'Desfijar' : 'Fijar arriba';
      pinBtn.textContent = n.pinned ? '⭐' : '☆';
      pinBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePinNote(n.id); });
      actionsDiv.appendChild(pinBtn);

      // Print / Formal button
      if(isEnt){
        const printBtn = document.createElement('button');
        printBtn.className = 'icon-btn';
        printBtn.title = 'Vista formal con membrete';
        printBtn.textContent = '🖨️';
        printBtn.addEventListener('click', (e) => { e.stopPropagation(); openFormalPrintModal(n); });
        actionsDiv.appendChild(printBtn);
      }

      // Quick Preview Button
      const viewBtn = document.createElement('button');
      viewBtn.className = 'icon-btn';
      viewBtn.title = 'Vista previa y lectura';
      viewBtn.textContent = '👁️';
      viewBtn.addEventListener('click', (e) => { e.stopPropagation(); openQuickPreview(n); });
      actionsDiv.appendChild(viewBtn);

      // Delete Button
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = 'Mover a papelera';
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); trashNote(n.id); });
      actionsDiv.appendChild(delBtn);

      topRow.appendChild(actionsDiv);
      card.appendChild(topRow);

      // Institutional Badges Row
      if(isEnt && (n.docFolio || n.docType || n.taskStatus || n.taskPriority)){
        const badgesRow = document.createElement('div');
        badgesRow.className = 'note-meta-badges-row';

        if(n.docFolio){
          const fBadge = document.createElement('span');
          fBadge.className = 'badge-folio';
          fBadge.textContent = n.docFolio;
          badgesRow.appendChild(fBadge);
        }

        if(n.docType && n.docType !== 'general'){
          const tBadge = document.createElement('span');
          tBadge.className = 'badge-doctype';
          tBadge.textContent = n.docType.toUpperCase();
          badgesRow.appendChild(tBadge);
        }

        if(n.taskStatus){
          const sBadge = document.createElement('span');
          sBadge.className = `badge-status ${n.taskStatus}`;
          const sText = { pendiente: '⏳ Pendiente', en_progreso: '🔄 En Progreso', completado: '✅ Completado', archivado: '📦 Archivado' };
          sBadge.textContent = sText[n.taskStatus] || n.taskStatus;
          badgesRow.appendChild(sBadge);
        }

        if(n.taskPriority && n.taskPriority !== 'normal'){
          const pBadge = document.createElement('span');
          pBadge.className = `badge-priority ${n.taskPriority}`;
          pBadge.textContent = n.taskPriority;
          badgesRow.appendChild(pBadge);
        }

        card.appendChild(badgesRow);
      }

      // Note Text Preview
      const textP = document.createElement('p');
      textP.className = 'note-text';
      textP.textContent = n.text;
      card.appendChild(textP);

      // Assignee & Due Date Row
      if(isEnt && (n.taskAssignee || n.taskDueDate)){
        const assignRow = document.createElement('div');
        assignRow.className = 'note-assignee-row';

        const assignInfo = document.createElement('div');
        assignInfo.className = 'note-assignee-info';
        assignInfo.innerHTML = n.taskAssignee ? `👤 <strong>${n.taskAssignee}</strong>` : '👤 <em>Sin asignar</em>';
        assignRow.appendChild(assignInfo);

        if(n.taskDueDate){
          const dueInfo = document.createElement('div');
          dueInfo.className = 'note-due-info';
          const isOverdue = new Date(n.taskDueDate + 'T23:59:59') < new Date() && n.taskStatus !== 'completado';
          if(isOverdue) dueInfo.classList.add('overdue');
          dueInfo.textContent = `📅 ${n.taskDueDate}${isOverdue ? ' ⚠️ Vencido' : ''}`;
          assignRow.appendChild(dueInfo);
        }

        card.appendChild(assignRow);
      }

      // Tags Row
      if(n.tags && n.tags.length > 0){
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'note-tags';
        n.tags.forEach(t => {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'tag';
          tagSpan.textContent = `#${t}`;
          tagsDiv.appendChild(tagSpan);
        });
        card.appendChild(tagsDiv);
      }

      // Click to open in editor
      card.addEventListener('click', () => loadNoteIntoEditor(n));
      el.notesList.appendChild(card);
    });
  }

  function loadNoteIntoEditor(note){
    state.currentNoteId = note.id;
    el.editor.value = note.text;
    el.tagsInput.value = (note.tags || []).join(', ');

    if(el.docTypeSelect) el.docTypeSelect.value = note.docType || 'general';
    if(el.docFolioInput) el.docFolioInput.value = note.docFolio || '';
    if(el.taskAssigneeSelect) el.taskAssigneeSelect.value = note.taskAssignee || '';
    if(el.taskDueDate) el.taskDueDate.value = note.taskDueDate || '';
    if(el.taskPrioritySelect) el.taskPrioritySelect.value = note.taskPriority || 'normal';
    if(el.taskStatusSelect) el.taskStatusSelect.value = note.taskStatus || 'pendiente';
    if(el.docAttendeesInput) el.docAttendeesInput.value = note.docAttendees || '';
    if(el.currentFolioBadge) el.currentFolioBadge.textContent = note.docFolio ? `Folio: ${note.docFolio}` : 'Folio: Auto';

    // Switch to editor tab on mobile
    if(window.innerWidth <= 820){
      el.tabEditorBtn.click();
    }
    el.editor.focus();
    setStatus('Documento cargado en editor');
  }

  async function togglePinNote(noteId){
    const idx = state.notes.findIndex(n => n.id === noteId);
    if(idx === -1) return;
    state.notes[idx].pinned = !state.notes[idx].pinned;
    await persistNotes(state.activeFolderId, state.notes);
    renderNotesList();
  }

  async function trashNote(noteId){
    const idx = state.notes.findIndex(n => n.id === noteId);
    if(idx === -1) return;
    const [removed] = state.notes.splice(idx, 1);
    await persistNotes(state.activeFolderId, state.notes);

    const folder = state.folders.find(f => f.id === state.activeFolderId);
    const trash = loadTrash();
    trash.unshift({
      ...removed,
      folderId: state.activeFolderId,
      folderName: folder ? folder.name : 'Carpeta',
      deletedAt: Date.now()
    });
    saveTrash(trash);

    if(state.currentNoteId === noteId){
      state.currentNoteId = null;
      el.editor.value = '';
      el.tagsInput.value = '';
    }

    renderNotesList();
    renderTagFilters();
    setStatus('Nota movida a la papelera');
  }

  // Tag filter row
  function renderTagFilters(){
    el.tagFilterRow.innerHTML = '';
    const allTags = new Set();
    state.notes.forEach(n => (n.tags || []).forEach(t => allTags.add(t)));

    if(allTags.size === 0) return;

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

  // Enterprise Status Filter Pills
  if(el.statusFilterPills){
    el.statusFilterPills.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        el.statusFilterPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.statusFilter = btn.dataset.filter;
        renderNotesList();
      });
    });
  }

  // Sort selector
  el.sortSelect.addEventListener('change', () => {
    state.sortMode = el.sortSelect.value;
    renderNotesList();
  });

  // Search input
  el.searchInput.addEventListener('input', () => {
    state.searchQuery = el.searchInput.value.trim();
    el.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
    renderNotesList();
  });
  el.searchClearBtn.addEventListener('click', () => {
    el.searchInput.value = '';
    state.searchQuery = '';
    el.searchClearBtn.style.display = 'none';
    renderNotesList();
  });

  if(el.searchGlobalCheckbox){
    el.searchGlobalCheckbox.addEventListener('change', () => {
      state.searchGlobal = el.searchGlobalCheckbox.checked;
      renderNotesList();
    });
  }

  if(el.viewModeDetailedBtn && el.viewModeCompactBtn){
    el.viewModeDetailedBtn.addEventListener('click', () => {
      state.viewMode = 'detailed';
      el.viewModeDetailedBtn.classList.add('active');
      el.viewModeCompactBtn.classList.remove('active');
      if(el.notesList) el.notesList.classList.remove('compact-view');
    });
    el.viewModeCompactBtn.addEventListener('click', () => {
      state.viewMode = 'compact';
      el.viewModeCompactBtn.classList.add('active');
      el.viewModeDetailedBtn.classList.remove('active');
      if(el.notesList) el.notesList.classList.add('compact-view');
    });
  }

  // ==========================================================================
  // VISTA FORMAL CON MEMBRETE CORPORATIVO & IMPRESIÓN / PDF
  // ==========================================================================
  function openFormalPrintModal(note = null){
    const data = note || {
      text: el.editor.value.trim(),
      docType: el.docTypeSelect ? el.docTypeSelect.value : 'general',
      docFolio: el.docFolioInput ? (el.docFolioInput.value || generateAutoFolio()) : 'DIR-2026-001',
      taskAssignee: el.taskAssigneeSelect ? el.taskAssigneeSelect.value : 'Responsable Asignado',
      taskDueDate: el.taskDueDate ? el.taskDueDate.value : '',
      taskPriority: el.taskPrioritySelect ? el.taskPrioritySelect.value : 'normal',
      taskStatus: el.taskStatusSelect ? el.taskStatusSelect.value : 'pendiente',
      docAttendees: el.docAttendeesInput ? el.docAttendeesInput.value : '',
      createdAt: Date.now()
    };

    if(!data.text){
      setStatus('Escribe o carga un documento para generar la vista con membrete.', true);
      return;
    }

    const folder = state.folders.find(f => f.id === state.activeFolderId);
    const deptName = folder ? folder.name : state.letterhead.orgDept;

    // Poblar elementos del membrete
    el.sheetOrgLogo.src = state.letterhead.orgLogo || './app_icon.jpg';
    el.sheetOrgName.textContent = state.letterhead.orgName;
    el.sheetOrgDept.textContent = deptName;
    el.sheetOrgSub.textContent = state.letterhead.orgSub;

    el.sheetFolio.textContent = data.docFolio || 'FOL-001';
    el.sheetDate.textContent = new Date(data.createdAt || Date.now()).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const docTypeLabels = {
      general: 'Nota General',
      minuta: 'Minuta de Reunión Ejecutiva',
      incidencia: 'Reporte de Incidencia en Terreno',
      acta: 'Acta de Acuerdos y Resoluciones',
      turno: 'Bitácora de Turno y Relevo',
      inspeccion: 'Pauta de Inspección Técnica'
    };
    el.sheetDocType.textContent = docTypeLabels[data.docType] || 'Documento Institucional';
    el.sheetDepartment.textContent = deptName;
    el.sheetAssignee.textContent = data.taskAssignee || 'Sin asignar';
    el.sheetDeadline.textContent = data.taskDueDate || 'Sin plazo fijado';
    el.sheetPriority.textContent = (data.taskPriority || 'Normal').toUpperCase();
    
    const statusLabels = { pendiente: 'Pendiente de ejecución', en_progreso: 'En Progreso', completado: 'Completado y validado', archivado: 'Archivado' };
    el.sheetStatus.textContent = statusLabels[data.taskStatus] || 'Registrado';

    if(data.docAttendees){
      el.sheetAttendeesRow.style.display = 'flex';
      el.sheetAttendees.textContent = data.docAttendees;
    } else {
      el.sheetAttendeesRow.style.display = 'none';
    }

    // Título y cuerpo del documento
    const lines = data.text.split('\n').filter(Boolean);
    const firstLine = lines[0] || 'Documento Oficial';
    el.sheetDocTitle.textContent = firstLine;
    el.sheetDocBody.textContent = data.text;

    // Firmas
    el.sheetSigAuthorName.textContent = data.taskAssignee || 'Responsable de Turno';
    el.sheetSigAuthorTitle.textContent = state.letterhead.sigAuthor || 'Elaborado por';
    el.sheetSigReviewerName.textContent = state.teamMembers.length > 0 ? state.teamMembers[0].name : 'Dirección General';
    el.sheetSigReviewerTitle.textContent = state.letterhead.sigReviewer || 'Revisado y Aprobado';
    el.sheetFooterLegal.textContent = state.letterhead.footerLegal;

    el.formalPrintOverlay.classList.add('open');
  }

  if(el.formalPrintBtn) el.formalPrintBtn.addEventListener('click', () => openFormalPrintModal());
  if(el.quickPrintBtn) el.quickPrintBtn.addEventListener('click', () => openFormalPrintModal());
  if(el.formalPrintOptionRow){
    el.formalPrintOptionRow.addEventListener('click', () => {
      el.editorOptionsMenu.classList.remove('open');
      openFormalPrintModal();
    });
  }
  if(el.planOpenLetterheadBtn){
    el.planOpenLetterheadBtn.addEventListener('click', () => openFormalPrintModal());
  }
  if(el.goToEditorBtn){
    el.goToEditorBtn.addEventListener('click', () => {
      setActiveTab('editor');
      el.editor.focus();
    });
  }
  if(el.planSaveReportBtn){
    el.planSaveReportBtn.addEventListener('click', () => {
      el.saveBtn.click();
    });
  }
  if(el.planManageTeamBtn){
    el.planManageTeamBtn.addEventListener('click', () => {
      openTeamModal();
    });
  }
  el.formalPrintCloseX.addEventListener('click', () => el.formalPrintOverlay.classList.remove('open'));
  el.formalPrintCloseBtn.addEventListener('click', () => el.formalPrintOverlay.classList.remove('open'));

  el.doPrintBtn.addEventListener('click', () => {
    window.print();
  });

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

  if(el.editLetterheadFromPreviewBtn){
    el.editLetterheadFromPreviewBtn.addEventListener('click', () => {
      el.formalPrintOverlay.classList.remove('open');
      openLetterheadConfigModal();
    });
  }

  // ==========================================================================
  // CONFIGURACIÓN DE MEMBRETE INSTITUCIONAL
  // ==========================================================================
  function openLetterheadConfigModal(){
    el.cfgOrgName.value = state.letterhead.orgName || '';
    el.cfgOrgDept.value = state.letterhead.orgDept || '';
    el.cfgOrgSub.value = state.letterhead.orgSub || '';
    el.cfgOrgLogo.value = state.letterhead.orgLogo || '';
    el.cfgSigAuthor.value = state.letterhead.sigAuthor || '';
    el.cfgSigReviewer.value = state.letterhead.sigReviewer || '';
    el.cfgFooterLegal.value = state.letterhead.footerLegal || '';
    el.letterheadOverlay.classList.add('open');
  }

  if(el.letterheadConfigBtn){
    el.letterheadConfigBtn.addEventListener('click', openLetterheadConfigModal);
  }
  el.letterheadCloseX.addEventListener('click', () => el.letterheadOverlay.classList.remove('open'));
  el.letterheadCancelBtn.addEventListener('click', () => el.letterheadOverlay.classList.remove('open'));

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
    el.letterheadOverlay.classList.remove('open');
    setStatus('Membrete institucional actualizado ✓');
  });

  if(el.cfgLogoFile){
    el.cfgLogoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        el.cfgOrgLogo.value = event.target.result;
        setStatus('Logotipo cargado');
      };
      reader.readAsDataURL(file);
    });
  }

  // ==========================================================================
  // GESTIÓN DE EQUIPO Y MIEMBROS
  // ==========================================================================
  function renderTeamMembersList(){
    el.teamList.innerHTML = '';
    el.teamMemberCount.textContent = state.teamMembers.length.toString();

    if(state.teamMembers.length === 0){
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
      if(m.dept) info.appendChild(dept);

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

  function deleteTeamMember(id){
    state.teamMembers = state.teamMembers.filter(m => m.id !== id);
    saveTeamMembers();
    setStatus('Integrante eliminado');
  }

  if(el.manageTeamBtn){
    el.manageTeamBtn.addEventListener('click', () => {
      renderTeamMembersList();
      el.teamOverlay.classList.add('open');
    });
  }
  el.teamCloseX.addEventListener('click', () => el.teamOverlay.classList.remove('open'));
  el.teamCloseBtn.addEventListener('click', () => el.teamOverlay.classList.remove('open'));

  el.addMemberForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = el.memberFullName.value.trim();
    const role = el.memberRole.value.trim();
    const dept = el.memberDept.value.trim();
    if(!name || !role) return;

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

  // ==========================================================================
  // VISTA PREVIA RÁPIDA (QUICK PREVIEW MODAL)
  // ==========================================================================
  let currentPreviewNote = null;

  function openQuickPreview(note){
    currentPreviewNote = note;
    const isEnt = state.workspace === WORKSPACES.ENTERPRISE;

    el.quickPreviewBadges.innerHTML = '';
    if(isEnt && note.docFolio){
      const b = document.createElement('span');
      b.className = 'badge-folio';
      b.textContent = note.docFolio;
      el.quickPreviewBadges.appendChild(b);
    }
    if(isEnt && note.taskStatus){
      const b = document.createElement('span');
      b.className = `badge-status ${note.taskStatus}`;
      b.textContent = note.taskStatus.toUpperCase();
      el.quickPreviewBadges.appendChild(b);
    }

    const lines = note.text.split('\n').filter(Boolean);
    el.quickPreviewTitle.textContent = lines[0] || 'Nota';
    el.quickPreviewMeta.textContent = `Creada el ${new Date(note.createdAt).toLocaleString('es-ES')} • ${note.text.length} caracteres`;
    el.quickPreviewContent.textContent = note.text;

    el.quickPreviewTags.innerHTML = '';
    (note.tags || []).forEach(t => {
      const sp = document.createElement('span');
      sp.className = 'tag';
      sp.textContent = `#${t}`;
      el.quickPreviewTags.appendChild(sp);
    });

    el.quickPreviewOverlay.classList.add('open');
  }

  el.quickPreviewCloseX.addEventListener('click', () => el.quickPreviewOverlay.classList.remove('open'));
  el.quickPreviewCloseBtn.addEventListener('click', () => el.quickPreviewOverlay.classList.remove('open'));

  el.quickPreviewCopyBtn.addEventListener('click', () => {
    if(!currentPreviewNote) return;
    navigator.clipboard.writeText(currentPreviewNote.text).then(() => setStatus('Texto copiado ✓'));
  });

  el.quickPreviewEditBtn.addEventListener('click', () => {
    if(!currentPreviewNote) return;
    el.quickPreviewOverlay.classList.remove('open');
    loadNoteIntoEditor(currentPreviewNote);
  });

  el.quickPreviewSpeakBtn.addEventListener('click', () => {
    if(!currentPreviewNote) return;
    el.quickPreviewOverlay.classList.remove('open');
    speakText(currentPreviewNote.text);
  });

  // ==========================================================================
  // DICTADO POR VOZ (SPEECH RECOGNITION)
  // ==========================================================================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if(SpeechRecognition){
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      state.recognizing = true;
      el.dictateBtn.classList.add('active');
      el.dictateBtn.textContent = '⏹ Detener dictado';
      setStatus('🎙️ Escuchando... Habla con claridad');
    };

    recognition.onresult = (e) => {
      let finalTranscript = '';
      for(let i = e.resultIndex; i < e.results.length; ++i){
        if(e.results[i].isFinal){
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if(finalTranscript){
        const cur = el.editor.value;
        const addSpace = cur.length > 0 && !/\s$/.test(cur) ? ' ' : '';
        el.editor.value = cur + addSpace + finalTranscript.trim();
        handleEditorInput();
      }
    };

    recognition.onerror = (e) => {
      setStatus(`Error de dictado: ${e.error}`, true);
      stopDictation();
    };

    recognition.onend = () => {
      stopDictation();
    };
  }

  function toggleDictation(){
    if(!recognition){
      setStatus('El dictado por voz no es compatible con este navegador.', true);
      return;
    }
    if(state.recognizing){
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch(e){
        recognition.stop();
      }
    }
  }

  function stopDictation(){
    state.recognizing = false;
    el.dictateBtn.classList.remove('active');
    el.dictateBtn.textContent = '🎙️ Dictar';
  }

  el.dictateBtn.addEventListener('click', toggleDictation);

  // ==========================================================================
  // SÍNTESIS DE VOZ (TEXT-TO-SPEECH)
  // ==========================================================================
  const synth = window.speechSynthesis;

  function loadVoices(){
    if(!synth) return;
    const all = synth.getVoices();
    state.allVoices = all;
    state.voices = all.filter(v => v.lang.startsWith('es') || v.lang.startsWith('ES'));
    if(state.voices.length === 0) state.voices = all;

    el.voiceSelect.innerHTML = '';
    state.voices.forEach((v, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${v.name} (${v.lang})`;
      el.voiceSelect.appendChild(opt);
    });
  }

  if(synth){
    loadVoices();
    if(synth.onvoiceschanged !== undefined){
      synth.onvoiceschanged = loadVoices;
    }
  }

  function speakText(textToRead){
    if(!synth){
      setStatus('Síntesis de voz no disponible.', true);
      return;
    }
    if(synth.speaking) synth.cancel();

    const text = textToRead || el.editor.value.trim();
    if(!text){
      setStatus('No hay texto para leer.', true);
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    const selectedIdx = parseInt(el.voiceSelect.value, 10);
    if(state.voices[selectedIdx]){
      utter.voice = state.voices[selectedIdx];
    }
    utter.rate = 1.0;

    utter.onstart = () => {
      state.speaking = true;
      el.playBtn.disabled = true;
      el.stopBtn.disabled = false;
      el.waveform.classList.add('active');
      setStatus('🔊 Leyendo en voz alta...');
    };

    utter.onend = () => {
      stopSpeaking();
    };

    utter.onerror = () => {
      stopSpeaking();
    };

    synth.speak(utter);
  }

  function stopSpeaking(){
    if(synth) synth.cancel();
    state.speaking = false;
    el.playBtn.disabled = false;
    el.stopBtn.disabled = true;
    el.waveform.classList.remove('active');
  }

  el.playBtn.addEventListener('click', () => speakText());
  el.stopBtn.addEventListener('click', stopSpeaking);
  el.previewVoiceBtn.addEventListener('click', () => speakText('Bitácora Hablada Empresarial. Sistema de gestión documental y voz.'));

  // ==========================================================================
  // RESPALDO COMPLETO (EXPORTAR / IMPORTAR)
  // ==========================================================================
  async function exportFullBackup(){
    setStatus('Generando respaldo institucional...');
    const backup = {
      app: 'Bitácora Hablada Empresarial',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      workspace: state.workspace,
      letterhead: state.letterhead,
      teamMembers: state.teamMembers,
      personalFolders: [],
      enterpriseFolders: []
    };

    // Export Personal Folders
    const pKey = getFoldersKey(WORKSPACES.PERSONAL);
    let pFolders = [];
    try { pFolders = JSON.parse(localStorage.getItem(pKey) || '[]'); } catch(e){}
    for(const f of pFolders){
      const notes = await loadNotes(f.id);
      backup.personalFolders.push({ folder: f, notes });
    }

    // Export Enterprise Folders
    const eKey = getFoldersKey(WORKSPACES.ENTERPRISE);
    let eFolders = [];
    try { eFolders = JSON.parse(localStorage.getItem(eKey) || '[]'); } catch(e){}
    for(const f of eFolders){
      const notes = await loadNotes(f.id);
      backup.enterpriseFolders.push({ folder: f, notes });
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `bitacora-empresarial-respaldo-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus('Respaldo descargado ✓');
  }

  async function importFullBackup(file){
    setStatus('Leyendo archivo de respaldo...');
    let data;
    try {
      const raw = await file.text();
      data = JSON.parse(raw);
    } catch(e){
      setStatus('Archivo JSON inválido.', true);
      return;
    }

    const ok = await askConfirm('Importar respaldo', 'Se restaurarán las carpetas, reportes, notas, configuración institucional y miembros del equipo.');
    if(!ok) return;

    if(data.letterhead) localStorage.setItem('letterhead_config', JSON.stringify(data.letterhead));
    if(data.teamMembers) localStorage.setItem('team_members', JSON.stringify(data.teamMembers));

    // Handle v2.5 backup
    if(data.personalFolders || data.enterpriseFolders){
      if(Array.isArray(data.personalFolders)){
        const pFolders = data.personalFolders.map(pf => pf.folder);
        localStorage.setItem(getFoldersKey(WORKSPACES.PERSONAL), JSON.stringify(pFolders));
        for(const pf of data.personalFolders){
          if(pf.folder && pf.notes){
            localStorage.setItem(getNotesKey(pf.folder.id, WORKSPACES.PERSONAL), JSON.stringify(pf.notes));
          }
        }
      }
      if(Array.isArray(data.enterpriseFolders)){
        const eFolders = data.enterpriseFolders.map(ef => ef.folder);
        localStorage.setItem(getFoldersKey(WORKSPACES.ENTERPRISE), JSON.stringify(eFolders));
        for(const ef of data.enterpriseFolders){
          if(ef.folder && ef.notes){
            localStorage.setItem(getNotesKey(ef.folder.id, WORKSPACES.ENTERPRISE), JSON.stringify(ef.notes));
          }
        }
      }
    } else if(Array.isArray(data.folders)){
      // Legacy v1 backup compatibility
      for(const fData of data.folders){
        const f = { id: uid(), name: fData.name || 'Importada', createdAt: Date.now() };
        state.folders.push(f);
        const notes = (fData.notes || []).map(n => ({ ...n, id: uid() }));
        await persistNotes(f.id, notes);
      }
      await persistFolders();
    }

    loadLetterheadConfig();
    loadTeamMembers();
    await loadFolders();
    renderFolders();
    await selectFolder(state.folders[0].id);
    setStatus('Respaldo restaurado con éxito ✓');
  }

  el.exportBtn.addEventListener('click', exportFullBackup);
  el.importBtn.addEventListener('click', () => el.importFileInput.click());
  el.importFileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if(f) importFullBackup(f);
    el.importFileInput.value = '';
  });

  // ==========================================================================
  // PAPELERA DE RECICLAJE
  // ==========================================================================
  function renderTrashList(){
    el.trashList.innerHTML = '';
    const trash = loadTrash();
    if(trash.length === 0){
      el.trashList.innerHTML = '<div class="empty-state"><p>La papelera está vacía.</p></div>';
      return;
    }
    trash.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'trash-item';

      const info = document.createElement('div');
      info.className = 'trash-item-info';

      const title = document.createElement('div');
      title.className = 'trash-item-title';
      title.textContent = item.docFolio ? `[${item.docFolio}] ${item.text.slice(0, 50)}...` : item.text.slice(0, 60);

      const meta = document.createElement('div');
      meta.className = 'trash-item-meta';
      meta.textContent = `Carpeta: ${item.folderName || 'General'} • Borrado el ${new Date(item.deletedAt).toLocaleDateString('es-ES')}`;

      info.appendChild(title);
      info.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'trash-item-actions';

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn btn-ghost';
      restoreBtn.textContent = 'Restaurar';
      restoreBtn.addEventListener('click', () => restoreTrashItem(idx));

      const delPermBtn = document.createElement('button');
      delPermBtn.className = 'btn btn-danger';
      delPermBtn.textContent = 'Eliminar';
      delPermBtn.addEventListener('click', () => deleteTrashItemPermanently(idx));

      actions.appendChild(restoreBtn);
      actions.appendChild(delPermBtn);

      row.appendChild(info);
      row.appendChild(actions);
      el.trashList.appendChild(row);
    });
  }

  async function restoreTrashItem(index){
    const trash = loadTrash();
    const [item] = trash.splice(index, 1);
    saveTrash(trash);

    let targetFolder = state.folders.find(f => f.id === item.folderId);
    if(!targetFolder) targetFolder = state.folders[0];

    const notes = await loadNotes(targetFolder.id);
    delete item.deletedAt;
    delete item.folderName;
    notes.unshift(item);
    await persistNotes(targetFolder.id, notes);

    renderTrashList();
    if(targetFolder.id === state.activeFolderId){
      state.notes = notes;
      renderNotesList();
    }
    setStatus('Documento restaurado ✓');
  }

  function deleteTrashItemPermanently(index){
    const trash = loadTrash();
    trash.splice(index, 1);
    saveTrash(trash);
    renderTrashList();
    setStatus('Documento eliminado definitivamente');
  }

  el.trashBtn.addEventListener('click', () => {
    renderTrashList();
    el.trashOverlay.classList.add('open');
  });
  el.trashCloseBtn.addEventListener('click', () => el.trashOverlay.classList.remove('open'));
  el.emptyTrashBtn.addEventListener('click', async () => {
    const ok = await askConfirm('¿Vaciar papelera?', 'Se eliminarán permanentemente todas las notas de la papelera.');
    if(!ok) return;
    saveTrash([]);
    renderTrashList();
    setStatus('Papelera vaciada');
  });

  // ==========================================================================
  // MODO CLARO / OSCURO
  // ==========================================================================
  function initTheme(){
    const saved = localStorage.getItem('theme');
    if(saved === 'dark'){
      document.body.classList.add('dark');
      el.themeIcon.textContent = '☀️';
      el.themeText.textContent = 'Modo claro';
    } else {
      document.body.classList.remove('dark');
      el.themeIcon.textContent = '🌙';
      el.themeText.textContent = 'Modo oscuro';
    }
  }

  el.themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    el.themeIcon.textContent = isDark ? '☀️' : '🌙';
    el.themeText.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
  });

  // ==========================================================================
  // NAVEGACIÓN Y VISTAS DE PESTAÑAS (ESCRIBIR, PLANIFICACIÓN, NOTAS)
  // ==========================================================================
  function setActiveTab(tabName){
    const isMobile = window.innerWidth <= 860;

    if(el.tabEditorBtn) el.tabEditorBtn.classList.toggle('active', tabName === 'editor');
    if(el.tabPlanBtn) el.tabPlanBtn.classList.toggle('active', tabName === 'plan');
    if(el.tabNotesBtn) el.tabNotesBtn.classList.toggle('active', tabName === 'notes');

    if(tabName === 'editor'){
      if(el.editorPane){
        el.editorPane.style.display = 'flex';
        el.editorPane.classList.remove('hidden-mobile');
      }
      if(el.planPane){
        el.planPane.style.display = 'none';
        el.planPane.classList.add('hidden-mobile');
      }
      if(el.notesPane){
        if(isMobile){
          el.notesPane.classList.add('hidden-mobile');
        } else {
          el.notesPane.style.display = 'flex';
          el.notesPane.classList.remove('hidden-mobile');
        }
      }
    } else if(tabName === 'plan'){
      if(el.editorPane){
        el.editorPane.style.display = 'none';
        el.editorPane.classList.add('hidden-mobile');
      }
      if(el.planPane){
        el.planPane.style.display = 'flex';
        el.planPane.classList.remove('hidden-mobile');
      }
      if(el.notesPane){
        if(isMobile){
          el.notesPane.classList.add('hidden-mobile');
        } else {
          el.notesPane.style.display = 'flex';
          el.notesPane.classList.remove('hidden-mobile');
        }
      }
    } else if(tabName === 'notes'){
      if(el.editorPane){
        if(isMobile){
          el.editorPane.style.display = 'none';
          el.editorPane.classList.add('hidden-mobile');
        } else {
          el.editorPane.style.display = 'flex';
          el.editorPane.classList.remove('hidden-mobile');
        }
      }
      if(el.planPane){
        el.planPane.style.display = 'none';
        el.planPane.classList.add('hidden-mobile');
      }
      if(el.notesPane){
        el.notesPane.style.display = 'flex';
        el.notesPane.classList.remove('hidden-mobile');
      }
    }
  }

  if(el.tabEditorBtn){
    el.tabEditorBtn.addEventListener('click', () => setActiveTab('editor'));
  }
  if(el.tabPlanBtn){
    el.tabPlanBtn.addEventListener('click', () => setActiveTab('plan'));
  }
  if(el.tabNotesBtn){
    el.tabNotesBtn.addEventListener('click', () => setActiveTab('notes'));
  }

  el.mobileNewNoteBtn.addEventListener('click', () => {
    setActiveTab('editor');
    el.editor.focus();
  });

  // Re-adjust display on window resize if crossing mobile breakpoint
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 860;
    if(!isMobile){
      if(el.tabPlanBtn && el.tabPlanBtn.classList.contains('active')){
        if(el.planPane) el.planPane.style.display = 'flex';
        if(el.editorPane) el.editorPane.style.display = 'none';
      } else {
        if(el.editorPane) el.editorPane.style.display = 'flex';
        if(el.planPane) el.planPane.style.display = 'none';
      }
      if(el.notesPane) el.notesPane.style.display = 'flex';
    }
  });

  // Editor Options Menu
  el.editorOptionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    el.editorOptionsMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => el.editorOptionsMenu.classList.remove('open'));
  el.editorOptionsMenu.addEventListener('click', (e) => e.stopPropagation());

  el.autoSaveCheckbox.addEventListener('change', () => {
    state.autoSave = el.autoSaveCheckbox.checked;
    el.autoSaveStatusLabel.textContent = state.autoSave ? 'Activado (guarda al escribir)' : 'Desactivado (guardado manual)';
    setStatus(state.autoSave ? 'Guardado automático activado' : 'Guardado automático desactivado');
  });

  // ==========================================================================
  // AUTENTICACIÓN Y SINCRONIZACIÓN EN LA NUBE (OPCIÓN A)
  // ==========================================================================
  function setupAuthHandlers(){
    // Open auth modal or dropdown
    if(el.userLoginTriggerBtn){
      el.userLoginTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(state.currentUser){
          // Toggle profile dropdown
          const isVisible = el.userProfileDropdown.style.display === 'block';
          el.userProfileDropdown.style.display = isVisible ? 'none' : 'block';
        } else {
          // Open Login Modal
          openAuthModal();
        }
      });
    }

    // Close profile dropdown when clicking outside
    document.addEventListener('click', () => {
      if(el.userProfileDropdown) el.userProfileDropdown.style.display = 'none';
    });
    if(el.userProfileDropdown){
      el.userProfileDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Auth modal controls
    if(el.authModalCloseX) el.authModalCloseX.addEventListener('click', closeAuthModal);
    if(el.authModalCloseBtn) el.authModalCloseBtn.addEventListener('click', closeAuthModal);
    if(el.authModalOverlay) {
      el.authModalOverlay.addEventListener('click', (e) => {
        if(e.target === el.authModalOverlay) closeAuthModal();
      });
    }

    // Toggle Sign In vs Register Mode
    if(el.authToggleModeBtn){
      el.authToggleModeBtn.addEventListener('click', () => {
        state.isRegisterMode = !state.isRegisterMode;
        if(state.isRegisterMode){
          el.authNameGroup.style.display = 'block';
          el.emailAuthSubmitBtn.textContent = 'Registrarse y Conectar';
          el.authTogglePrompt.textContent = '¿Ya tienes una cuenta?';
          el.authToggleModeBtn.textContent = 'Iniciar sesión';
        } else {
          el.authNameGroup.style.display = 'none';
          el.emailAuthSubmitBtn.textContent = 'Iniciar Sesión';
          el.authTogglePrompt.textContent = '¿No tienes cuenta?';
          el.authToggleModeBtn.textContent = 'Crear una cuenta nueva';
        }
        if(el.authErrorMsg) el.authErrorMsg.style.display = 'none';
      });
    }

    // Google Sign-In
    if(el.googleAuthBtn){
      el.googleAuthBtn.addEventListener('click', async () => {
        try {
          if(el.authErrorMsg) el.authErrorMsg.style.display = 'none';
          el.googleAuthBtn.disabled = true;
          el.googleAuthBtn.textContent = 'Iniciando sesión con Google...';
          const { user, domainInfo } = await loginWithGoogle();
          closeAuthModal();
          handleAuthSuccess(user, domainInfo);
        } catch(err){
          console.error(err);
          if(el.authErrorMsg){
            el.authErrorMsg.textContent = 'No se pudo iniciar sesión con Google. Revisa tu conexión o ventana emergente.';
            el.authErrorMsg.style.display = 'block';
          }
        } finally {
          if(el.googleAuthBtn){
            el.googleAuthBtn.disabled = false;
            el.googleAuthBtn.innerHTML = `
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuar con Google</span>
            `;
          }
        }
      });
    }

    // Email/Password Form Submit
    if(el.emailAuthForm){
      el.emailAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = el.authEmailInput.value.trim();
        const pass = el.authPasswordInput.value;
        const name = el.authNameInput ? el.authNameInput.value.trim() : '';

        if(!email || !pass) return;

        try {
          if(el.authErrorMsg) el.authErrorMsg.style.display = 'none';
          el.emailAuthSubmitBtn.disabled = true;
          el.emailAuthSubmitBtn.textContent = 'Procesando...';

          let user;
          const domainInfo = analyzeEmailDomain(email);

          if(state.isRegisterMode){
            const res = await registerWithEmail(email, pass, name);
            user = res.user;
          } else {
            user = await loginWithEmail(email, pass);
          }

          closeAuthModal();
          handleAuthSuccess(user, domainInfo);
        } catch(err){
          console.error(err);
          let message = 'Ocurrió un error. Verifica tus credenciales.';
          if(err.code === 'auth/email-already-in-use') message = 'Este correo ya está registrado. Por favor inicia sesión.';
          if(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') message = 'Contraseña o correo incorrectos.';
          if(err.code === 'auth/user-not-found') message = 'No existe una cuenta con este correo.';
          if(err.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres.';
          if(el.authErrorMsg){
            el.authErrorMsg.textContent = message;
            el.authErrorMsg.style.display = 'block';
          }
        } finally {
          if(el.emailAuthSubmitBtn){
            el.emailAuthSubmitBtn.disabled = false;
            el.emailAuthSubmitBtn.textContent = state.isRegisterMode ? 'Registrarse y Conectar' : 'Iniciar Sesión';
          }
        }
      });
    }

    // Log Out
    if(el.userLogoutBtn){
      el.userLogoutBtn.addEventListener('click', async () => {
        try {
          await logoutUser();
          state.currentUser = null;
          if(el.userProfileDropdown) el.userProfileDropdown.style.display = 'none';
          updateUserAuthUI(null);
          setStatus('Has cerrado sesión (Modo local)');
        } catch(err){
          console.error('Error logging out:', err);
        }
      });
    }

    // Observe Firebase Auth State
    if(auth){
      onAuthStateChanged(auth, async (user) => {
        if(user){
          const domainInfo = analyzeEmailDomain(user.email);
          state.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL,
            accountType: domainInfo.isInstitutional ? 'institutional' : 'personal',
            orgDomain: domainInfo.domain,
            orgName: domainInfo.orgName
          };
          updateUserAuthUI(state.currentUser);
          
          // Re-load and sync notes for active folder
          await loadNotes(state.activeFolderId);
          renderNotesList();
        } else {
          state.currentUser = null;
          updateUserAuthUI(null);
        }
      });
    }
  }

  function openAuthModal(){
    if(el.authModalOverlay){
      if(el.authErrorMsg) el.authErrorMsg.style.display = 'none';
      el.authModalOverlay.classList.add('open');
      if(el.authEmailInput) el.authEmailInput.focus();
    }
  }

  function closeAuthModal(){
    if(el.authModalOverlay){
      el.authModalOverlay.classList.remove('open');
    }
  }

  async function handleAuthSuccess(user, domainInfo){
    state.currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL,
      accountType: domainInfo.isInstitutional ? 'institutional' : 'personal',
      orgDomain: domainInfo.domain,
      orgName: domainInfo.orgName
    };
    updateUserAuthUI(state.currentUser);

    // Auto-switch workspace based on account domain
    if(domainInfo.isInstitutional){
      if(state.workspace !== WORKSPACES.ENTERPRISE){
        await switchWorkspace(WORKSPACES.ENTERPRISE);
      }
      setStatus(`¡Bienvenido! Espacio Institucional (${domainInfo.orgName}) conectado ✓`);
    } else {
      if(state.workspace !== WORKSPACES.PERSONAL){
        await switchWorkspace(WORKSPACES.PERSONAL);
      }
      setStatus(`¡Bienvenido ${state.currentUser.displayName}! Cuenta personal conectada ✓`);
    }

    // Refresh active notes
    await loadNotes(state.activeFolderId);
    renderNotesList();
  }

  function updateUserAuthUI(user){
    if(!el.userLoginTriggerBtn) return;

    if(user){
      el.userLoginTriggerBtn.classList.add('logged-in');
      const isInst = user.accountType === 'institutional';
      const shortName = (user.displayName || user.email.split('@')[0]).split(' ')[0];
      
      el.userAuthLabel.textContent = isInst ? `🏢 ${shortName}` : `👤 ${shortName}`;
      
      if(el.userDisplayName) el.userDisplayName.textContent = user.displayName || user.email;
      if(el.userEmail) el.userEmail.textContent = user.email;
      
      if(el.userAvatar){
        if(user.photoURL){
          el.userAvatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar" referrerpolicy="no-referrer">`;
        } else {
          el.userAvatar.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
        }
      }

      if(el.userAccountBadge){
        el.userAccountBadge.textContent = isInst ? `Institucional (${user.orgName || 'Empresa'})` : 'Personal';
        el.userAccountBadge.className = 'user-badge ' + (isInst ? 'badge-institutional' : 'badge-personal');
      }

      if(el.syncStatusText) el.syncStatusText.textContent = 'Sincronizado en la nube (Firestore)';
    } else {
      el.userLoginTriggerBtn.classList.remove('logged-in');
      el.userAuthLabel.textContent = 'Iniciar sesión';
      if(el.userAvatar) el.userAvatar.textContent = '👤';
      if(el.userDisplayName) el.userDisplayName.textContent = 'Invitado';
      if(el.userEmail) el.userEmail.textContent = 'Modo local';
      if(el.userAccountBadge){
        el.userAccountBadge.textContent = 'Local';
        el.userAccountBadge.className = 'user-badge badge-personal';
      }
    }
  }

  // ==========================================================================
  // INICIALIZACIÓN DE LA APLICACIÓN
  // ==========================================================================
  async function initApp(){
    initTheme();
    loadLetterheadConfig();
    loadTeamMembers();
    setupAuthHandlers();
    updateWorkspaceUI();
    await loadFolders();
    renderFolders();
    await selectFolder(state.activeFolderId);
    updateTrashBadge();
  }

  // Ejecutar al cargar
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
