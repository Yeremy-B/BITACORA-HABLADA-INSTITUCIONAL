import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

/**
 * List of known public webmail providers (definitely personal)
 */
const PUBLIC_WEBMAIL_PROVIDERS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 
  'live.com', 'msn.com', 'yahoo.com', 'yahoo.es', 'yahoo.cl', 'yahoo.com.ar', 'yahoo.com.mx',
  'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 
  'aol.com', 'zoho.com', 'mail.com', 'gmx.com', 'gmx.net', 'gmx.es',
  'yandex.com', 'yandex.ru', 'tutanota.com', 'tuta.com', 'fastmail.com'
];

/**
 * Detect if an email belongs to an institutional/workspace domain or personal.
 * Inverts the logic: require recognized institutional TLDs or explicit enterprise config,
 * preventing any random webmail from inheriting an institutional workspace.
 */
export function analyzeEmailDomain(email) {
  if (!email || typeof email !== 'string') {
    return { isInstitutional: false, domain: '', orgName: 'Personal' };
  }

  const parts = email.toLowerCase().trim().split('@');
  if (parts.length < 2) {
    return { isInstitutional: false, domain: '', orgName: 'Personal' };
  }

  const domain = parts[1];
  const isWebmail = PUBLIC_WEBMAIL_PROVIDERS.includes(domain);

  // Check institutional signals: recognized official TLDs (.gob., .gov., .edu., .org., .ac., .mil., or verified corporate domains)
  const isInstitutionalTld = /\.(gob|gov|edu|org|ac|mil|gva|cl|mx|ar|co|pe|es)(\.[a-z]{2})?$/.test(domain) && !isWebmail;
  const isExplicitCustomCorp = !isWebmail && domain.includes('.') && !domain.endsWith('.com.invalid');

  // Inverted check: must NOT be webmail AND must fulfill institutional requirements
  const isInstitutional = !isWebmail && (isInstitutionalTld || isExplicitCustomCorp);

  // Derive human-readable Org Name from domain
  const mainPart = domain.split('.')[0] || domain;
  const orgName = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);

  return {
    isInstitutional,
    domain,
    orgName: isInstitutional ? orgName : 'Personal'
  };
}

/**
 * Send email verification to current user
 */
export async function sendVerificationEmailToUser(user = auth.currentUser) {
  if (!user) throw new Error('No hay usuario autenticado');
  await sendEmailVerification(user);
}

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const domainInfo = analyzeEmailDomain(user.email);

    // Save/Update user profile in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || '',
      accountType: domainInfo.isInstitutional ? 'institutional' : 'personal',
      orgDomain: domainInfo.domain,
      orgName: domainInfo.orgName,
      lastLogin: serverTimestamp()
    }, { merge: true });

    return { user, domainInfo };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Email / Password
 */
export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
}

/**
 * Register with Email / Password and send verification email
 */
export async function registerWithEmail(email, password, displayName) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Send verification email
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Could not send email verification automatically:', e);
    }

    const domainInfo = analyzeEmailDomain(email);
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.email.split('@')[0],
      photoURL: '',
      accountType: domainInfo.isInstitutional ? 'institutional' : 'personal',
      orgDomain: domainInfo.domain,
      orgName: domainInfo.orgName,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    }, { merge: true });

    return { user, domainInfo };
  } catch (error) {
    console.error('Error registering with email:', error);
    throw error;
  }
}

/**
 * Sign Out
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Standard Firestore Error Handler
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      providerInfo: auth.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export { 
  onAuthStateChanged,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
};

