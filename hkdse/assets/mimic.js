import {
  createSafeStorage,
  escapeHtml,
  fetchJson,
  getBrowserStorage,
  loadSavedState,
  normalizeSeed,
  saveState,
  typesetCurrent,
} from "./common.js";
import {
  getVerifiedAnswer,
  gradeMimicAnswer,
  seededVariationIndex,
} from "./mimic-contracts.js";

export const MIMIC_STORAGE_KEY = "assessments:hkdse:mimic:v1";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export async function runtimeHash(template, practice) {
  const bytes = new TextEncoder().encode(
    JSON.stringify(
      canonicalize({
        practice: practice ?? null,
        template,
      }),
    ),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function collectVerifiedTemplates(
  templates,
  practice,
  validation,
) {
  const verified = [];
  for (const record of Object.values(validation.templates ?? {})) {
    if (record.status !== "verified" || !record.templateId.startsWith("p2:")) {
      continue;
    }
    const sourceId = record.templateId.slice(3);
    const template = templates[sourceId];
    const practiceRecord = practice[sourceId];
    if (!template || !practiceRecord) continue;
    const currentHash = await runtimeHash(template, practiceRecord);
    if (currentHash === record.runtimeHash) {
      verified.push({
        id: record.templateId,
        practice: practiceRecord,
        template,
        validation: record,
      });
    }
  }
  return verified.sort((left, right) => left.id.localeCompare(right.id));
}

export function mountMimic({
  document: doc = document,
  storageSource,
} = {}) {
  const storage = createSafeStorage(
    storageSource === undefined ? getBrowserStorage() : storageSource,
  );
  let saved = loadSavedState(storage, MIMIC_STORAGE_KEY);
  const loadButton = doc.querySelector("#load-mimic");
  const clearButton = doc.querySelector("#clear-mimic");
  const panel = doc.querySelector("#mimic-panel");
  const errorBox = doc.querySelector("#mimic-error");
  const status = doc.querySelector("#mimic-status");
  const seedInput = doc.querySelector("#mimic-seed");
  let entries = [];
  let current = null;

  seedInput.value = normalizeSeed(saved?.seed, "hkdse-mimic");
  if (!storage.available) doc.querySelector("#storage-status").hidden = false;

  function persist(answer = "", resultStatus = null) {
    const value = {
      answer,
      resultStatus,
      seed: normalizeSeed(seedInput.value, "hkdse-mimic"),
      templateId: current?.id ?? null,
    };
    saved = value;
    saveState(storage, MIMIC_STORAGE_KEY, value);
  }

  function renderQuestion() {
    const seed = normalizeSeed(seedInput.value, "hkdse-mimic");
    seedInput.value = seed;
    const entry = entries[0];
    const variations = entry.practice.variations;
    const index = seededVariationIndex(seed, entry.id, variations.length);
    const variation = variations[index];
    const expectedAnswer = getVerifiedAnswer(entry.id, variation.values);
    if (!variation?.question || !expectedAnswer) {
      throw new Error("已驗證模板缺少可用題目或答案 contract");
    }
    current = {
      ...entry,
      expectedAnswer,
      index,
      variation,
    };
    panel.hidden = false;
    panel.innerHTML = `
      <p class="result-label correct">已逐模板驗證，可計分</p>
      <h2>${escapeHtml(entry.id)} · ${escapeHtml(entry.template.topic)}</h2>
      <div class="question-text">${escapeHtml(variation.question)}</div>
      <div class="field mimic-answer-field">
        <label for="mimic-answer">你的答案</label>
        <input id="mimic-answer" autocomplete="off" inputmode="text">
      </div>
      <div class="actions">
        <button type="button" id="check-mimic">核對類似題</button>
        <button type="button" class="secondary" id="next-mimic">用同一 seed 重現</button>
      </div>
      <p id="mimic-result" class="result-label" role="status" hidden></p>
      <p class="footer-note">類似題統計獨立於歷屆真題；未驗證模板不會出現在此處，也不會進入正確率。</p>
    `;
    const answerInput = panel.querySelector("#mimic-answer");
    const result = panel.querySelector("#mimic-result");
    if (saved?.templateId === entry.id && saved.seed === seed) {
      answerInput.value = saved.answer ?? "";
      if (saved.resultStatus === "correct" || saved.resultStatus === "wrong") {
        const restoredGrade = gradeMimicAnswer(
          answerInput.value,
          current.expectedAnswer,
          true,
        );
        result.hidden = false;
        result.className = `result-label ${
          restoredGrade.status === "correct"
            ? "correct"
            : restoredGrade.status === "wrong"
              ? "wrong"
              : "unavailable"
        }`;
        result.textContent =
          restoredGrade.status === "correct"
            ? "答對"
            : restoredGrade.status === "wrong"
              ? "答錯"
              : "請先輸入答案";
      }
    }
    panel.querySelector("#check-mimic").addEventListener("click", () => {
      const grade = gradeMimicAnswer(
        answerInput.value,
        current.expectedAnswer,
        true,
      );
      result.hidden = false;
      result.className = `result-label ${
        grade.status === "correct" ? "correct" : grade.status === "wrong" ? "wrong" : "unavailable"
      }`;
      result.textContent =
        grade.status === "correct"
          ? "答對"
          : grade.status === "wrong"
            ? "答錯"
            : "請先輸入答案";
      persist(
        answerInput.value,
        grade.gradeable ? grade.status : null,
      );
    });
    panel.querySelector("#next-mimic").addEventListener("click", renderQuestion);
    typesetCurrent(panel);
  }

  loadButton.addEventListener("click", async () => {
    loadButton.disabled = true;
    errorBox.hidden = true;
    status.textContent = "正在按需載入類似題資料…";
    try {
      const base = new URL("../mimic/", import.meta.url);
      const [templates, practiceP1, practiceP2, validation] =
        await Promise.all([
          fetchJson(new URL("auto_templates_p2.json", base)),
          fetchJson(new URL("practice_p1.json", base)),
          fetchJson(new URL("practice_p2.json", base)),
          fetchJson(new URL("template-validation.json", base)),
        ]);
      entries = await collectVerifiedTemplates(
        templates,
        practiceP2,
        validation,
      );
      const counts = validation.counts ?? {};
      status.textContent =
        `已驗證 ${entries.length} 個；另有 ${counts.pending ?? 0} 個待核對、` +
        `${counts.failed ?? 0} 個未通過。待核對或未通過模板不計分。` +
        `P1 已遷移 ${Object.keys(practiceP1).length} 個練習模板，現階段全部不計分。`;
      if (!entries.length) {
        throw new Error("沒有 hash 相符的已驗證模板，功能已安全停用");
      }
      renderQuestion();
    } catch (error) {
      entries = [];
      panel.hidden = true;
      errorBox.hidden = false;
      errorBox.textContent = `未能啟用類似題：${error.message}`;
      status.textContent = "類似題已安全停用；歷屆真題功能不受影響。";
      loadButton.disabled = true;
    }
  });

  seedInput.addEventListener("change", () => {
    seedInput.value = normalizeSeed(seedInput.value, "hkdse-mimic");
    if (entries.length) renderQuestion();
  });
  clearButton.addEventListener("click", () => {
    storage.removeItem(MIMIC_STORAGE_KEY);
    saved = null;
    seedInput.value = "hkdse-mimic";
    if (entries.length) renderQuestion();
  });
}

if (typeof document !== "undefined") {
  mountMimic();
}
