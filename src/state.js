import { WORKSPACES, DEFAULT_LETTERHEAD } from './constants.js';
import { el } from './dom.js';

export const state = {
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

export const notesCache = {};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Storage keys helpers
export function getFoldersKey(ws = state.workspace) {
  return ws === WORKSPACES.ENTERPRISE ? 'folders_enterprise' : 'folders_personal';
}

export function getActiveFolderKey(ws = state.workspace) {
  return ws === WORKSPACES.ENTERPRISE ? 'active_folder_enterprise' : 'active_folder_personal';
}

export function getNotesKey(folderId, ws = state.workspace) {
  return `notes_${ws}:${folderId}`;
}

export function getDraftKey(folderId, ws = state.workspace) {
  return `draft_${ws}:${folderId}`;
}

export function getTrashKey(ws = state.workspace) {
  return `trash_${ws}`;
}

// Status message helper
export function setStatus(msg, isError = false) {
  if (!el.statusLine) return;
  el.statusLine.textContent = msg || '';
  el.statusLine.style.color = isError ? '#DC2626' : '';
  if (msg) {
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => {
      if (el.statusLine) el.statusLine.textContent = '';
    }, 3500);
  }
}

// Modal confirmation helper
let modalResolver = null;
export function askConfirm(title, text) {
  if (!el.modalOverlay) return Promise.resolve(true);
  el.modalTitle.textContent = title;
  el.modalText.textContent = text;
  el.modalOverlay.classList.add('open');
  return new Promise((resolve) => {
    modalResolver = resolve;
  });
}

export function initModalListeners() {
  if (el.modalCancel) {
    el.modalCancel.addEventListener('click', () => closeModal(false));
  }
  if (el.modalConfirm) {
    el.modalConfirm.addEventListener('click', () => closeModal(true));
  }
  if (el.modalOverlay) {
    el.modalOverlay.addEventListener('click', (e) => {
      if (e.target === el.modalOverlay) closeModal(false);
    });
  }
}

function closeModal(result) {
  if (el.modalOverlay) el.modalOverlay.classList.remove('open');
  if (modalResolver) {
    modalResolver(result);
    modalResolver = null;
  }
}
