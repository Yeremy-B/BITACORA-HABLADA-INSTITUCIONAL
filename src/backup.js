import { state, uid, getFoldersKey, getNotesKey, setStatus, askConfirm } from './state.js';
import { WORKSPACES } from './constants.js';
import { el } from './dom.js';

export async function exportFullBackup(loadNotesFn) {
  setStatus('Generando respaldo institucional...');
  const backup = {
    app: 'BH Enterprise',
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
  try { pFolders = JSON.parse(localStorage.getItem(pKey) || '[]'); } catch (e) {}
  for (const f of pFolders) {
    const notes = await loadNotesFn(f.id, WORKSPACES.PERSONAL);
    backup.personalFolders.push({ folder: f, notes });
  }

  // Export Enterprise Folders
  const eKey = getFoldersKey(WORKSPACES.ENTERPRISE);
  let eFolders = [];
  try { eFolders = JSON.parse(localStorage.getItem(eKey) || '[]'); } catch (e) {}
  for (const f of eFolders) {
    const notes = await loadNotesFn(f.id, WORKSPACES.ENTERPRISE);
    backup.enterpriseFolders.push({ folder: f, notes });
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bh-enterprise-respaldo-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  setStatus('Respaldo descargado ✓');
}

export async function importFullBackup(file, callbacks = {}) {
  setStatus('Leyendo archivo de respaldo...');
  let data;
  try {
    const raw = await file.text();
    data = JSON.parse(raw);
  } catch (e) {
    setStatus('Archivo JSON inválido.', true);
    return;
  }

  const ok = await askConfirm(
    'Importar respaldo',
    'Se restaurarán las carpetas, reportes, notas, configuración institucional y miembros del equipo.'
  );
  if (!ok) return;

  if (data.letterhead) localStorage.setItem('letterhead_config', JSON.stringify(data.letterhead));
  if (data.teamMembers) localStorage.setItem('team_members', JSON.stringify(data.teamMembers));

  // Handle v2.5 backup
  if (data.personalFolders || data.enterpriseFolders) {
    if (Array.isArray(data.personalFolders)) {
      const pFolders = data.personalFolders.map(pf => pf.folder);
      localStorage.setItem(getFoldersKey(WORKSPACES.PERSONAL), JSON.stringify(pFolders));
      for (const pf of data.personalFolders) {
        if (pf.folder && pf.notes) {
          localStorage.setItem(getNotesKey(pf.folder.id, WORKSPACES.PERSONAL), JSON.stringify(pf.notes));
        }
      }
    }
    if (Array.isArray(data.enterpriseFolders)) {
      const eFolders = data.enterpriseFolders.map(ef => ef.folder);
      localStorage.setItem(getFoldersKey(WORKSPACES.ENTERPRISE), JSON.stringify(eFolders));
      for (const ef of data.enterpriseFolders) {
        if (ef.folder && ef.notes) {
          localStorage.setItem(getNotesKey(ef.folder.id, WORKSPACES.ENTERPRISE), JSON.stringify(ef.notes));
        }
      }
    }
  } else if (Array.isArray(data.folders)) {
    // Legacy v1 backup compatibility
    const newFolders = [];
    for (const fData of data.folders) {
      const f = { id: uid(), name: fData.name || 'Importada', createdAt: Date.now() };
      newFolders.push(f);
      const notes = (fData.notes || []).map(n => ({ ...n, id: uid() }));
      localStorage.setItem(getNotesKey(f.id, state.workspace), JSON.stringify(notes));
    }
    localStorage.setItem(getFoldersKey(), JSON.stringify(newFolders));
  }

  if (callbacks.onRestoreComplete) {
    await callbacks.onRestoreComplete();
  }
  setStatus('Respaldo restaurado con éxito ✓');
}

export function initBackupListeners(loadNotesFn, callbacks = {}) {
  if (el.exportBtn) {
    el.exportBtn.addEventListener('click', () => exportFullBackup(loadNotesFn));
  }
  if (el.importBtn && el.importFileInput) {
    el.importBtn.addEventListener('click', () => el.importFileInput.click());
    el.importFileInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) importFullBackup(f, callbacks);
      el.importFileInput.value = '';
    });
  }
}
