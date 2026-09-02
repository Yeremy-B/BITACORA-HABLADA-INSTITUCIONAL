import { state, getTrashKey, setStatus, askConfirm } from './state.js';
import { WORKSPACES } from './constants.js';
import { el } from './dom.js';

export function loadTrash() {
  try {
    const raw = localStorage.getItem(getTrashKey());
    if (raw) return JSON.parse(raw);
    if (state.workspace === WORKSPACES.PERSONAL) {
      const leg = localStorage.getItem('trash');
      if (leg) return JSON.parse(leg);
    }
  } catch (e) {
    console.warn('Error loading trash:', e);
  }
  return [];
}

export function saveTrash(trash) {
  localStorage.setItem(getTrashKey(), JSON.stringify(trash));
  updateTrashBadge();
}

export function updateTrashBadge() {
  const trash = loadTrash();
  if (el.trashCount) {
    el.trashCount.textContent = trash.length ? `(${trash.length})` : '';
  }
}

export function renderTrashList(callbacks = {}) {
  if (!el.trashList) return;
  el.trashList.innerHTML = '';
  const trash = loadTrash();
  if (trash.length === 0) {
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
    restoreBtn.addEventListener('click', () => restoreTrashItem(idx, callbacks));

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

export async function restoreTrashItem(index, callbacks = {}) {
  const trash = loadTrash();
  const [item] = trash.splice(index, 1);
  saveTrash(trash);

  let targetFolder = state.folders.find(f => f.id === item.folderId);
  if (!targetFolder) targetFolder = state.folders[0];

  if (callbacks.onRestore) {
    await callbacks.onRestore(targetFolder, item);
  }

  renderTrashList(callbacks);
  setStatus('Documento restaurado ✓');
}

export function deleteTrashItemPermanently(index) {
  const trash = loadTrash();
  trash.splice(index, 1);
  saveTrash(trash);
  renderTrashList();
  setStatus('Documento eliminado definitivamente');
}

export function initTrashListeners(callbacks = {}) {
  if (el.trashBtn) {
    el.trashBtn.addEventListener('click', () => {
      if (el.settingsOverlay) el.settingsOverlay.classList.remove('open');
      renderTrashList(callbacks);
      el.trashOverlay.classList.add('open');
    });
  }

  if (el.trashCloseBtn) {
    el.trashCloseBtn.addEventListener('click', () => {
      el.trashOverlay.classList.remove('open');
      if (el.settingsOverlay) el.settingsOverlay.classList.add('open');
    });
  }

  if (el.emptyTrashBtn) {
    el.emptyTrashBtn.addEventListener('click', async () => {
      const ok = await askConfirm('¿Vaciar papelera?', 'Se eliminarán permanentemente todas las notas de la papelera.');
      if (!ok) return;
      saveTrash([]);
      renderTrashList(callbacks);
      setStatus('Papelera vaciada');
    });
  }
}
