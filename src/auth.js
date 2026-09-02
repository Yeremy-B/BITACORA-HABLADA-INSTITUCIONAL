import { state, setStatus } from './state.js';
import { WORKSPACES } from './constants.js';
import { el } from './dom.js';
import { 
  auth, 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  onAuthStateChanged, 
  analyzeEmailDomain 
} from './firebase.js';

export function setupAuthHandlers(callbacks = {}) {
  // Open auth modal
  if (el.userLoginTriggerBtn) {
    el.userLoginTriggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAuthModal();
    });
  }

  // Close profile dropdown when clicking outside
  document.addEventListener('click', () => {
    if (el.userProfileDropdown) el.userProfileDropdown.style.display = 'none';
  });
  if (el.userProfileDropdown) {
    el.userProfileDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  // Auth modal controls
  if (el.authModalCloseX) el.authModalCloseX.addEventListener('click', closeAuthModal);
  if (el.authModalCloseBtn) el.authModalCloseBtn.addEventListener('click', closeAuthModal);
  if (el.authModalOverlay) {
    el.authModalOverlay.addEventListener('click', (e) => {
      if (e.target === el.authModalOverlay) closeAuthModal();
    });
  }

  // Toggle Sign In vs Register Mode
  if (el.authToggleModeBtn) {
    el.authToggleModeBtn.addEventListener('click', () => {
      state.isRegisterMode = !state.isRegisterMode;
      if (state.isRegisterMode) {
        if (el.authNameGroup) el.authNameGroup.style.display = 'block';
        if (el.emailAuthSubmitBtn) el.emailAuthSubmitBtn.textContent = 'Registrarse y Conectar';
        if (el.authTogglePrompt) el.authTogglePrompt.textContent = '¿Ya tienes una cuenta?';
        if (el.authToggleModeBtn) el.authToggleModeBtn.textContent = 'Iniciar sesión';
      } else {
        if (el.authNameGroup) el.authNameGroup.style.display = 'none';
        if (el.emailAuthSubmitBtn) el.emailAuthSubmitBtn.textContent = 'Iniciar Sesión';
        if (el.authTogglePrompt) el.authTogglePrompt.textContent = '¿No tienes cuenta?';
        if (el.authToggleModeBtn) el.authToggleModeBtn.textContent = 'Crear una cuenta nueva';
      }
      if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';
    });
  }

  // Google Sign-In
  if (el.googleAuthBtn) {
    el.googleAuthBtn.addEventListener('click', async () => {
      try {
        if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';
        el.googleAuthBtn.disabled = true;
        el.googleAuthBtn.textContent = 'Iniciando sesión con Google...';
        const { user, domainInfo } = await loginWithGoogle();
        closeAuthModal();
        await handleAuthSuccess(user, domainInfo, callbacks);
      } catch (err) {
        console.error(err);
        if (el.authErrorMsg) {
          el.authErrorMsg.textContent = 'No se pudo iniciar sesión con Google. Revisa tu conexión o ventana emergente.';
          el.authErrorMsg.style.display = 'block';
        }
      } finally {
        if (el.googleAuthBtn) {
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
  if (el.emailAuthForm) {
    el.emailAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = el.authEmailInput ? el.authEmailInput.value.trim() : '';
      const pass = el.authPasswordInput ? el.authPasswordInput.value : '';
      const name = el.authNameInput ? el.authNameInput.value.trim() : '';

      if (!email || !pass) return;

      try {
        if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';
        if (el.emailAuthSubmitBtn) {
          el.emailAuthSubmitBtn.disabled = true;
          el.emailAuthSubmitBtn.textContent = 'Procesando...';
        }

        let user;
        const domainInfo = analyzeEmailDomain(email);

        if (state.isRegisterMode) {
          const res = await registerWithEmail(email, pass, name);
          user = res.user;
        } else {
          user = await loginWithEmail(email, pass);
        }

        closeAuthModal();
        await handleAuthSuccess(user, domainInfo, callbacks);
      } catch (err) {
        console.error(err);
        let message = 'Ocurrió un error. Verifica tus credenciales.';
        if (err.code === 'auth/email-already-in-use') message = 'Este correo ya está registrado. Por favor inicia sesión.';
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') message = 'Contraseña o correo incorrectos.';
        if (err.code === 'auth/user-not-found') message = 'No existe una cuenta con este correo.';
        if (err.code === 'auth/weak-password') message = 'La contraseña debe tener al menos 6 caracteres.';
        if (el.authErrorMsg) {
          el.authErrorMsg.textContent = message;
          el.authErrorMsg.style.display = 'block';
        }
      } finally {
        if (el.emailAuthSubmitBtn) {
          el.emailAuthSubmitBtn.disabled = false;
          el.emailAuthSubmitBtn.textContent = state.isRegisterMode ? 'Registrarse y Conectar' : 'Iniciar Sesión';
        }
      }
    });
  }

  // Log Out
  if (el.userLogoutBtn) {
    el.userLogoutBtn.addEventListener('click', async () => {
      try {
        await logoutUser();
        state.currentUser = null;
        if (el.userProfileDropdown) el.userProfileDropdown.style.display = 'none';
        updateUserAuthUI(null);
        if (callbacks.onAuthChange) await callbacks.onAuthChange(null);
        setStatus('Has cerrado sesión (Modo local)');
      } catch (err) {
        console.error('Error logging out:', err);
      }
    });
  }

  // Observe Firebase Auth State
  if (auth) {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
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
        if (callbacks.onAuthChange) await callbacks.onAuthChange(state.currentUser);
      } else {
        state.currentUser = null;
        updateUserAuthUI(null);
        if (callbacks.onAuthChange) await callbacks.onAuthChange(null);
      }
    });
  }
}

export function openAuthModal() {
  if (el.authModalOverlay) {
    if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';
    el.authModalOverlay.classList.add('open');
    if (el.authEmailInput) el.authEmailInput.focus();
  }
}

export function closeAuthModal() {
  if (el.authModalOverlay) {
    el.authModalOverlay.classList.remove('open');
  }
}

export async function handleAuthSuccess(user, domainInfo, callbacks = {}) {
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

  if (callbacks.onLogin) {
    await callbacks.onLogin(state.currentUser, domainInfo);
  }
}

export function updateUserAuthUI(user) {
  if (!el.userLoginTriggerBtn) return;

  if (user) {
    el.userLoginTriggerBtn.classList.add('logged-in');
    const isInst = user.accountType === 'institutional';
    const shortName = (user.displayName || user.email.split('@')[0]).split(' ')[0];

    if (el.userAuthLabel) el.userAuthLabel.textContent = isInst ? `🏢 ${shortName}` : `👤 ${shortName}`;
    if (el.userLogoutBtn) el.userLogoutBtn.style.display = 'inline-flex';

    if (el.userDisplayName) el.userDisplayName.textContent = user.displayName || user.email;
    if (el.userEmail) el.userEmail.textContent = user.email;

    if (el.userAvatar) {
      if (user.photoURL) {
        el.userAvatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar" referrerpolicy="no-referrer">`;
      } else {
        el.userAvatar.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
      }
    }

    if (el.userAccountBadge) {
      el.userAccountBadge.textContent = isInst ? `Institucional (${user.orgName || 'Empresa'})` : 'Personal';
      el.userAccountBadge.className = 'user-badge ' + (isInst ? 'badge-institutional' : 'badge-personal');
    }

    if (el.syncStatusText) el.syncStatusText.textContent = 'Sincronizado en la nube (Firestore)';
  } else {
    el.userLoginTriggerBtn.classList.remove('logged-in');
    if (el.userAuthLabel) el.userAuthLabel.textContent = 'Iniciar sesión';
    if (el.userLogoutBtn) el.userLogoutBtn.style.display = 'none';
    if (el.userAvatar) el.userAvatar.textContent = '👤';
    if (el.userDisplayName) el.userDisplayName.textContent = 'Invitado';
    if (el.userEmail) el.userEmail.textContent = 'Modo local';
    if (el.userAccountBadge) {
      el.userAccountBadge.textContent = 'Local';
      el.userAccountBadge.className = 'user-badge badge-personal';
    }
    if (el.syncStatusText) el.syncStatusText.textContent = 'Almacenamiento local (Navegador)';
  }
}
