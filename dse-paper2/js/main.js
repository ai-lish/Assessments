// dse-paper2/js/main.js
// Entry point. Wires auth + createAttemptSession + submitAttempt + render.

import { USE_EMULATOR, PHASE1A_RELEASE_ID, isConfigFilled, EMULATOR_HOSTS } from './config.js';
import { watchAuth, signInWithGoogle } from './auth.js';
import { createAttemptSession, submitAttempt, makeIdempotencyKey } from './api-client.js';
import { renderPrompt, renderParameters, renderOptions, renderFeedback } from './render.js';
import { createClientState } from './state.js';
import { codeToMessage } from './errors.js';

const $ = (sel) => document.querySelector(sel);

const ui = {
  authSection: $('#auth-section'),
  authStatus: $('#auth-status'),
  authActions: $('#auth-actions'),
  authEmulator: $('#auth-emulator'),
  authConfigMissing: $('#auth-config-missing'),
  attemptSection: $('#attempt-section'),
  prompt: $('#prompt'),
  params: $('#params'),
  options: $('#options'),
  btnSubmit: $('#btn-submit'),
  btnGoogle: $('#btn-google-signin'),
  submitStatus: $('#submit-status'),
  feedback: $('#feedback'),
  feedbackContent: $('#feedback-content'),
  evaluationDetail: $('#evaluation-detail'),
  errorBanner: $('#error-banner'),
  errorMessage: $('#error-message'),
  errorTitle: $('#error-title'),
};

const state = createClientState();

function showError(code, message) {
  ui.errorBanner.hidden = false;
  ui.errorTitle.textContent = codeToMessage(code);
  ui.errorMessage.textContent = message ? `（${message}）` : '';
}
function clearError() {
  ui.errorBanner.hidden = true;
}

function showAuthEmulatorBadge() {
  if (USE_EMULATOR) ui.authEmulator.hidden = false;
}

function showConfigMissing() {
  if (!isConfigFilled()) ui.authConfigMissing.hidden = false;
}

function setSubmitEnabled(enabled) {
  ui.btnSubmit.disabled = !enabled;
}

async function startAttempt() {
  clearError();
  try {
    const result = await createAttemptSession({ releaseId: PHASE1A_RELEASE_ID });
    state.begin({
      sessionId: result.sessionId,
      releaseId: result.renderSnapshot.releaseId,
      expiresAt: result.expiresAt,
      renderSnapshot: result.renderSnapshot,
    });
    state.setIdempotencyKey(makeIdempotencyKey());
    ui.attemptSection.hidden = false;
    renderPrompt(ui.prompt, result.renderSnapshot);
    renderParameters(ui.params, result.renderSnapshot);
    renderOptions(ui.options, result.renderSnapshot, (id) => {
      state.selectOption(id);
      setSubmitEnabled(true);
    });
    ui.submitStatus.textContent = result.resumed ? '已恢復上一次作答階段。' : '已開始新嘅作答階段。';
    setSubmitEnabled(false);
  } catch (e) {
    showError(e.code, e.message);
  }
}

async function submitAnswer(e) {
  e.preventDefault();
  if (state.isExpired()) {
    showError('session-expired', '');
    return;
  }
  const session = state.getSession();
  const selected = state.getSelectedOptionId();
  if (!selected) return;
  setSubmitEnabled(false);
  ui.submitStatus.textContent = '提交中…';
  try {
    const r = await submitAttempt({
      sessionId: session.sessionId,
      releaseId: session.releaseId,
      selectedOptionId: selected,
      idempotencyKey: state.getIdempotencyKey(),
      submittedAtClient: new Date().toISOString(),
      diagnosticDurationMs: state.getDiagnosticDurationMs(),
    });
    ui.feedback.hidden = false;
    renderFeedback(ui.feedbackContent, r);
    ui.evaluationDetail.textContent = JSON.stringify(r.attempt, null, 2);
    ui.submitStatus.textContent = '已提交。';
  } catch (err) {
    showError(err.code, err.message);
    ui.submitStatus.textContent = '提交失敗。';
    setSubmitEnabled(true);
  }
}

function init() {
  showConfigMissing();
  showAuthEmulatorBadge();

  ui.btnGoogle.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      showError('unauthenticated', e.message || 'popup-blocked');
    }
  });

  $('#answer-form').addEventListener('submit', submitAnswer);

  watchAuth((s) => {
    if (s.signedIn) {
      ui.authStatus.textContent = `已登入：${s.email}${s.emailVerified ? '' : '（未驗證 email）'}`;
      ui.authActions.hidden = true;
      startAttempt();
    } else {
      ui.authStatus.textContent = '尚未登入。';
      ui.authActions.hidden = false;
      ui.attemptSection.hidden = true;
    }
  });
}

init();
