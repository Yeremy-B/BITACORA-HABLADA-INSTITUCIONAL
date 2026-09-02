import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
 * Detect if an email belongs to an institutional/workspace domain or personal
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
  const personalDomains = [
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 
    'live.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 
    'proton.me', 'protonmail.com', 'aol.com', 'zoho.com', 'mail.com'
  ];

  const isPersonal = personalDomains.includes(domain);
  const isInstitutional = !isPersonal;

  // Derive human-readable Org Name from domain (e.g. mineduc.cl -> Mineduc, corporacion.org -> Corporacion)
  const mainPart = domain.split('.')[0] || domain;
  const orgName = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);

  return {
    isInstitutional,
    domain,
    orgName: isInstitutional ? orgName : 'Personal'
  };
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
 * Register with Email / Password
 */
export async function registerWithEmail(email, password, displayName) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    if (displayName) {
      await updateProfile(user, { displayName });
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

