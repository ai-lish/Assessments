// dse-paper2/js/config.js
// Public Firebase web config. By Firebase design this is NOT a secret —
// real security is enforced by Auth, Security Rules, and Cloud Functions.
//
// Replace these PLACEHOLDER values with the public web config from the
// Firebase console: Project settings → Your apps → SDK setup → Config.
//
// In the Firebase Emulator, set USE_EMULATOR = true; this connects the
// browser SDK to the local emulator suite.

export const USE_EMULATOR = true; // set false in production

export const firebaseConfig = {
  apiKey: 'REPLACE_ME_API_KEY',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'demo-dse-paper2',
  appId: 'REPLACE_ME_APP_ID',
};

export const EMULATOR_HOSTS = {
  auth: 'http://127.0.0.1:9099',
  functions: 'http://127.0.0.1:5001',
  firestore: 'http://127.0.0.1:8080',
};

// Phase 1A: only this releaseId is enabled in the synthetic fixture.
export const PHASE1A_RELEASE_ID = 'rel_dse_p2_phase1a_indices_v1';

export function isConfigFilled() {
  return (
    typeof firebaseConfig.apiKey === 'string'
    && !firebaseConfig.apiKey.startsWith('REPLACE_ME_')
    && typeof firebaseConfig.appId === 'string'
    && !firebaseConfig.appId.startsWith('REPLACE_ME_')
  );
}
