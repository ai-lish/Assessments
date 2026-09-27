// dse-paper2/js/render.js
// Render the public VariantRenderSnapshot into the DOM.

import { displayRational, displayParameters } from './rational-display.js';

export function renderPrompt(container, renderSnapshot) {
  const params = renderSnapshot.parameters;
  const html = `
    <p>化簡下列指數式，並以精確有理數表示結果。</p>
    <p class="mono">${displayParameters(params)}</p>
  `;
  container.innerHTML = html;
}

export function renderParameters(container, renderSnapshot) {
  const { a, m, n, k } = renderSnapshot.parameters;
  container.textContent = `a=${a}, m=${m}, n=${n}, k=${k}  (releaseId=${renderSnapshot.releaseId}, variantId=${renderSnapshot.variantId})`;
}

export function renderOptions(container, renderSnapshot, onSelect) {
  container.innerHTML = '';
  for (const opt of renderSnapshot.options) {
    const row = document.createElement('label');
    row.className = 'option-row';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'option';
    input.value = opt.id;
    input.addEventListener('change', () => {
      container.querySelectorAll('.option-row').forEach((n) => n.classList.remove('selected'));
      row.classList.add('selected');
      onSelect(opt.id);
    });
    const span = document.createElement('span');
    span.className = 'rational';
    span.textContent = `${opt.id}. ${displayRational(opt.value)}`;
    row.appendChild(input);
    row.appendChild(span);
    container.appendChild(row);
  }
}

export function renderFeedback(container, payload) {
  const { isCorrect, correctOptionId, trapId } = payload.evaluation;
  const fb = payload.feedback || {};
  let html = `<p><strong>${isCorrect ? '✓ 答啱' : '✗ 答錯'}</strong>`;
  if (!isCorrect) {
    html += ` · 正確選項：${correctOptionId}`;
    if (trapId) html += ` · 診斷陷阱：<code>${trapId}</code>`;
  }
  html += `</p>`;
  if (fb.contentHtml) html += fb.contentHtml;
  if (Array.isArray(fb.commonMistakes) && !isCorrect && trapId) {
    const mistake = fb.commonMistakes.find((m) => m.trapId === trapId);
    if (mistake) html += `<p><em>${mistake.explanation}</em></p>`;
  }
  container.innerHTML = html;
}
