// dse-paper2/js/auth.js
// Wrapper around Firebase Auth (Google provider) with emulator-friendly behavior.

import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getAuthInstance } from './firebase-init.js';

export function watchAuth(callback) {
  return onAuthStateChanged(getAuthInstance(), (user) => {
    callback({
      signedIn: !!user,
      uid: user?.uid || null,
      email: user?.email || null,
      emailVerified: !!user?.emailVerified,
    });
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(getAuthInstance(), provider);
}

export async function signOutCurrent() {
  return signOut(getAuthInstance());
}
