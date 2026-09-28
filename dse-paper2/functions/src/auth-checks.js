// dse-paper2/functions/src/auth-checks.js
// Authentication primitives. In emulator/CI: pass a synthetic decoded token.
// In production: callables supply context.auth with the verified token.

function requireAuth(context) {
  if (!context || !context.auth || !context.auth.uid) {
    const e = new Error('Unauthenticated');
    e.code = 'unauthenticated';
    throw e;
  }
  return context.auth;
}

function requireEmailVerified(context) {
  const auth = requireAuth(context);
  if (auth.token?.email_verified !== true) {
    const e = new Error('Email not verified');
    e.code = 'email-not-verified';
    throw e;
  }
  return auth;
}

module.exports = { requireAuth, requireEmailVerified };
