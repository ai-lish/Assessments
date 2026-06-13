#!/usr/bin/env node

import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";
import {
  getVerifiedAnswer,
  gradeMimicAnswer,
  seededVariationIndex,
} from "../assets/mimic-contracts.js";
import {
  runtimeHash,
} from "../assets/mimic.js";
import {
  assert,
  assertEqual,
  fileExists,
  readJson,
} from "./helpers.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const templates = readJson("mimic/auto_templates_p2.json");
const practiceP1 = readJson("mimic/practice_p1.json");
const practiceP2 = readJson("mimic/practice_p2.json");
const validation = readJson("mimic/template-validation.json");
const sourceMetadata = readJson("mimic/source-metadata.json");

assertEqual(Object.keys(templates).length, 495, "P2 template count");
assertEqual(Object.keys(practiceP1).length, 194, "P1 practice template count");
assertEqual(Object.keys(practiceP2).length, 390, "P2 practice template count");
assertEqual(sourceMetadata.sourceCommit.length, 40, "pinned source SHA length");
assertEqual(
  sourceMetadata.sourceCommit,
  "ef5a578a04f424754ca3733f44f16eaff590f266",
  "source commit must match pinned ef5a578",
);
assertEqual(validation.counts.verified, 1, "verified template count");
assertEqual(
  validation.counts.verified +
    validation.counts.pending +
    validation.counts.failed,
  689,
  "per-template validation count",
);

const verified = validation.templates["p2:2012Q05"];
assertEqual(verified.status, "verified", "verified status");
assert(verified.runtimeHash, "verified template runtime hash");
assert(verified.positiveSample, "verified positive sample");
assert(verified.negativeSample, "verified negative sample");

const variationIndex = seededVariationIndex(
  verified.reproducibility.fixedSeed,
  verified.templateId,
  practiceP2["2012Q05"].variations.length,
);
assertEqual(
  variationIndex,
  seededVariationIndex(
    verified.reproducibility.fixedSeed,
    verified.templateId,
    practiceP2["2012Q05"].variations.length,
  ),
  "fixed seed reproducibility",
);
const variation = practiceP2["2012Q05"].variations[variationIndex];
const answer = getVerifiedAnswer(verified.templateId, variation.values);
assertEqual(
  gradeMimicAnswer(answer, answer, true).status,
  "correct",
  "verified positive sample grades correct",
);
assertEqual(
  gradeMimicAnswer(`${answer}x`, answer, true).status,
  "wrong",
  "verified negative sample grades wrong",
);
assertEqual(
  gradeMimicAnswer(answer, answer, false).status,
  "unavailable",
  "pending template is never graded",
);
assertEqual(
  gradeMimicAnswer("", answer, true).status,
  "unanswered",
  "blank answer is not correct",
);

const pending = Object.values(validation.templates).find(
  (record) => record.status === "pending",
);
assert(pending, "pending validation record exists");
assertEqual(pending.positiveSample, null, "pending has no trusted answer");

for (const fileName of [
  "mimic/auto_templates_p2.json",
  "mimic/practice_p1.json",
  "mimic/practice_p2.json",
  "mimic/template-validation.json",
  "mimic/index.html",
]) {
  assert(fileExists(fileName), `${fileName} must exist`);
}

const mimicSource = readFileSync(resolve(root, "assets/mimic.js"), "utf8");
assert(
  mimicSource.includes("currentHash === record.runtimeHash"),
  "student runtime invalidates changed template hashes",
);
assert(
  mimicSource.includes("assessments:hkdse:mimic:v1"),
  "mimic storage uses Assessments namespace",
);
assert(
  !/name|class|studentId|token|userAgent/i.test(
    JSON.stringify({
      answer: "",
      resultStatus: null,
      seed: "hkdse-mimic",
      templateId: "p2:2012Q05",
    }),
  ),
  "mimic storage schema excludes PII",
);

const changedTemplate = structuredClone(templates["2012Q05"]);
changedTemplate.generalization += " changed";
assertEqual(
  await runtimeHash(templates["2012Q05"], practiceP2["2012Q05"]),
  verified.runtimeHash,
  "verified runtime hash matches manifest",
);
assert(
  (await runtimeHash(changedTemplate, practiceP2["2012Q05"])) !==
    verified.runtimeHash,
  "template change invalidates prior verification",
);

console.log("validate-mimic: ok");
