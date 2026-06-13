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

export const P2_STORAGE_KEY = "assessments:hkdse:p2:v1";
const VALID_CHOICES = new Set(["A", "B", "C", "D"]);

export function gradeChoice(selected, solution) {
  const answer = solution?.answer;
  if (
    solution?.checkType !== "choiceKey" ||
    typeof answer !== "string" ||
    !VALID_CHOICES.has(answer)
  ) {
    return {
      status: "unavailable",
      gradeable: false,
      correct: false,
    };
  }
  if (typeof selected !== "string" || !VALID_CHOICES.has(selected)) {
    return {
      status: selected ? "invalid" : "unanswered",
      gradeable: false,
      correct: false,
    };
  }
  return {
    status: selected === answer ? "correct" : "wrong",
    gradeable: true,
    correct: selected === answer,
  };
}

export function summarizeP2(questions, selections, solutions, checked) {
  const summary = {
    answered: 0,
    gradeable: 0,
    correct: 0,
    wrong: 0,
    unavailable: 0,
  };
  for (const question of questions) {
    const selected = selections[question.id];
    if (VALID_CHOICES.has(selected)) summary.answered += 1;
    const solution = solutions.get(question.id);
    const hasValidSolution =
      solution?.checkType === "choiceKey" &&
      typeof solution.answer === "string" &&
      VALID_CHOICES.has(solution.answer);
    if (!hasValidSolution) {
      summary.unavailable += 1;
      continue;
    }
    if (checked[question.id] && VALID_CHOICES.has(selected)) {
      summary.gradeable += 1;
      if (selected === solution.answer) summary.correct += 1;
      else summary.wrong += 1;
    }
  }
  return summary;
}

export function createP2State(saved) {
  return {
    selections: saved?.selections ?? {},
    checked: saved?.checked ?? {},
    filters: saved?.filters ?? null,
  };
}

export function mountP2({
  document: doc = document,
  location: currentLocation = location,
  storageSource,
} = {}) {
  const questionUrl = new URL("../data/p2-questions.json", import.meta.url);
  const solutionUrl = new URL("../data/p2-solutions.json", import.meta.url);
  const safeStorage = createSafeStorage(
    storageSource === undefined ? getBrowserStorage() : storageSource,
  );
  const saved = loadSavedState(safeStorage, P2_STORAGE_KEY);
  const progress = createP2State(saved);
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
  let questions = [];
  let solutions = new Map();
  let state;

  function persist() {
    saveState(safeStorage, P2_STORAGE_KEY, {
      selections: progress.selections,
      checked: progress.checked,
      filters: state,
      seed: state.seed,
      page: state.page,
    });
  }

  function updateSummary() {
    const summary = summarizeP2(
      questions,
      progress.selections,
      solutions,
      progress.checked,
    );
    for (const [key, value] of Object.entries(summary)) {
      doc.querySelector(`#summary-${key}`).textContent = String(value);
    }
  }

  function clearQuestionResult(article) {
    article.querySelectorAll(".choice").forEach((choice) => {
      choice.classList.remove("correct", "wrong");
    });
    const result = article.querySelector(".result-label");
    result.className = "result-label";
    result.hidden = true;
    result.textContent = "";
  }

  function applyQuestionResult(article, questionId) {
    clearQuestionResult(article);
    const selected = progress.selections[questionId];
    const solution = solutions.get(questionId);
    const grade = gradeChoice(selected, solution);
    const result = article.querySelector(".result-label");
    progress.checked[questionId] = true;
    if (grade.status === "correct" || grade.status === "wrong") {
      article
        .querySelector(`[data-choice="${CSS.escape(selected)}"]`)
        ?.classList.add(grade.status);
      result.classList.add(grade.status);
      result.textContent = grade.status === "correct" ? "答對" : "答錯";
    } else if (grade.status === "unavailable") {
      result.classList.add("unavailable");
      result.textContent = "暫未能自動核對";
    } else if (grade.status === "unanswered") {
      result.classList.add("unavailable");
      result.textContent = "請先選擇答案";
    } else {
      result.classList.add("unavailable");
      result.textContent = "答案格式無效，未有計分";
    }
    result.hidden = false;
    persist();
    updateSummary();
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
      const solution = solutions.get(question.id);
      const selected = progress.selections[question.id] ?? "";
      const article = doc.createElement("article");
      article.className = "question-card";
      article.dataset.questionId = question.id;
      const imageUrl = resolveDataAsset(questionUrl, question.imagePath);
      const choices = ["A", "B", "C", "D"]
        .map(
          (choice) => `
            <label class="choice" data-choice="${choice}">
              <input type="radio" name="choice-${escapeHtml(question.id)}" value="${choice}" ${selected === choice ? "checked" : ""}>
              <span><strong>${choice}.</strong> ${escapeHtml(question.options[choice] ?? "")}</span>
            </label>
          `,
        )
        .join("");
      article.innerHTML = `
        <h2>${escapeHtml(question.id)} · ${escapeHtml(question.topic || "未分類")}</h2>
        <div class="question-text">${escapeHtml(question.question)}</div>
        <details>
          <summary>查看題目原圖</summary>
          <img class="question-image" loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(question.id)} 題目原圖">
        </details>
        <fieldset class="choice-list">
          <legend class="visually-hidden">選擇 ${escapeHtml(question.id)} 的答案</legend>
          ${choices}
        </fieldset>
        <div class="actions">
          <button type="button" data-check="${escapeHtml(question.id)}">核對此題</button>
        </div>
        <p class="result-label" role="status" hidden></p>
        ${
          solution?.solution
            ? `<details><summary>查看解題資料</summary><div class="solution-text">${escapeHtml(solution.solution)}</div></details>`
            : '<p class="footer-note">此題暫未有解題資料。</p>'
        }
      `;
      list.append(article);
      if (progress.checked[question.id]) {
        applyQuestionResult(article, question.id);
      }
    }

    list.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const article = radio.closest(".question-card");
        const questionId = article.dataset.questionId;
        progress.selections[questionId] = radio.value;
        progress.checked[questionId] = false;
        clearQuestionResult(article);
        persist();
        updateSummary();
      });
    });
    list.querySelectorAll("[data-check]").forEach((button) => {
      button.addEventListener("click", () => {
        applyQuestionResult(
          button.closest(".question-card"),
          button.dataset.check,
        );
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

  doc.querySelector("#check-page").addEventListener("click", () => {
    list.querySelectorAll(".question-card").forEach((article) => {
      applyQuestionResult(article, article.dataset.questionId);
    });
  });
  doc.querySelector("#clear-progress").addEventListener("click", () => {
    safeStorage.removeItem(P2_STORAGE_KEY);
    progress.selections = {};
    progress.checked = {};
    render();
  });

  Promise.all([fetchJson(questionUrl), fetchJson(solutionUrl)])
    .then(([questionData, solutionData]) => {
      questions = questionData.questions;
      solutions = new Map(
        solutionData.solutions.map((solution) => [solution.id, solution]),
      );
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
      if (!safeStorage.available) {
        doc.querySelector("#storage-status").hidden = false;
      }
      render();
    })
    .catch((error) => {
      errorBox.hidden = false;
      errorBox.textContent = `未能載入卷二資料：${error.message}`;
    });
}

if (typeof document !== "undefined") {
  mountP2();
}
