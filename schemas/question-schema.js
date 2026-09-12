const REQUIRED_FIELDS = [
  "id",
  "course",
  "chapter",
  "templateId",
  "mode",
  "difficulty",
  "params",
  "prompt",
  "expression",
  "steps",
  "answer",
  "solution",
  "checker",
  "metadata"
];

function validateQuestion(question) {
  if (!question || typeof question !== "object") throw new Error("question must be an object");
  for (const field of REQUIRED_FIELDS) {
    if (!(field in question)) throw new Error(`question missing ${field}`);
  }
  if (typeof question.id !== "string" || !question.id) throw new Error("question.id must be non-empty");
  if (typeof question.course !== "string" || !question.course || typeof question.chapter !== "string" || !question.chapter) {
    throw new Error("question course/chapter must be non-empty strings");
  }
  if (typeof question.templateId !== "string" || !question.templateId || typeof question.mode !== "string" || !question.mode) {
    throw new Error("question templateId/mode must be non-empty strings");
  }
  if (question.difficulty !== "basic" && question.difficulty !== "advanced") throw new Error("question.difficulty must be basic or advanced");
  if (!question.params || typeof question.params !== "object" || Array.isArray(question.params)) throw new Error("question.params must be an object");
  if (typeof question.title !== "string" || !question.title || typeof question.topicLabel !== "string" || !question.topicLabel) {
    throw new Error("question title/topicLabel must be non-empty strings");
  }
  if (typeof question.instruction !== "string" || !question.instruction) throw new Error("question.instruction must be a non-empty string");
  if (!question.prompt || typeof question.prompt !== "object" || Array.isArray(question.prompt)) throw new Error("question.prompt must be an object");
  if (typeof question.prompt.title !== "string" || typeof question.prompt.instruction !== "string" || typeof question.prompt.expression !== "string") {
    throw new Error("question.prompt must expose title, instruction, and expression strings");
  }
  if (typeof question.expression !== "string" || !question.expression) throw new Error("question.expression must be a non-empty string");
  if (!Array.isArray(question.steps) || question.steps.length === 0) throw new Error("question.steps must be non-empty");
  if (!question.steps.every((step) => step && typeof step.label === "string" && typeof step.hint === "string")) {
    throw new Error("question steps must expose label and hint");
  }
  if (typeof question.answer !== "string" || !question.answer) throw new Error("question.answer must be a non-empty string");
  if (!Array.isArray(question.solution) || question.solution.length === 0 || !question.solution.every((step) => typeof step === "string" && step)) {
    throw new Error("question.solution must contain non-empty strings");
  }
  if (!question.checker || typeof question.checker !== "object" || typeof question.checker.type !== "string" || !Array.isArray(question.checker.steps)) {
    throw new Error("question.checker must expose a type and steps");
  }
  if (question.checker.steps.length !== question.steps.length || !question.checker.steps.every((step) => step && typeof step.kind === "string")) {
    throw new Error("question checker steps must match question steps");
  }
  if (!question.metadata || typeof question.metadata !== "object" || Array.isArray(question.metadata)) throw new Error("question.metadata must be an object");
  assertJsonValue(question, "question");
  JSON.stringify(question);
  return question;
}

function assertJsonValue(value, path, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} must contain finite numbers`);
    return;
  }
  if (typeof value !== "object") throw new Error(`${path} contains a non-serializable value`);
  if (seen.has(value)) throw new Error(`${path} contains a circular reference`);
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, seen));
  else Object.entries(value).forEach(([key, item]) => assertJsonValue(item, `${path}.${key}`, seen));
  seen.delete(value);
}

module.exports = { REQUIRED_FIELDS, validateQuestion };
