// dse-paper2/functions/src/canonical-json.js
// Canonical JSON serialization for requestHash.
// Spec: keys emitted in fixed order, UTF-8 encoded.
// The "request" object has exactly these 4 keys in this order:
//   uid, sessionId, releaseId, selectedOptionId
// Any other keys (implicit additions) are FORBIDDEN.

const REQUEST_FIELDS = ['uid', 'sessionId', 'releaseId', 'selectedOptionId'];

function canonicalRequestJson(req) {
  if (!req || typeof req !== 'object') {
    throw new TypeError('canonicalRequestJson: req must be an object');
  }
  for (const k of Object.keys(req)) {
    if (!REQUEST_FIELDS.includes(k)) {
      throw new RangeError(`canonicalRequestJson: forbidden field "${k}"`);
    }
  }
  for (const k of REQUEST_FIELDS) {
    if (!(k in req)) {
      throw new RangeError(`canonicalRequestJson: missing field "${k}"`);
    }
    if (typeof req[k] !== 'string') {
      throw new TypeError(`canonicalRequestJson: field "${k}" must be a string`);
    }
  }
  // Fixed key order; emit no whitespace; UTF-8.
  return JSON.stringify({
    uid: req.uid,
    sessionId: req.sessionId,
    releaseId: req.releaseId,
    selectedOptionId: req.selectedOptionId,
  });
}

module.exports = { canonicalRequestJson, REQUEST_FIELDS };
