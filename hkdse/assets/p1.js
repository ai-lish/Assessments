import {
  createSafeStorage,
  escapeHtml,
  fetchJson,
  fillSelect,
  filterAndPage,
  getBrowserStorage,
  loadSavedState,
  normalizeTopic,
  parseUrlState,
  readStateFromControls,
  renderPagination,
  resolveDataAsset,
  saveState,
  setControlsFromState,
  syncUrl,
  typesetCurrent,
  uniqueSorted,
} from "./common.js";

export const P1_STORAGE_KEY = "assessments:hkdse:p1:v1";
const OCR_WARNING_PATTERNS = [
  /這張圖片中的文字如下/,
  /圖片中的文字/,
  /以下是.*文字/,
  /ocr/i,
];

export function classifyP1Answer(answer, imageExists = Boolean(answer?.imagePath)) {
  const text = typeof answer?.text === "string" ? answer.text.trim() : "";
  if (text) return "text";
  if (imageExists) return "image";
  return "missing";
}

export function needsOcrWarning(answer) {
  const text = typeof answer?.text === "string" ? answer.text : "";
  return (
    answer?.verified !== true ||
    answer?.ocrStatus !== "verified" ||
    OCR_WARNING_PATTERNS.some((pattern) => pattern.test(text))
  );
}

export function calculateP1Coverage(answers) {
  return answers.reduce(
    (summary, answer) => {
      if (answer.text?.trim()) summary.withText += 1;
      if (answer.imagePath) summary.withImage += 1;
      if (!answer.text?.trim() && !answer.imagePath) summary.withNeither += 1;
      if (answer.verified === true) summary.verified += 1;
      return summary;
    },
    {
      withText: 0,
      withImage: 0,
      withNeither: 0,
      verified: 0,
    },
  );
}

export function createP1State(saved) {
  return {
    drafts: saved?.drafts ?? {},
    ratings: saved?.ratings ?? {},
    completed: saved?.completed ?? {},
    filters: saved?.filters ?? null,
  };
}

function renderAnswer(answer, dataUrl) {
  const state = classifyP1Answer(answer);
  const warning = needsOcrWarning(answer)
    ? '<p class="ocr-warning result-label">答案 OCR 整理中／未核對，請以答案原圖為準。</p>'
    : "";
  if (state === "text") {
    const image = answer.imagePath
      ? `<details><summary>查看答案原圖</summary><img class="answer-image" loading="lazy" src="${escapeHtml(resolveDataAsset(dataUrl, answer.imagePath))}" alt="${escapeHtml(answer.id)} 答案原圖"></details>`
      : "";
    return `${warning}<div class="answer-text">${escapeHtml(answer.text)}</div>${image}`;
  }
  if (state === "image") {
    return `${warning}<p>此題暫未有可用答案文字，請查看答案原圖。</p><img class="answer-image" loading="lazy" src="${escapeHtml(resolveDataAsset(dataUrl, answer.imagePath))}" alt="${escapeHtml(answer.id)} 答案原圖">`;
  }
  return '<p class="result-label unavailable">答案資料整理中</p>';
}

export function mountP1({
  document: doc = document,
  location: currentLocation = location,
  storageSource,
} = {}) {
  const questionUrl = new URL("../data/p1-questions.json", import.meta.url);
  const answerUrl = new URL("../data/p1-answers.json", import.meta.url);
  const safeStorage = createSafeStorage(
    storageSource === undefined ? getBrowserStorage() : storageSource,
  );
  const saved = loadSavedState(safeStorage, P1_STORAGE_KEY);
  const progress = createP1State(saved);
  const controls = {
    year: doc.querySelector("#year-filter"),
    topic: doc.querySelector("#topic-filter"),
    limit: doc.querySelector("#limit-filter"),
    mode: doc.querySelector("#mode-filter"),
    seed: doc.querySelector("#seed-filter"),
    seedField: doc.querySelector("#seed-field"),
  };
  const list = doc.querySelector("#question-list");
  const status = doc.querySelector("#range-status");
  const pagination = doc.querySelector("#pagination");
  const errorBox = doc.querySelector("#load-error");
  const keyboard = doc.querySelector("#math-keyboard");
  let activeTextarea = null;
  let questions = [];
  let answers = new Map();
  let state;

  function persist() {
    saveState(safeStorage, P1_STORAGE_KEY, {
      drafts: progress.drafts,
      ratings: progress.ratings,
      completed: progress.completed,
      filters: state,
      seed: state.seed,
      page: state.page,
    });
  }

  function updateSummary() {
    const drafted = Object.values(progress.drafts).filter((value) =>
      String(value).trim(),
    ).length;
    const rated = Object.keys(progress.ratings).length;
    doc.querySelector("#draft-count").textContent = String(drafted);
    doc.querySelector("#rating-count").textContent = String(rated);
  }

  function render() {
    const result = filterAndPage(questions, state);
    if (result.page !== state.page) {
      state.page = result.page;
      syncUrl(state, true);
    }
    list.replaceChildren();
    status.textContent = result.total
      ? `顯示第 ${result.start}–${result.end} 題，共 ${result.total} 題`
      : "沒有符合條件的題目";

    for (const question of result.items) {
      const answer = answers.get(question.id) ?? {
        id: question.id,
        text: "",
        imagePath: null,
        verified: false,
      };
      const article = doc.createElement("article");
      article.className = "question-card";
      article.dataset.questionId = question.id;
      const rating = progress.ratings[question.id] ?? "";
      const questionImage = resolveDataAsset(questionUrl, question.imagePath);
      article.innerHTML = `
        <h2>${escapeHtml(question.id)} · ${escapeHtml(question.topic || "未分類")}</h2>
        <div class="question-text">${escapeHtml(question.question)}</div>
        <details>
          <summary>查看題目原圖</summary>
          <img class="question-image" loading="lazy" src="${escapeHtml(questionImage)}" alt="${escapeHtml(question.id)} 題目原圖">
        </details>
        <label for="draft-${escapeHtml(question.id)}"><strong>我的草稿</strong></label>
        <textarea id="draft-${escapeHtml(question.id)}" data-draft="${escapeHtml(question.id)}" placeholder="在此輸入計算步驟">${escapeHtml(progress.drafts[question.id] ?? "")}</textarea>
        <div class="actions">
          <button type="button" class="secondary" data-keyboard="${escapeHtml(question.id)}">數學快捷輸入</button>
          <label><input type="checkbox" data-completed="${escapeHtml(question.id)}" ${progress.completed[question.id] ? "checked" : ""}> 已完成此題</label>
        </div>
        <details>
          <summary>查看答案及自評</summary>
          ${renderAnswer(answer, answerUrl)}
          <fieldset class="self-rating">
            <legend>我的自評</legend>
            ${["掌握", "部分掌握", "需重做"]
              .map(
                (value) => `<label><input type="radio" name="rating-${escapeHtml(question.id)}" value="${value}" data-rating="${escapeHtml(question.id)}" ${rating === value ? "checked" : ""}> ${value}</label>`,
              )
              .join("")}
          </fieldset>
        </details>
      `;
      list.append(article);
    }

    list.querySelectorAll("[data-draft]").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        progress.drafts[textarea.dataset.draft] = textarea.value;
        updateSummary();
        persist();
      });
      textarea.addEventListener("focus", () => {
        activeTextarea = textarea;
      });
    });
    list.querySelectorAll("[data-keyboard]").forEach((button) => {
      button.addEventListener("click", () => {
        activeTextarea = list.querySelector(
          `[data-draft="${CSS.escape(button.dataset.keyboard)}"]`,
        );
        keyboard.hidden = false;
        activeTextarea?.focus();
      });
    });
    list.querySelectorAll("[data-completed]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        progress.completed[checkbox.dataset.completed] = checkbox.checked;
        persist();
      });
    });
    list.querySelectorAll("[data-rating]").forEach((radio) => {
      radio.addEventListener("change", () => {
        progress.ratings[radio.dataset.rating] = radio.value;
        updateSummary();
        persist();
      });
    });
    renderPagination(pagination, result, (page) => {
      state.page = page;
      syncUrl(state);
      persist();
      render();
      scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
    updateSummary();
    persist();
    typesetCurrent(list);
  }

  function applyControls() {
    state = readStateFromControls(controls, state);
    syncUrl(state);
    render();
  }

  for (const control of [
    controls.year,
    controls.topic,
    controls.limit,
    controls.mode,
    controls.seed,
  ]) {
    control.addEventListener("change", applyControls);
  }
  controls.mode.addEventListener("change", () => {
    controls.seedField.hidden = controls.mode.value !== "random";
  });

  doc.querySelector("#clear-progress").addEventListener("click", () => {
    safeStorage.removeItem(P1_STORAGE_KEY);
    progress.drafts = {};
    progress.ratings = {};
    progress.completed = {};
    render();
  });
  doc.querySelector("#toggle-keyboard").addEventListener("click", () => {
    keyboard.hidden = !keyboard.hidden;
  });
  keyboard.querySelectorAll("[data-insert]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!activeTextarea) return;
      const insertion = button.dataset.insert;
      const start = activeTextarea.selectionStart;
      const end = activeTextarea.selectionEnd;
      activeTextarea.setRangeText(insertion, start, end, "end");
      activeTextarea.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
      activeTextarea.focus();
    });
  });

  Promise.all([fetchJson(questionUrl), fetchJson(answerUrl)])
    .then(([questionData, answerData]) => {
      questions = questionData.questions;
      answers = new Map(answerData.answers.map((answer) => [answer.id, answer]));
      const years = uniqueSorted(
        questions.map((question) => question.year),
        true,
      );
      const topics = uniqueSorted(
        questions.map((question) => normalizeTopic(question.topic)),
      ).filter(Boolean);
      fillSelect(controls.year, years, "全部年份");
      fillSelect(controls.topic, topics, "全部課題");
      state = parseUrlState(currentLocation.search, years, topics);
      if (!currentLocation.search && progress.filters) {
        state = {
          ...state,
          ...progress.filters,
          page: progress.filters.page || 1,
        };
      }
      setControlsFromState(controls, state);
      syncUrl(state, true);
      const coverage = calculateP1Coverage(answerData.answers);
      doc.querySelector("#coverage-text").textContent = String(coverage.withText);
      doc.querySelector("#coverage-image").textContent = String(
        coverage.withImage,
      );
      doc.querySelector("#coverage-neither").textContent = String(
        coverage.withNeither,
      );
      doc.querySelector("#coverage-verified").textContent = String(
        coverage.verified,
      );
      if (!safeStorage.available) {
        doc.querySelector("#storage-status").hidden = false;
      }
      render();
    })
    .catch((error) => {
      errorBox.hidden = false;
      errorBox.textContent = `未能載入卷一資料：${error.message}`;
    });
}

if (typeof document !== "undefined") {
  mountP1();
}
