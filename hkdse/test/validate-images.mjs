import {
  assert,
  assertEqual,
  fileExists,
  readJson,
  sha256File,
} from "./helpers.mjs";

const p1Questions = readJson("data/p1-questions.json");
const p1Answers = readJson("data/p1-answers.json");
const p2Questions = readJson("data/p2-questions.json");
const inventory = readJson("reports/image-inventory.json");

for (const record of [
  ...p1Questions.questions,
  ...p2Questions.questions,
  ...p1Answers.answers.filter((answer) => answer.imagePath),
]) {
  assert(fileExists(`data/${record.imagePath}`), `missing image ${record.imagePath}`);
}

const expected = {
  "images-p1": {
    sourceFiles: 220,
    referencedFiles: 198,
    copiedFiles: 198,
    orphanFiles: 22,
  },
  "images-p2": {
    sourceFiles: 495,
    referencedFiles: 495,
    copiedFiles: 495,
    orphanFiles: 0,
  },
  "answer-images": {
    sourceFiles: 229,
    referencedFiles: 198,
    copiedFiles: 198,
    orphanFiles: 31,
  },
};
for (const [directory, counts] of Object.entries(expected)) {
  const actual = inventory.summary.bySourceDirectory[directory];
  for (const [key, value] of Object.entries(counts)) {
    assertEqual(actual[key], value, `${directory} ${key}`);
  }
  assertEqual(actual.missingReferences, 0, `${directory} missing references`);
}

for (const record of inventory.files.filter((item) => item.copied)) {
  const relativeDestination = record.destinationPath.replace(/^hkdse\//, "");
  assertEqual(
    sha256File(relativeDestination),
    record.sha256,
    `${record.destinationPath} hash`,
  );
}

console.log("validate-images: ok");
