import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import {
  calculateP1Coverage,
  classifyP1Answer,
  needsOcrWarning,
} from "../assets/p1.js";
import {
  gradeChoice,
  summarizeP2,
} from "../assets/p2.js";
import {
  createSafeStorage,
  filterAndPage,
  loadSavedState,
  parseUrlState,
  resolveDataAsset,
  saveState,
  stableShuffle,
  stateToSearch,
} from "../assets/common.js";
import {
  assert,
  assertEqual,
  fileExists,
  HKDSE_ROOT,
  readJson,
} from "./helpers.mjs";

const p1Questions = readJson("data/p1-questions.json").questions;
const p1Answers = readJson("data/p1-answers.json").answers;
const p2Questions = readJson("data/p2-questions.json").questions;
const p2Solutions = readJson("data/p2-solutions.json").solutions;
const solutionMap = new Map(p2Solutions.map((solution) => [solution.id, solution]));

const p1States = p1Answers.reduce(
  (counts, answer) => {
    counts[classifyP1Answer(answer)] += 1;
    return counts;
  },
  {
    text: 0,
    image: 0,
    missing: 0,
  },
);
assertEqual(p1States.text, 126, "P1 text state count");
assertEqual(p1States.image, 72, "P1 image-only state count");
assertEqual(p1States.missing, 0, "P1 missing state count in current data");
assert(
  p1Answers
    .filter((answer) => !answer.text.trim())
    .every(
      (answer) =>
        classifyP1Answer(answer) === "image" &&
        fileExists(`data/${answer.imagePath}`),
    ),
  "all 72 no-text P1 answers must display a copied image",
);
assertEqual(
  classifyP1Answer({
    text: "",
    imagePath: null,
  }),
  "missing",
  "defensive P1 missing branch",
);
assert(
  needsOcrWarning({
    text: "這張圖片中的文字如下：答案",
    imagePath: "../images/p1-answers/2012Q01.jpg",
    verified: true,
    ocrStatus: "verified",
  }),
  "unclean OCR preface must be flagged",
);
assert(
  p1Answers.every(needsOcrWarning),
  "non-verified A1 answers must be flagged as unverified",
);
const coverage = calculateP1Coverage(p1Answers);
assertEqual(coverage.withText, 126, "P1 coverage with text");
assertEqual(coverage.withImage, 198, "P1 coverage with image");
assertEqual(coverage.withNeither, 0, "P1 coverage with neither");
assertEqual(coverage.verified, 0, "P1 verified coverage");

const positive = p2Solutions[0];
assertEqual(
  gradeChoice(positive.answer, positive).status,
  "correct",
  "P2 positive sample",
);
const negativeChoice = ["A", "B", "C", "D"].find(
  (choice) => choice !== positive.answer,
);
assertEqual(
  gradeChoice(negativeChoice, positive).status,
  "wrong",
  "P2 negative sample",
);
assertEqual(
  gradeChoice("A", undefined).status,
  "unavailable",
  "P2 missing solution",
);
for (const invalid of ["", "E", "長句", 3, null]) {
  const result = gradeChoice(invalid, positive);
  assert(
    !result.gradeable &&
      ["unanswered", "invalid"].includes(result.status),
    `P2 invalid sample must be excluded: ${String(invalid)}`,
  );
}
for (const invalidAnswer of ["", "E", "ANSWER", 3, null]) {
  const result = gradeChoice("A", {
    checkType: "choiceKey",
    answer: invalidAnswer,
  });
  assertEqual(
    result.status,
    "unavailable",
    `invalid canonical answer ${String(invalidAnswer)}`,
  );
}
assertEqual(
  gradeChoice("A", {
    checkType: "other",
    answer: "A",
  }).status,
  "unavailable",
  "non-choiceKey solution",
);

const missingQuestion = p2Questions.find(
  (question) => !solutionMap.has(question.id),
);
const summary = summarizeP2(
  [p2Questions[0], missingQuestion],
  {
    [p2Questions[0].id]: solutionMap.get(p2Questions[0].id).answer,
    [missingQuestion.id]: "A",
  },
  solutionMap,
  {
    [p2Questions[0].id]: true,
    [missingQuestion.id]: true,
  },
);
assertEqual(summary.answered, 2, "P2 answered summary");
assertEqual(summary.gradeable, 1, "P2 gradeable summary");
assertEqual(summary.correct, 1, "P2 correct summary");
assertEqual(summary.wrong, 0, "P2 wrong summary");
assertEqual(summary.unavailable, 1, "P2 unavailable summary");

const years = [2012, 2013, 2014];
const topics = ["代數", "幾何"];
const validState = parseUrlState(
  "?year=2013&topic=%E4%BB%A3%E6%95%B8&limit=20&mode=random&page=2&seed=test",
  years,
  topics,
);
assertEqual(validState.year, "2013", "valid URL year");
assertEqual(validState.topic, "代數", "valid URL topic");
assertEqual(validState.limit, 20, "valid URL limit");
assertEqual(validState.mode, "random", "valid URL mode");
assertEqual(validState.page, 2, "valid URL page");
assertEqual(validState.seed, "test", "valid URL seed");

const safeState = parseUrlState(
  "?year=1999&topic=bad&limit=999&mode=bad&page=-2&seed=",
  years,
  topics,
);
assertEqual(safeState.year, "", "invalid URL year fallback");
assertEqual(safeState.topic, "", "invalid URL topic fallback");
assertEqual(safeState.limit, 10, "invalid URL limit fallback");
assertEqual(safeState.mode, "ordered", "invalid URL mode fallback");
assertEqual(safeState.page, 1, "invalid URL page fallback");
assertEqual(safeState.seed, "hkdse", "invalid URL seed fallback");
assert(
  stateToSearch(validState).includes("mode=random"),
  "state URL must preserve selected mode",
);

const shuffledA = stableShuffle(p2Questions.slice(0, 30), "same-seed").map(
  (question) => question.id,
);
const shuffledB = stableShuffle(p2Questions.slice(0, 30), "same-seed").map(
  (question) => question.id,
);
assertEqual(
  JSON.stringify(shuffledA),
  JSON.stringify(shuffledB),
  "same seed order",
);
assert(
  JSON.stringify(shuffledA) !==
    JSON.stringify(
      stableShuffle(p2Questions.slice(0, 30), "different-seed").map(
        (question) => question.id,
      ),
    ),
  "different seed should change order",
);

for (const limit of [5, 10, 20]) {
  const result = filterAndPage(p2Questions, {
    year: "",
    topic: "",
    limit,
    mode: "ordered",
    page: 1,
    seed: "hkdse",
  });
  assertEqual(result.items.length, limit, `${limit}-item page`);
  assert(result.items.length <= 20, "rendered page may not exceed 20");
}
const clamped = filterAndPage(p1Questions, {
  year: "",
  topic: "",
  limit: 20,
  mode: "ordered",
  page: 999,
  seed: "hkdse",
});
assertEqual(clamped.page, clamped.pageCount, "page must clamp to final page");

const blockedStorage = {
  setItem() {
    throw new Error("blocked");
  },
  getItem() {
    throw new Error("blocked");
  },
  removeItem() {
    throw new Error("blocked");
  },
};
const fallbackStorage = createSafeStorage(blockedStorage);
assert(!fallbackStorage.available, "blocked storage must use fallback");
saveState(fallbackStorage, "test", {
  drafts: {
    "2012Q01": "working",
  },
  filters: validState,
});
assertEqual(
  loadSavedState(fallbackStorage, "test").drafts["2012Q01"],
  "working",
  "memory storage fallback",
);

const dataUrl = new URL(
  "https://ai-lish.github.io/Assessments/hkdse/data/p1-questions.json",
);
assert(
  resolveDataAsset(dataUrl, "../images/p1/2012Q01.jpg").includes(
    "/Assessments/hkdse/images/p1/2012Q01.jpg",
  ),
  "allowlisted image URL",
);
let rejectedOutside = false;
try {
  resolveDataAsset(dataUrl, "../../question-bank.json");
} catch {
  rejectedOutside = true;
}
assert(rejectedOutside, "asset resolver must reject paths outside hkdse/images");

for (const question of [...p1Questions, ...p2Questions]) {
  assert(
    fileExists(`data/${question.imagePath}`),
    `copied runtime image missing: ${question.id}`,
  );
}

const htmlPaths = [
  "index.html",
  "guide.html",
  "p1/index.html",
  "p2/index.html",
];
for (const htmlPath of htmlPaths) {
  const html = readFileSync(resolve(HKDSE_ROOT, htmlPath), "utf8");
  assert(
    html.includes('name="viewport"'),
    `${htmlPath} must declare a mobile viewport`,
  );
  assert(
    !/login|登入表單|password/i.test(html),
    `${htmlPath} must not require login`,
  );
  assert(
    !/mimic|類似題|仿題/.test(html) || htmlPath === "index.html",
    `${htmlPath} must not expose A3 controls`,
  );
  assert(
    !html.includes("/assessments/"),
    `${htmlPath} must not use lowercase assessments`,
  );
}
const indexHtml = readFileSync(resolve(HKDSE_ROOT, "index.html"), "utf8");
assert(
  indexHtml.includes("後續獨立階段"),
  "A3/A4 features must be clearly unavailable",
);
const css = readFileSync(resolve(HKDSE_ROOT, "assets/hkdse.css"), "utf8");
assert(css.includes("@media (max-width: 480px)"), "mobile CSS breakpoint");
assert(css.includes("max-width: 100%"), "images must be responsive");
assert(css.includes("min-height: 44px"), "touch target minimum");

for (const source of [
  readFileSync(resolve(HKDSE_ROOT, "assets/p1.js"), "utf8"),
  readFileSync(resolve(HKDSE_ROOT, "assets/p2.js"), "utf8"),
]) {
  assert(!source.includes("navigator.userAgent"), "must not store full user agent");
  assert(!source.includes("token"), "student UI must not handle tokens");
}

console.log("validate-student-ui: ok");
