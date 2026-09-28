// dse-paper2/js/firebase-init.js
// Initialize the modular Firebase SDK via CDN. No build step.
// In emulator mode, connect Auth + Functions to local emulator endpoints.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFunctions, connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js';

import { firebaseConfig, USE_EMULATOR, EMULATOR_HOSTS } from './config.js';

let app = null;
let auth = null;
let functions = null;

export function getFirebaseApp() {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getAuthInstance() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (USE_EMULATOR) {
      try {
        connectAuthEmulator(auth, EMULATOR_HOSTS.auth, { disableWarnings: true });
      } catch (e) {
        console.warn('connectAuthEmulator failed', e);
      }
    }
  }
  return auth;
}

export function getFunctionsInstance() {
  if (!functions) {
    functions = getFunctions(getFirebaseApp());
    if (USE_EMULATOR) {
      try {
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      } catch (e) {
        console.warn('connectFunctionsEmulator failed', e);
      }
    }
  }
  return functions;
}
