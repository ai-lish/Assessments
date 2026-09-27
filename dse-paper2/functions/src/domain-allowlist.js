// dse-paper2/functions/src/domain-allowlist.js
// Exact domain allowlist. Lowercased. "gmail.com" is intentionally absent — this is
// a school-domain allowlist, not a public login.
//
// Production: load from env ALLOWED_SCHOOL_DOMAINS (comma-separated).
// Emulator/Tests: pass domains directly.

function getAllowedDomains() {
  const raw = process.env.ALLOWED_SCHOOL_DOMAINS || '';
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

function isAllowedDomain(email, allowed) {
  if (typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  const list = Array.isArray(allowed) ? allowed : getAllowedDomains();
  return list.includes(domain);
}

function assertAllowedDomain(email) {
  if (!isAllowedDomain(email)) {
    const e = new Error('Email domain not in school allowlist');
    e.code = 'domain-not-allowed';
    throw e;
  }
}

module.exports = { getAllowedDomains, isAllowedDomain, assertAllowedDomain };
