// dse-paper2/functions/src/hash.js
// SHA-256 over UTF-8 bytes. Used for requestHash and package hashes.

const crypto = require('crypto');

function sha256Utf8(input) {
  if (typeof input !== 'string') {
    throw new TypeError('sha256Utf8: input must be a string');
  }
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function requestHash(req) {
  const { canonicalRequestJson } = require('./canonical-json');
  return sha256Utf8(canonicalRequestJson(req));
}

module.exports = { sha256Utf8, requestHash };
