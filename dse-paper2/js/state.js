// dse-paper2/js/state.js
// Tiny client-side state container for the attempt flow.

export function createClientState() {
  let _session = null;       // { sessionId, releaseId, expiresAt, renderSnapshot }
  let _selectedOptionId = null;
  let _idempotencyKey = null;
  let _startTime = null;

  return {
    begin(snapshot) {
      _session = snapshot;
      _selectedOptionId = null;
      _idempotencyKey = null;
      _startTime = Date.now();
    },
    selectOption(id) {
      _selectedOptionId = id;
    },
    getSelectedOptionId() {
      return _selectedOptionId;
    },
    getSession() {
      return _session;
    },
    setIdempotencyKey(k) {
      _idempotencyKey = k;
    },
    getIdempotencyKey() {
      if (!_idempotencyKey) throw new Error('idempotency key not initialized');
      return _idempotencyKey;
    },
    getDiagnosticDurationMs() {
      if (!_startTime) return null;
      return Date.now() - _startTime;
    },
    isExpired() {
      if (!_session || !_session.expiresAt) return false;
      return Date.parse(_session.expiresAt) <= Date.now();
    },
  };
}
