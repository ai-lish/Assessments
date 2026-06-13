import {
  assert,
  assertEqual,
  readJson,
  unique,
} from "./helpers.mjs";

const p1Questions = readJson("data/p1-questions.json");
const p1Answers = readJson("data/p1-answers.json");
const p2Questions = readJson("data/p2-questions.json");
const p2Solutions = readJson("data/p2-solutions.json");
const catalog = readJson("data/catalog.json");

assertEqual(p1Questions.questions.length, 198, "P1 question count");
assertEqual(p2Questions.questions.length, 495, "P2 question count");
assertEqual(
  p1Questions.questions.length + p2Questions.questions.length,
  693,
  "total question count",
);
assert(
  unique(p1Questions.questions.map((question) => question.id)),
  "P1 ids must be unique",
);
assert(
  unique(p2Questions.questions.map((question) => question.id)),
  "P2 ids must be unique",
);
assert(
  [...p1Questions.questions, ...p2Questions.questions].every((question) =>
    /^\d{4}Q\d{2}$/.test(question.id),
  ),
  "all ids must use YYYYQNN",
);
assertEqual(p1Answers.answers.length, 198, "P1 answer intersection");
assertEqual(
  p1Answers.answers.filter((answer) => answer.text.trim()).length,
  126,
  "P1 non-empty answer text",
);
assertEqual(
  p1Answers.answers.filter((answer) => !answer.text.trim()).length,
  72,
  "P1 empty answer text",
);
assertEqual(
  p1Answers.metadata.sourceWrapper.successful,
  220,
  "source successful metadata",
);
assertEqual(
  p1Answers.metadata.nonEmptyTextCount,
  126,
  "coverage must not use successful=220",
);
assert(
  p1Answers.answers.every((answer) => answer.verified === false),
  "unverified OCR answers may not be marked verified",
);
assertEqual(p2Solutions.solutions.length, 437, "P2 solution count");
assertEqual(
  p2Solutions.metadata.missingSolutionCount,
  58,
  "P2 missing solution count",
);
assertEqual(catalog.totalQuestionCount, 693, "catalog total");

console.log("validate-data: ok");
