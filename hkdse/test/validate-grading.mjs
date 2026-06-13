import {
  assert,
  assertEqual,
  readJson,
} from "./helpers.mjs";

const p2Questions = readJson("data/p2-questions.json");
const p2Solutions = readJson("data/p2-solutions.json");
const questionIds = new Set(p2Questions.questions.map((question) => question.id));
const solutionIds = new Set();

for (const solution of p2Solutions.solutions) {
  assert(questionIds.has(solution.id), `solution without question: ${solution.id}`);
  assert(!solutionIds.has(solution.id), `duplicate solution: ${solution.id}`);
  solutionIds.add(solution.id);
  assert(/^[ABCD]$/.test(solution.answer), `invalid choice key: ${solution.id}`);
  assertEqual(solution.checkType, "choiceKey", `${solution.id} checkType`);
}

assertEqual(solutionIds.size, 437, "gradeable P2 questions");
assertEqual(
  p2Questions.questions.filter((question) => !solutionIds.has(question.id)).length,
  58,
  "non-gradeable P2 questions",
);

console.log("validate-grading: ok");
