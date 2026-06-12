import {
  assert,
  assertEqual,
  readJson,
  sha256File,
} from "./helpers.mjs";

const manifest = readJson("reports/disposition-manifest.json");
const solutionDiff = readJson("reports/p2-solutions-root-vs-pages.json");
const latexDiff = readJson("reports/p2-latex-root-vs-pages.json");
const canonical = readJson("reports/canonical-consistency.json");
const bank = readJson("reports/question-bank-integrity.json");

for (const entry of manifest.entries) {
  for (const key of [
    "sourcePath",
    "disposition",
    "destinationPath",
    "consumerCount",
    "source",
    "canonicalReason",
    "unresolvedDifference",
  ]) {
    assert(key in entry, `manifest entry ${entry.sourcePath} lacks ${key}`);
  }
  assert("sizeBytes" in entry.source, `${entry.sourcePath} lacks source size`);
  assert("sha256" in entry.source, `${entry.sourcePath} lacks source hash`);
}

assertEqual(solutionDiff.rootKeyCount, 437, "root solution keys");
assertEqual(solutionDiff.pagesKeyCount, 435, "pages solution keys");
assertEqual(solutionDiff.changedCount, 0, "changed common solution records");
assertEqual(solutionDiff.onlyInRoot.length, 2, "root-only solution records");
assert(
  solutionDiff.onlyInRoot.includes("2021Q32") &&
    solutionDiff.onlyInRoot.includes("2022Q34"),
  "solution difference report must identify root-only ids",
);
assertEqual(latexDiff.rootKeyCount, 495, "root latex keys");
assertEqual(latexDiff.pagesKeyCount, 495, "pages latex keys");
assertEqual(latexDiff.changedCount, 12, "changed latex records");
assert(
  !JSON.stringify(latexDiff).includes("/Users/"),
  "difference reports may not expose source machine absolute paths",
);
assert(
  solutionDiff.relationship.includes("not deduplicated") &&
    latexDiff.relationship.includes("not deduplicated"),
  "divergent files must not be described as deduplicated",
);
assertEqual(
  canonical.p2Solutions.outputSha256,
  sha256File("data/p2-solutions.json"),
  "canonical output hash",
);
assert(bank.unchanged, "question-bank.json must be unchanged from merge base");
assertEqual(bank.mergeBaseSha256, bank.workingTreeSha256, "question bank hash");

console.log("validate-reports: ok");
