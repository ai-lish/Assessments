#!/usr/bin/env node

import {
  createHash,
} from "node:crypto";
import {
  execFileSync,
} from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TARGET_ROOT = resolve(SCRIPT_DIR, "..");
const REPO_ROOT = resolve(TARGET_ROOT, "..");
const DATA_DIR = join(TARGET_ROOT, "data");
const IMAGES_DIR = join(TARGET_ROOT, "images");
const REPORTS_DIR = join(TARGET_ROOT, "reports");
const SCHEMA_VERSION = 1;
const IMAGE_DIRS = [
  ["images-p1", "p1"],
  ["images-p2", "p2"],
  ["answer-images", "p1-answers"],
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument sequence near ${key ?? "<end>"}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

function runGit(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
  }).trim();
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(readFileSync(filePath));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortObject(value[key])]),
    );
  }
  return value;
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), {
    recursive: true,
  });
  writeFileSync(filePath, `${JSON.stringify(sortObject(value), null, 2)}\n`);
}

function toPosix(filePath) {
  return filePath.split(sep).join("/");
}

function listFiles(rootPath) {
  if (!existsSync(rootPath)) {
    return [];
  }
  const output = [];
  const visit = (current) => {
    for (const name of readdirSync(current).sort()) {
      const fullPath = join(current, name);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        visit(fullPath);
      } else if (stats.isFile()) {
        output.push(fullPath);
      }
    }
  };
  visit(rootPath);
  return output;
}

function sourceStats(sourceRepo, sourcePath) {
  const fullPath = join(sourceRepo, sourcePath);
  if (!existsSync(fullPath)) {
    return {
      exists: false,
      fileCount: 0,
      sizeBytes: 0,
      sha256: null,
    };
  }
  const stats = statSync(fullPath);
  if (stats.isFile()) {
    return {
      exists: true,
      fileCount: 1,
      sizeBytes: stats.size,
      sha256: sha256File(fullPath),
    };
  }
  const files = listFiles(fullPath);
  const records = files.map((filePath) => ({
    path: toPosix(relative(fullPath, filePath)),
    sha256: sha256File(filePath),
    sizeBytes: statSync(filePath).size,
  }));
  const treeDigest = records
    .map((record) => `${record.path}\0${record.sha256}\0${record.sizeBytes}`)
    .join("\n");
  return {
    exists: true,
    fileCount: records.length,
    sizeBytes: records.reduce((sum, record) => sum + record.sizeBytes, 0),
    sha256: sha256Buffer(Buffer.from(treeDigest)),
  };
}

function scanConsumers(sourceHkdse, needles) {
  const textExtensions = new Set([
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".txt",
  ]);
  const consumers = [];
  for (const filePath of listFiles(sourceHkdse)) {
    if (!textExtensions.has(extname(filePath).toLowerCase())) {
      continue;
    }
    const content = readFileSync(filePath, "utf8");
    if (needles.some((needle) => content.includes(needle))) {
      consumers.push(toPosix(relative(dirname(sourceHkdse), filePath)));
    }
  }
  return consumers.sort();
}

function sanitizeReportValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeReportValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeReportValue(entry),
      ]),
    );
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll("\\", "/");
    const hkdseIndex = normalized.indexOf("/hkdse/");
    if (normalized.startsWith("/") && hkdseIndex >= 0) {
      return normalized.slice(hkdseIndex + 1);
    }
  }
  return value;
}

function compareJsonObjects(rootObject, pagesObject) {
  const rootKeys = Object.keys(rootObject).sort();
  const pagesKeys = Object.keys(pagesObject).sort();
  const onlyInRoot = rootKeys.filter((key) => !(key in pagesObject));
  const onlyInPages = pagesKeys.filter((key) => !(key in rootObject));
  const changed = rootKeys
    .filter((key) => key in pagesObject)
    .filter(
      (key) =>
        JSON.stringify(sortObject(rootObject[key])) !==
        JSON.stringify(sortObject(pagesObject[key])),
    )
    .map((id) => ({
      id,
      root: sanitizeReportValue(rootObject[id]),
      pages: sanitizeReportValue(pagesObject[id]),
    }));
  return {
    rootKeyCount: rootKeys.length,
    pagesKeyCount: pagesKeys.length,
    onlyInRoot,
    onlyInPages,
    changedCount: changed.length,
    changed,
  };
}

function normalizeId(rawId) {
  const match = String(rawId).match(/^(\d{4})Q(\d{1,2})$/);
  if (!match) {
    throw new Error(`Invalid HKDSE question id: ${rawId}`);
  }
  return `${match[1]}Q${match[2].padStart(2, "0")}`;
}

function imageRecord(sourceRepo, sourceDirectory, destinationDirectory, fileName, refs) {
  const sourcePath = join(sourceRepo, "hkdse", sourceDirectory, fileName);
  const destinationPath = join(IMAGES_DIR, destinationDirectory, fileName);
  const exists = existsSync(sourcePath);
  return {
    sourcePath: `hkdse/${sourceDirectory}/${fileName}`,
    destinationPath: exists
      ? `hkdse/images/${destinationDirectory}/${fileName}`
      : null,
    sizeBytes: exists ? statSync(sourcePath).size : 0,
    sha256: exists ? sha256File(sourcePath) : null,
    referencedBy: [...refs].sort(),
    referenceCount: refs.size,
    copied: exists && refs.size > 0,
    orphan: refs.size === 0,
  };
}

function buildImageInventory(sourceRepo, referenceMap) {
  const records = [];
  for (const [sourceDirectory, destinationDirectory] of IMAGE_DIRS) {
    const sourceDir = join(sourceRepo, "hkdse", sourceDirectory);
    const sourceFiles = readdirSync(sourceDir)
      .filter((name) => statSync(join(sourceDir, name)).isFile())
      .sort();
    const knownFiles = new Set(sourceFiles);
    const refsForDirectory = referenceMap.get(sourceDirectory);
    for (const [fileName, refs] of refsForDirectory.entries()) {
      if (!knownFiles.has(fileName)) {
        records.push(
          imageRecord(
            sourceRepo,
            sourceDirectory,
            destinationDirectory,
            fileName,
            refs,
          ),
        );
      }
    }
    for (const fileName of sourceFiles) {
      records.push(
        imageRecord(
          sourceRepo,
          sourceDirectory,
          destinationDirectory,
          fileName,
          refsForDirectory.get(fileName) ?? new Set(),
        ),
      );
    }
  }
  return records.sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath),
  );
}

function copyReferencedImages(sourceRepo, records) {
  for (const record of records) {
    if (!record.copied) {
      continue;
    }
    const sourcePath = join(sourceRepo, record.sourcePath);
    const destinationPath = join(REPO_ROOT, record.destinationPath);
    mkdirSync(dirname(destinationPath), {
      recursive: true,
    });
    copyFileSync(sourcePath, destinationPath);
  }
}

function summarizeImages(records) {
  const bySourceDirectory = {};
  for (const [sourceDirectory] of IMAGE_DIRS) {
    const prefix = `hkdse/${sourceDirectory}/`;
    const directoryRecords = records.filter((record) =>
      record.sourcePath.startsWith(prefix),
    );
    bySourceDirectory[sourceDirectory] = {
      sourceFiles: directoryRecords.filter((record) => record.sizeBytes > 0).length,
      referencedFiles: directoryRecords.filter(
        (record) => record.referenceCount > 0,
      ).length,
      copiedFiles: directoryRecords.filter((record) => record.copied).length,
      orphanFiles: directoryRecords.filter(
        (record) => record.sizeBytes > 0 && record.orphan,
      ).length,
      missingReferences: directoryRecords.filter(
        (record) => record.referenceCount > 0 && record.sizeBytes === 0,
      ).length,
      sourceBytes: directoryRecords.reduce(
        (sum, record) => sum + record.sizeBytes,
        0,
      ),
      copiedBytes: directoryRecords
        .filter((record) => record.copied)
        .reduce((sum, record) => sum + record.sizeBytes, 0),
    };
  }

  const byHash = new Map();
  for (const record of records) {
    if (!record.sha256) {
      continue;
    }
    if (!byHash.has(record.sha256)) {
      byHash.set(record.sha256, []);
    }
    byHash.get(record.sha256).push(record.sourcePath);
  }
  const duplicateGroups = [...byHash.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({
      sha256,
      paths: paths.sort(),
    }))
    .sort((left, right) => left.sha256.localeCompare(right.sha256));

  return {
    bySourceDirectory,
    duplicateGroupCount: duplicateGroups.length,
    duplicateGroups,
  };
}

function getQuestionBankIntegrity() {
  const mergeBase = runGit(REPO_ROOT, ["merge-base", "HEAD", "origin/main"]);
  const baseContent = execFileSync(
    "git",
    ["-C", REPO_ROOT, "show", `${mergeBase}:question-bank.json`],
  );
  const workingContent = readFileSync(join(REPO_ROOT, "question-bank.json"));
  return {
    mergeBase,
    mergeBaseSha256: sha256Buffer(baseContent),
    workingTreeSha256: sha256Buffer(workingContent),
    unchanged: Buffer.compare(baseContent, workingContent) === 0,
  };
}

function directorySize(rootPath) {
  return listFiles(rootPath).reduce(
    (sum, filePath) => sum + statSync(filePath).size,
    0,
  );
}

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args["source-commit"]) {
  throw new Error(
    "Usage: import-from-ai-learning.mjs --source PATH --source-commit SHA [--imported-at ISO]",
  );
}

const sourceRepo = resolve(args.source);
const sourceCommit = args["source-commit"];
const importedAt = args["imported-at"] ?? new Date().toISOString();
if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
  throw new Error("--source-commit must be a full 40-character lowercase SHA");
}
if (Number.isNaN(Date.parse(importedAt))) {
  throw new Error("--imported-at must be an ISO-8601 timestamp");
}
const actualSourceCommit = runGit(sourceRepo, ["rev-parse", "HEAD"]);
if (actualSourceCommit !== sourceCommit) {
  throw new Error(
    `Source HEAD ${actualSourceCommit} does not match requested ${sourceCommit}`,
  );
}

const sourceHkdse = join(sourceRepo, "hkdse");
const sourcePaths = {
  p1Questions: "hkdse/pages/p1_all_scan_results.json",
  p1Answers: "hkdse/pages/p1_answer_ocr_results.json",
  p2Questions: "hkdse/pages/p2_final_results.json",
  p2SolutionsRoot: "hkdse/p2_solutions.json",
  p2SolutionsPages: "hkdse/pages/p2_solutions.json",
  p2LatexRoot: "hkdse/p2_latex_ocr_results.json",
  p2LatexPages: "hkdse/pages/p2_latex_ocr_results.json",
};
const sourceJson = Object.fromEntries(
  Object.entries(sourcePaths).map(([key, sourcePath]) => [
    key,
    readJson(join(sourceRepo, sourcePath)),
  ]),
);

rmSync(DATA_DIR, {
  recursive: true,
  force: true,
});
rmSync(IMAGES_DIR, {
  recursive: true,
  force: true,
});
rmSync(REPORTS_DIR, {
  recursive: true,
  force: true,
});
mkdirSync(DATA_DIR, {
  recursive: true,
});
mkdirSync(IMAGES_DIR, {
  recursive: true,
});
mkdirSync(REPORTS_DIR, {
  recursive: true,
});

const metadata = {
  schemaVersion: SCHEMA_VERSION,
  sourceRepository: "ai-lish/ai-learning",
  sourceCommit,
  importedAt,
};
const p1Ids = Object.keys(sourceJson.p1Questions)
  .map(normalizeId)
  .sort();
const p2Ids = Object.keys(sourceJson.p2Questions)
  .map(normalizeId)
  .sort();

const p1Questions = p1Ids.map((id) => {
  const source = sourceJson.p1Questions[id];
  return {
    id,
    year: Number(source.year ?? id.slice(0, 4)),
    question: source.question ?? "",
    options: source.options ?? {
      A: "",
      B: "",
      C: "",
      D: "",
    },
    hasSvg: Boolean(source.has_svg),
    svgSlots: source.svg_slots ?? [],
    topic: source.topic ?? "",
    imagePath: `../images/p1/${id}.jpg`,
    ocrStatus: "unverified",
  };
});

const answerResults = sourceJson.p1Answers.results ?? {};
const p1Answers = p1Ids.map((id) => {
  const source = answerResults[id] ?? {};
  const text = typeof source.text === "string" ? source.text : "";
  const sourceImagePath =
    typeof source.image_path === "string" ? source.image_path : "";
  const imageName = sourceImagePath ? basename(sourceImagePath) : null;
  return {
    id,
    text,
    imagePath: imageName ? `../images/p1-answers/${imageName}` : null,
    hasText: text.trim().length > 0,
    ocrStatus: text.trim().length > 0 ? "unverified" : "image-only-unverified",
    verified: false,
  };
});

const p2Questions = p2Ids.map((id) => {
  const source = sourceJson.p2Questions[id];
  return {
    id,
    year: Number(id.slice(0, 4)),
    question: source.question ?? "",
    options: source.options ?? {},
    hasSvg: Boolean(source.has_svg),
    svgSlots: source.svg_slots ?? [],
    topic: source.topic ?? "",
    imagePath: `../images/p2/${id}.jpg`,
    ocrStatus: "unverified",
  };
});

const p2Solutions = Object.keys(sourceJson.p2SolutionsRoot)
  .map(normalizeId)
  .sort()
  .map((id) => {
    const source = sourceJson.p2SolutionsRoot[id];
    return {
      id,
      answer: source.answer,
      solution: source.solution ?? "",
      topic: source.topic ?? "",
      sourceQuestion: source.question ?? "",
      checkType: "choiceKey",
      canonicalSource: sourcePaths.p2SolutionsRoot,
    };
  });

const p1TextCount = p1Answers.filter((answer) => answer.hasText).length;
const p2SolutionIds = new Set(p2Solutions.map((solution) => solution.id));
const p2MissingIds = p2Ids.filter((id) => !p2SolutionIds.has(id));

writeJson(join(DATA_DIR, "p1-questions.json"), {
  metadata: {
    ...metadata,
    sourcePath: sourcePaths.p1Questions,
    questionCount: p1Questions.length,
  },
  questions: p1Questions,
});
writeJson(join(DATA_DIR, "p1-answers.json"), {
  metadata: {
    ...metadata,
    sourcePath: sourcePaths.p1Answers,
    sourceWrapper: {
      total: sourceJson.p1Answers.total,
      successful: sourceJson.p1Answers.successful,
      failed: sourceJson.p1Answers.failed,
      resultCount: Object.keys(answerResults).length,
    },
    questionIntersectionCount: p1Answers.length,
    nonEmptyTextCount: p1TextCount,
    emptyTextCount: p1Answers.length - p1TextCount,
  },
  answers: p1Answers,
});
writeJson(join(DATA_DIR, "p2-questions.json"), {
  metadata: {
    ...metadata,
    sourcePath: sourcePaths.p2Questions,
    questionCount: p2Questions.length,
  },
  questions: p2Questions,
});
writeJson(join(DATA_DIR, "p2-solutions.json"), {
  metadata: {
    ...metadata,
    sourcePath: sourcePaths.p2SolutionsRoot,
    solutionCount: p2Solutions.length,
    missingSolutionCount: p2MissingIds.length,
    missingSolutionIds: p2MissingIds,
  },
  solutions: p2Solutions,
});
writeJson(join(DATA_DIR, "catalog.json"), {
  metadata,
  papers: {
    p1: {
      years: [...new Set(p1Questions.map((question) => question.year))].sort(),
      questionCount: p1Questions.length,
      answerTextCount: p1TextCount,
      answerTextMissingCount: p1Questions.length - p1TextCount,
    },
    p2: {
      years: [...new Set(p2Questions.map((question) => question.year))].sort(),
      questionCount: p2Questions.length,
      solutionCount: p2Solutions.length,
      solutionMissingCount: p2MissingIds.length,
    },
  },
  totalQuestionCount: p1Questions.length + p2Questions.length,
});

const references = new Map(
  IMAGE_DIRS.map(([sourceDirectory]) => [sourceDirectory, new Map()]),
);
function addImageReference(sourceDirectory, fileName, reference) {
  const directoryMap = references.get(sourceDirectory);
  if (!directoryMap.has(fileName)) {
    directoryMap.set(fileName, new Set());
  }
  directoryMap.get(fileName).add(reference);
}
for (const question of p1Questions) {
  addImageReference("images-p1", `${question.id}.jpg`, `p1:${question.id}`);
}
for (const question of p2Questions) {
  addImageReference("images-p2", `${question.id}.jpg`, `p2:${question.id}`);
}
for (const answer of p1Answers) {
  if (answer.imagePath) {
    addImageReference(
      "answer-images",
      basename(answer.imagePath),
      `p1-answer:${answer.id}`,
    );
  }
}

const imageRecords = buildImageInventory(sourceRepo, references);
copyReferencedImages(sourceRepo, imageRecords);
const imageSummary = summarizeImages(imageRecords);
writeJson(join(REPORTS_DIR, "image-inventory.json"), {
  metadata,
  summary: imageSummary,
  files: imageRecords,
});

const p2SolutionsDifference = {
  metadata,
  root: {
    path: sourcePaths.p2SolutionsRoot,
    ...sourceStats(sourceRepo, sourcePaths.p2SolutionsRoot),
  },
  pages: {
    path: sourcePaths.p2SolutionsPages,
    ...sourceStats(sourceRepo, sourcePaths.p2SolutionsPages),
  },
  relationship: "manual-review; not deduplicated",
  ...compareJsonObjects(
    sourceJson.p2SolutionsRoot,
    sourceJson.p2SolutionsPages,
  ),
};
writeJson(
  join(REPORTS_DIR, "p2-solutions-root-vs-pages.json"),
  p2SolutionsDifference,
);

const p2LatexDifference = {
  metadata,
  root: {
    path: sourcePaths.p2LatexRoot,
    ...sourceStats(sourceRepo, sourcePaths.p2LatexRoot),
  },
  pages: {
    path: sourcePaths.p2LatexPages,
    ...sourceStats(sourceRepo, sourcePaths.p2LatexPages),
  },
  relationship: "manual-review; not deduplicated",
  ...compareJsonObjects(sourceJson.p2LatexRoot, sourceJson.p2LatexPages),
};
writeJson(
  join(REPORTS_DIR, "p2-latex-root-vs-pages.json"),
  p2LatexDifference,
);

const dispositionSpecs = [
  {
    sourcePath: sourcePaths.p2SolutionsRoot,
    disposition: "keep",
    destinationPath: "hkdse/data/p2-solutions.json",
    needles: ["p2_solutions.json"],
    canonicalReason:
      "The live P2 student page fetches the root file; V3 designates it canonical.",
    unresolvedDifference:
      "pages copy has two fewer keys; see p2-solutions-root-vs-pages.json",
  },
  {
    sourcePath: sourcePaths.p2SolutionsPages,
    disposition: "manual-review",
    destinationPath: null,
    needles: ["pages/p2_solutions.json"],
    canonicalReason: "Divergent pages copy cannot override the live root canonical.",
    unresolvedDifference:
      "2021Q32 and 2022Q34 exist only in root; see difference report.",
  },
  {
    sourcePath: sourcePaths.p2LatexRoot,
    disposition: "manual-review",
    destinationPath: null,
    needles: ["p2_latex_ocr_results.json"],
    canonicalReason:
      "The teacher P2 review page fetches the root file; migration is deferred to A4.",
    unresolvedDifference:
      "Root and pages contain 12 changed records; see p2-latex-root-vs-pages.json.",
  },
  {
    sourcePath: sourcePaths.p2LatexPages,
    disposition: "manual-review",
    destinationPath: null,
    needles: ["pages/p2_latex_ocr_results.json"],
    canonicalReason: "Teacher/editor dependency is deferred to A4.",
    unresolvedDifference:
      "Root and pages contain 12 changed records; see difference report.",
  },
  {
    sourcePath: "hkdse/pages/backup-20260412T031151Z",
    disposition: "exclude",
    destinationPath: null,
    needles: ["backup-20260412T031151Z"],
    canonicalReason: "Historical backup is not student runtime.",
    unresolvedDifference: null,
  },
  {
    sourcePath: "hkdse/__pycache__",
    disposition: "exclude",
    destinationPath: null,
    needles: ["__pycache__", ".pyc"],
    canonicalReason: "Python build artifacts are reproducible and not runtime.",
    unresolvedDifference: null,
  },
  {
    sourcePath: "hkdse/evidence",
    disposition: "reference-check",
    destinationPath: null,
    needles: ["evidence/"],
    canonicalReason:
      "Evidence is teacher workflow data and is outside A1 student runtime.",
    unresolvedDifference: "A4 must decide each actual teacher-page dependency.",
  },
  {
    sourcePath: "../ocr-output/",
    resolvedSourcePath: "hkdse/ocr-output",
    disposition: "reference-check",
    destinationPath: null,
    needles: [
      "../ocr-output/",
      "final_merged_results.json",
      "svg-p1",
      "svg_p2",
    ],
    canonicalReason:
      "Review/editor fallbacks must only be repointed when source files exist.",
    unresolvedDifference:
      "The source directory is absent at the pinned commit; A4 must show unavailable state instead of silent 404.",
  },
  {
    sourcePath: "hkdse/mimic-generator",
    disposition: "keep-selected",
    destinationPath: null,
    needles: ["mimic-generator/"],
    canonicalReason:
      "Selected mimic runtime belongs to A3; template editor belongs to A4.",
    unresolvedDifference:
      "A1 records references only and intentionally does not copy A3/A4 assets.",
  },
  {
    sourcePath: "hkdse/mimic-generator/auto_templates_all.json",
    disposition: "reference-check",
    destinationPath: null,
    needles: ["auto_templates_all.json"],
    canonicalReason:
      "Referenced by review_p1.html and template-editor-v3.html.",
    unresolvedDifference:
      "A3/A4 must choose keep, repoint, or remove; old relative URLs may not remain.",
  },
  {
    sourcePath: "hkdse/ocr_log.txt",
    disposition: "exclude",
    destinationPath: null,
    needles: ["ocr_log.txt"],
    canonicalReason: "Pinned source file is empty and has no runtime purpose.",
    unresolvedDifference: null,
  },
  {
    sourcePath: "hkdse/images-p1",
    disposition: "keep-allowlist",
    destinationPath: "hkdse/images/p1",
    needles: ["images-p1/"],
    canonicalReason: "Only images referenced by the 198 P1 runtime records are copied.",
    unresolvedDifference: "Unreferenced source images remain listed as orphans.",
  },
  {
    sourcePath: "hkdse/images-p2",
    disposition: "keep-allowlist",
    destinationPath: "hkdse/images/p2",
    needles: ["images-p2/"],
    canonicalReason: "All 495 P2 runtime records reference one source image.",
    unresolvedDifference: null,
  },
  {
    sourcePath: "hkdse/answer-images",
    disposition: "keep-allowlist",
    destinationPath: "hkdse/images/p1-answers",
    needles: ["answer-images/"],
    canonicalReason:
      "Only answer images referenced by the 198-question P1 intersection are copied.",
    unresolvedDifference: "Unreferenced source images remain listed as orphans.",
  },
];

const dispositionEntries = dispositionSpecs.map((spec) => {
  const statsPath = spec.resolvedSourcePath ?? spec.sourcePath;
  const consumers = scanConsumers(sourceHkdse, spec.needles);
  return {
    sourcePath: spec.sourcePath,
    resolvedSourcePath: spec.resolvedSourcePath ?? spec.sourcePath,
    disposition: spec.disposition,
    destinationPath: spec.destinationPath,
    consumerCount: consumers.length,
    consumers,
    source: sourceStats(sourceRepo, statsPath),
    canonicalReason: spec.canonicalReason,
    unresolvedDifference: spec.unresolvedDifference,
  };
});
writeJson(join(REPORTS_DIR, "disposition-manifest.json"), {
  metadata,
  entries: dispositionEntries,
});

const canonicalOutputPath = join(DATA_DIR, "p2-solutions.json");
writeJson(join(REPORTS_DIR, "canonical-consistency.json"), {
  metadata,
  p2Solutions: {
    canonicalSourcePath: sourcePaths.p2SolutionsRoot,
    canonicalSourceSha256: sha256File(
      join(sourceRepo, sourcePaths.p2SolutionsRoot),
    ),
    outputPath: "hkdse/data/p2-solutions.json",
    outputSha256: sha256File(canonicalOutputPath),
    sourceQuestionCount: Object.keys(sourceJson.p2SolutionsRoot).length,
    outputSolutionCount: p2Solutions.length,
    transformationRules: [
      "Sort and normalize stable ids as YYYYQNN.",
      "Copy answer, solution, topic, and source question without inventing missing data.",
      "Add checkType=choiceKey and canonicalSource metadata.",
      "Do not merge or overwrite from the divergent pages copy.",
    ],
    differenceReport: "hkdse/reports/p2-solutions-root-vs-pages.json",
  },
  p2LatexDifferenceReport: "hkdse/reports/p2-latex-root-vs-pages.json",
});

const questionBankIntegrity = getQuestionBankIntegrity();
writeJson(
  join(REPORTS_DIR, "question-bank-integrity.json"),
  questionBankIntegrity,
);

writeJson(join(REPORTS_DIR, "runtime-summary.json"), {
  metadata,
  counts: {
    p1Questions: p1Questions.length,
    p1AnswersWithText: p1TextCount,
    p1AnswersWithoutText: p1Answers.length - p1TextCount,
    p2Questions: p2Questions.length,
    p2Solutions: p2Solutions.length,
    p2MissingSolutions: p2MissingIds.length,
    totalQuestions: p1Questions.length + p2Questions.length,
  },
  sourceImages: imageSummary.bySourceDirectory,
  runtimeSizeBytes:
    directorySize(DATA_DIR) + directorySize(IMAGES_DIR),
  questionBankIntegrity,
});

for (const validator of [
  "validate-data.mjs",
  "validate-images.mjs",
  "validate-grading.mjs",
  "validate-reports.mjs",
]) {
  execFileSync(process.execPath, [join(TARGET_ROOT, "test", validator)], {
    stdio: "inherit",
  });
}

console.log(
  `Imported ${p1Questions.length} P1 and ${p2Questions.length} P2 questions from ${sourceCommit}.`,
);
