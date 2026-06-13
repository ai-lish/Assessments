#!/usr/bin/env node

import {
  createHash,
} from "node:crypto";
import {
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const HKDSE_ROOT = resolve(SCRIPT_DIR, "..");
const MIMIC_DIR = join(HKDSE_ROOT, "mimic");
const VALIDATION_DATE = "2026-06-12";
const FIXED_SEED = "a3-template-validation-v1";

function readJson(fileName) {
  return JSON.parse(readFileSync(join(MIMIC_DIR, fileName), "utf8"));
}

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

function sha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function hashRuntime(template, practice) {
  return sha256({
    practice: practice ?? null,
    template,
  });
}

function seededIndex(seed, length) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function formatFraction(numerator, denominator) {
  const gcd = (left, right) => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  };
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  const top = (numerator * sign) / divisor;
  const bottom = Math.abs(denominator) / divisor;
  return bottom === 1 ? String(top) : `${top}/${bottom}`;
}

function solve2012Q05(values) {
  return formatFraction(Number(values.b) - 2 * Number(values.a), 5);
}

function verify2012Q05(template, practice) {
  if (!practice?.variations?.length) {
    return {
      ok: false,
      reason: "No practice variations are available.",
    };
  }
  const variableMap = new Map(
    template.variables.map((variable) => [variable.name, variable]),
  );
  const samples = practice.variations.map((variation) => {
    const values = variation.values ?? {};
    const withinConstraints = [...variableMap].every(([name, variable]) => {
      const value = values[name];
      return (
        Number.isFinite(value) &&
        value >= variable.min &&
        value <= variable.max
      );
    });
    const answer = solve2012Q05(values);
    const numericAnswer =
      answer.includes("/")
        ? answer.split("/").reduce((top, bottom) => Number(top) / Number(bottom))
        : Number(answer);
    const m = Number(values.b) - 2 * numericAnswer - Number(values.a);
    const firstEquation =
      m + 2 * numericAnswer + Number(values.a);
    const secondEquation = 2 * m - numericAnswer;
    return {
      answer,
      independentCheck:
        withinConstraints &&
        Math.abs(firstEquation - Number(values.b)) < 1e-9 &&
        Math.abs(secondEquation - Number(values.b)) < 1e-9,
      question: variation.question,
      values,
    };
  });
  const selectedIndex = seededIndex(
    `${FIXED_SEED}:p2:2012Q05`,
    samples.length,
  );
  const selected = samples[selectedIndex];
  const negativeAnswer = formatFraction(
    Number(selected.values.b) - 2 * Number(selected.values.a) + 5,
    5,
  );
  return {
    ok: samples.every((sample) => sample.independentCheck),
    negativeSample: {
      expected: "wrong",
      studentAnswer: negativeAnswer,
    },
    positiveSample: {
      expected: "correct",
      studentAnswer: selected.answer,
    },
    reproducibility: {
      fixedSeed: FIXED_SEED,
      selectedIndex,
    },
    samples,
  };
}

function structuralChecks(id, template, practice) {
  const issues = [];
  if (template.id !== id) issues.push("template id mismatch");
  if (typeof template.generalization !== "string" || !template.generalization) {
    issues.push("missing generalization");
  }
  if (!Array.isArray(template.variables)) issues.push("missing variables array");
  if (practice && practice.template_id !== id) {
    issues.push("practice template_id mismatch");
  }
  const variableMap = new Map(
    Array.isArray(template.variables)
      ? template.variables.map((variable) => [variable.name, variable])
      : [],
  );
  for (const variation of practice?.variations ?? []) {
    if (typeof variation.question !== "string" || !variation.question.trim()) {
      issues.push("blank practice question");
      break;
    }
    for (const [name, value] of Object.entries(variation.values ?? {})) {
      const variable = variableMap.get(name);
      if (
        !variable ||
        !Number.isFinite(value) ||
        (Number.isFinite(variable.min) && value < variable.min) ||
        (Number.isFinite(variable.max) && value > variable.max)
      ) {
        issues.push(`variation value outside template constraint: ${name}`);
        break;
      }
    }
  }
  return [...new Set(issues)];
}

const templates = readJson("auto_templates_p2.json");
const practiceP1 = readJson("practice_p1.json");
const practiceP2 = readJson("practice_p2.json");
const records = {};

for (const id of Object.keys(templates).sort()) {
  const template = templates[id];
  const practice = practiceP2[id] ?? null;
  const issues = structuralChecks(id, template, practice);
  const runtimeHash = hashRuntime(template, practice);
  let status = issues.length ? "failed" : "pending";
  let method =
    "Structural import validation only; no approved independent answer contract.";
  let positiveSample = null;
  let negativeSample = null;
  let reproducibility = {
    fixedSeed: FIXED_SEED,
    selectedIndex: practice?.variations?.length
      ? seededIndex(`${FIXED_SEED}:p2:${id}`, practice.variations.length)
      : null,
  };
  let verificationNotes = issues;

  if (id === "2012Q05" && issues.length === 0) {
    const verification = verify2012Q05(template, practice);
    if (verification.ok) {
      status = "verified";
      method =
        "Independent simultaneous-equation derivation with substitution into both original equations.";
      positiveSample = verification.positiveSample;
      negativeSample = verification.negativeSample;
      reproducibility = verification.reproducibility;
      verificationNotes = verification.samples.map((sample) => ({
        answer: sample.answer,
        independentCheck: sample.independentCheck,
        values: sample.values,
      }));
    } else {
      status = "failed";
      verificationNotes = [verification.reason ?? "Independent check failed."];
    }
  }

  records[`p2:${id}`] = {
    assetReferences: [],
    date: VALIDATION_DATE,
    method,
    negativeSample,
    positiveSample,
    practiceHash: practice ? sha256(practice) : null,
    reproducibility,
    runtimeHash,
    status,
    templateHash: sha256(template),
    templateId: `p2:${id}`,
    verificationNotes,
    verifier: "scripts/validate-mimic-templates.mjs",
  };
}

for (const id of Object.keys(practiceP1).sort()) {
  const practice = practiceP1[id];
  const issues = [];
  if (practice.template_id !== id) issues.push("practice template_id mismatch");
  if (!Array.isArray(practice.variations) || practice.variations.length === 0) {
    issues.push("missing practice variations");
  }
  records[`p1:${id}`] = {
    assetReferences: [],
    date: VALIDATION_DATE,
    method:
      "Practice questions imported, but no approved independent P1 answer contract is present.",
    negativeSample: null,
    positiveSample: null,
    practiceHash: sha256(practice),
    reproducibility: {
      fixedSeed: FIXED_SEED,
      selectedIndex: practice.variations?.length
        ? seededIndex(`${FIXED_SEED}:p1:${id}`, practice.variations.length)
        : null,
    },
    runtimeHash: sha256({
      practice,
      template: null,
    }),
    status: issues.length ? "failed" : "pending",
    templateHash: null,
    templateId: `p1:${id}`,
    verificationNotes: issues,
    verifier: "scripts/validate-mimic-templates.mjs",
  };
}

const counts = Object.values(records).reduce(
  (summary, record) => {
    summary[record.status] += 1;
    return summary;
  },
  {
    failed: 0,
    pending: 0,
    verified: 0,
  },
);
const manifest = {
  counts,
  generatedAt: VALIDATION_DATE,
  schemaVersion: 1,
  sourceCommit: "ef5a578a04f424754ca3733f44f16eaff590f266",
  templates: records,
  validationPolicy:
    "Only per-template records with a matching runtimeHash and status=verified may be scored.",
};
writeFileSync(
  join(MIMIC_DIR, "template-validation.json"),
  `${JSON.stringify(canonicalize(manifest), null, 2)}\n`,
);

console.log(
  `Mimic validation: ${counts.verified} verified, ${counts.pending} pending, ${counts.failed} failed`,
);
