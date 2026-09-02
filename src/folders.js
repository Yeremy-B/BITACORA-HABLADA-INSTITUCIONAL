import { state, uid, getFoldersKey, getActiveFolderKey, setStatus, askConfirm } from './state.js';
import { WORKSPACES, DEFAULT_PERSONAL_FOLDERS, DEFAULT_ENTERPRISE_FOLDERS } from './constants.js';
import { el } from './dom.js';

export async function loadFolders(callbacks = {}) {
  const key = getFoldersKey();
  let folders = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) folders = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading folders from localStorage:', e);
  }

  // Backward compatibility
  if ((!folders || folders.length === 0) && state.workspace === WORKSPACES.PERSONAL) {
    try {
      const legacy = localStorage.getItem('folders');
      if (legacy) folders = JSON.parse(legacy);
    } catch (e) {}
  }

  // Defaults if empty
  if (!folders || folders.length === 0) {
    const defaults = state.workspace === WORKSPACES.ENTERPRISE ? DEFAULT_ENTERPRISE_FOLDERS : DEFAULT_PERSONAL_FOLDERS;
    folders = defaults.map((d, i) => ({
      id: uid(),
      name: d.name,
      code: d.code || null,
      color: d.color || null,
      createdAt: Date.now() + i
    }));
    await persistFolders(folders);
  }

  state.folders = folders;
  const savedActive = localStorage.getItem(getActiveFolderKey());
  const found = state.folders.find(f => f.id === savedActive);
  state.activeFolderId = found ? found.id : state.folders[0].id;
  localStorage.setItem(getActiveFolderKey(), state.activeFolderId);
}

export async function persistFolders(folders = state.folders) {
  const key = getFoldersKey();
  localStorage.setItem(key, JSON.stringify(folders));
}

export function updateWorkspaceUI() {
  const isEnterprise = state.workspace === WORKSPACES.ENTERPRISE;

  if (el.wsPersonalBtn) el.wsPersonalBtn.classList.toggle('active', !isEnterprise);
  if (el.wsEnterpriseBtn) el.wsEnterpriseBtn.classList.toggle('active', isEnterprise);

  if (el.sidebarWorkspaceBadge) {
    el.sidebarWorkspaceBadge.textContent = isEnterprise ? 'MODO EMPRESARIAL / INSTITUCIONAL' : 'MODO PERSONAL / PRIVADO';
    el.sidebarWorkspaceBadge.className = 'workspace-badge ' + (isEnterprise ? 'enterprise' : 'personal');
  }

  if (el.topbarWorkspaceTag) {
    el.topbarWorkspaceTag.textContent = isEnterprise ? 'CORPORATIVO' : 'PERSONAL';
    el.topbarWorkspaceTag.className = 'workspace-tag ' + (isEnterprise ? 'enterprise' : 'personal');
  }

  if (el.foldersSectionLabel) {
    el.foldersSectionLabel.textContent = isEnterprise ? 'DEPARTAMENTOS / ÁREAS' : 'CARPETAS PERSONALES';
  }

  if (el.folderEyebrow) {
    el.folderEyebrow.textContent = isEnterprise ? 'DEPARTAMENTO ACTIVO' : 'CARPETA ACTIVA';
  }

  if (el.notesPaneTitle) {
    el.notesPaneTitle.textContent = isEnterprise ? 'Expedientes & Reportes' : 'Notas Guardadas';
  }

  if (el.tabNotesLabel) {
    el.tabNotesLabel.textContent = isEnterprise ? 'Reportes' : 'Notas';
  }

  if (el.searchGlobalLabel) {
    el.searchGlobalLabel.textContent = isEnterprise ? 'Buscar en todas las áreas' : 'Buscar en todas las carpetas';
  }

  if (el.metaDrawerToggleText) {
    el.metaDrawerToggleText.textContent = isEnterprise ? 'Metadatos Institucionales y Control de Tareas' : 'Detalles de la Nota';
  }

  // Show / Hide Enterprise features
  const entElements = [
    el.manageTeamBtn,
    el.letterheadConfigBtn,
    el.formalPrintBtn,
    el.quickPrintBtn,
    el.currentFolioBadge,
    el.enterpriseFiltersRow,
    el.formalPrintOptionRow,
    el.optionsMenuDivider
  ];

  entElements.forEach(item => {
    if (item) item.style.display = isEnterprise ? '' : 'none';
  });

  const entFormFields = [
    document.getElementById('docTypeGroup'),
    document.getElementById('folioGroup'),
    document.getElementById('taskAssigneeGroup'),
    document.getElementById('taskDueDateGroup'),
    document.getElementById('taskPriorityGroup'),
    document.getElementById('taskStatusGroup'),
    document.getElementById('docAttendeesGroup')
  ];
  entFormFields.forEach(group => {
    if (group) group.style.display = isEnterprise ? 'flex' : 'none';
  });
}

export async function switchWorkspace(ws, callbacks = {}) {
  if (state.workspace === ws) return;
  state.workspace = ws;
  localStorage.setItem('current_workspace', ws);
  updateWorkspaceUI();
  await loadFolders(callbacks);
  renderFolders(callbacks);
  if (callbacks.onFolderSelect) {
    await callbacks.onFolderSelect(state.activeFolderId);
  }
}

export function renderFolders(callbacks = {}) {
  if (!el.folderList) return;
  el.folderList.innerHTML = '';
  const isEnterprise = state.workspace === WORKSPACES.ENTERPRISE;

  state.folders.forEach(f => {
    const li = document.createElement('li');
    li.className = 'folder-item' + (f.id === state.activeFolderId ? ' active' : '');
    li.dataset.id = f.id;

    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    if (isEnterprise) {
      icon.textContent = '🏢';
      if (f.color) icon.style.color = f.color;
    } else {
      icon.textContent = '📁';
    }

    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = f.name;

    li.appendChild(icon);
    li.appendChild(name);

    // Delete folder button (allow delete if > 1 folder)
    if (state.folders.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'folder-del-btn';
      delBtn.type = 'button';
      delBtn.title = isEnterprise ? 'Eliminar departamento' : 'Eliminar carpeta';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const term = isEnterprise ? 'departamento' : 'carpeta';
        const ok = await askConfirm(
          `¿Eliminar ${term} "${f.name}"?`,
          `Se eliminará este ${term} y todas las notas asociadas se conservarán en respaldo local.`
        );
        if (!ok) return;
        await deleteFolder(f.id, callbacks);
      });
      li.appendChild(delBtn);
    }

    li.addEventListener('click', async () => {
      if (f.id === state.activeFolderId) return;
      if (callbacks.onFolderSelect) {
        await callbacks.onFolderSelect(f.id);
      }
    });

    el.folderList.appendChild(li);
  });

  const active = state.folders.find(f => f.id === state.activeFolderId);
  if (active && el.folderTitle) {
    el.folderTitle.textContent = active.name;
  }
}

export async function selectFolder(folderId, callbacks = {}) {
  state.activeFolderId = folderId;
  localStorage.setItem(getActiveFolderKey(), folderId);
  renderFolders(callbacks);
  if (callbacks.onFolderSelect) {
    await callbacks.onFolderSelect(folderId);
  }
}

export async function deleteFolder(folderId, callbacks = {}) {
  const idx = state.folders.findIndex(f => f.id === folderId);
  if (idx === -1) return;
  state.folders.splice(idx, 1);
  await persistFolders();

  if (state.activeFolderId === folderId) {
    state.activeFolderId = state.folders[0].id;
    localStorage.setItem(getActiveFolderKey(), state.activeFolderId);
  }

  renderFolders(callbacks);
  if (callbacks.onFolderSelect) {
    await callbacks.onFolderSelect(state.activeFolderId);
  }
  const term = state.workspace === WORKSPACES.ENTERPRISE ? 'Departamento' : 'Carpeta';
  setStatus(`${term} eliminada`);
}

export async function createNewFolder(name, callbacks = {}) {
  const cleanName = (name || '').trim();
  if (!cleanName) return;

  const newF = {
    id: uid(),
    name: cleanName,
    createdAt: Date.now()
  };
  state.folders.push(newF);
  await persistFolders();
  if (el.newFolderInput) el.newFolderInput.value = '';
  await selectFolder(newF.id, callbacks);
  const term = state.workspace === WORKSPACES.ENTERPRISE ? 'Departamento' : 'Carpeta';
  setStatus(`${term} "${newF.name}" creada ✓`);
}

export function initFolderListeners(callbacks = {}) {
  // Workspace buttons
  if (el.wsPersonalBtn) {
    el.wsPersonalBtn.addEventListener('click', () => switchWorkspace(WORKSPACES.PERSONAL, callbacks));
  }
  if (el.wsEnterpriseBtn) {
    el.wsEnterpriseBtn.addEventListener('click', () => switchWorkspace(WORKSPACES.ENTERPRISE, callbacks));
  }

  // Add folder form
  if (el.addFolderBtn && el.newFolderInput) {
    el.addFolderBtn.addEventListener('click', () => createNewFolder(el.newFolderInput.value, callbacks));
    el.newFolderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNewFolder(el.newFolderInput.value, callbacks);
      }
    });
  }

  // Sidebar toggle
  const toggleSidebar = () => {
    if (el.sidebar) el.sidebar.classList.toggle('open');
    if (el.sidebarBackdrop) el.sidebarBackdrop.classList.toggle('open');
  };
  const closeSidebar = () => {
    if (el.sidebar) el.sidebar.classList.remove('open');
    if (el.sidebarBackdrop) el.sidebarBackdrop.classList.remove('open');
  };

  if (el.hamburgerBtn) el.hamburgerBtn.addEventListener('click', toggleSidebar);
  if (el.sidebarCloseBtn) el.sidebarCloseBtn.addEventListener('click', closeSidebar);
  if (el.sidebarBackdrop) el.sidebarBackdrop.addEventListener('click', closeSidebar);
}
