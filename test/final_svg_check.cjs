#!/usr/bin/env node
/*
 * Final SVG verification supplement for PR #21 (MacD).
 *
 * The existing runtime_random_export.cjs covers three preset × two fresh sandboxes +
 * same-session wrong/single retry invariance, but its probes are non-SVG types
 * (s1t2_prime_factor, frac_arith, poly_add_sub). This supplement focuses on the
 * three SVG question types called out in the user's final wrap-up:
 *
 *   - s1_term2_part_a: s1t2_coordinate (q013, type="coordinate", checkType="coordinatePoint")
 *   - s1_term3_part_a: congruence     (q013, type="congruence", checkType="congruenceReason")
 *   - s3_term3_part_a: triangle_center (q009, type="choice",     checkType="choiceKey")
 *
 * Verification:
 *   1. For each preset, read the local exercises/ runtime-export HTML.
 *   2. Extract QUESTION_SPECS and generate the target runtime question from
 *      its typeDef + params using tool/generators.js.
 *   3. Load tool/validators.js (Node-side).
 *   4. For the SVG question in each preset, assert:
 *        a. questionHTML OR imageSvg contains <svg ...> markup
 *        b. validators.checkAnswer(q, q.correctAnswer) === true (判分正確接受)
 *        c. validators.checkAnswer(q, "DEFINITELY_WRONG_$$$") === false (判分正確拒絕)
 *
 * Independent of vm sandbox issues with MathJax config; pure module-load + JSON-parse.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const generators = require(path.join(ROOT, "tool/generators.js"));
const validators = require(path.join(ROOT, "tool/validators.js"));

const TARGETS = [
  { preset: "s1_term2_part_a", file: "exercises/2526/s1/t2/part-a-01.html", probeQid: "q013", probeTypeKey: "s1t2_coordinate", note: "SVG coordinate plane" },
  { preset: "s1_term3_part_a", file: "exercises/2526/s1/t3/part-a-01.html", probeQid: "q013", probeTypeKey: "congruence",    note: "SVG triangle congruence" },
  { preset: "s3_term3_part_a", file: "exercises/2526/s3/t3/part-a-01.html", probeQid: "q009", probeTypeKey: "triangle_center", note: "SVG triangle center choice" },
];

function extractQuestionSpecs(html) {
  const m = html.match(/const\s+QUESTION_SPECS\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error("could not find const QUESTION_SPECS = [...] in HTML");
  // JSON.parse handles the literal safely (no eval, no Function constructor).
  return JSON.parse(m[1]);
}

function buildRuntimeQuestion(spec) {
  const generated = generators.generateQuestion(spec.typeDef, spec.params || {});
  return Object.assign({}, generated, {
    qid: spec.qid,
    typeKey: spec.typeKey,
    type: spec.typeDef.type,
    checkType: generated.checkType || spec.typeDef.checkType,
    prefix: generated.prefix || spec.typeDef.prefix || "",
    answerSpec: generated.answerSpec || spec.typeDef.answerSpec || null,
    options: generated.options || spec.typeDef.options || [],
  });
}

let passed = 0;
const failures = [];
function check(label, condition, detail = "") {
  if (condition) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? " — " + detail : ""}`); console.log(`  ✗ ${label}${detail ? " — " + detail : ""}`); }
}

(() => {
  console.log("\n=== Final SVG Supplement (Post-PR #21) ===");

  for (const target of TARGETS) {
    console.log(`\n--- ${target.preset} :: ${target.probeTypeKey} (${target.note}) ---`);
    const fileAbs = path.join(ROOT, target.file);
    const html = fs.readFileSync(fileAbs, "utf8");
    console.log(`  read ${html.length} bytes from ${target.file}`);

    let specs;
    try {
      specs = extractQuestionSpecs(html);
    } catch (e) {
      check(`${target.preset} parsed QUESTION_SPECS array`, false, e.message);
      continue;
    }
    check(`${target.preset} QUESTION_SPECS length matches preset (${target.probeQid} should be present)`, specs.length >= parseInt(target.probeQid.slice(1), 10),
      `got length ${specs.length}`);

    const spec = specs.find((q) => q.qid === target.probeQid);
    if (!spec) {
      check(`${target.preset} ${target.probeQid} (${target.probeTypeKey}) found`, false);
      continue;
    }
    check(`${target.preset} ${target.probeQid} typeKey matches`, spec.typeKey === target.probeTypeKey,
      `expected ${target.probeTypeKey}, got ${spec.typeKey}`);

    const q = buildRuntimeQuestion(spec);

    // SVG display: questionHTML or imageSvg should contain <svg ...> markup
    const htmlHasSvg = typeof q.questionHTML === "string" && q.questionHTML.includes("<svg");
    const imageHasSvg = typeof q.imageSvg === "string" && q.imageSvg.includes("<svg");
    check(`${target.preset} ${target.probeQid} SVG markup rendered (questionHTML or imageSvg)`,
      htmlHasSvg || imageHasSvg,
      `htmlHasSvg=${htmlHasSvg}, imageHasSvg=${imageHasSvg}, questionHTML length=${(q.questionHTML || "").length}, imageSvg length=${(q.imageSvg || "").length}`);

    // Scoring: correctAnswer should be accepted
    let correctResult;
    try {
      correctResult = validators.checkAnswer(q, q.correctAnswer);
    } catch (e) {
      correctResult = `THREW: ${e.message}`;
    }
    check(`${target.preset} ${target.probeQid} validator accepts correctAnswer`,
      correctResult === true,
      `correctAnswer=${JSON.stringify(q.correctAnswer)}, result=${correctResult}`);

    // Scoring: wrong answer should be rejected
    let wrongResult;
    try {
      wrongResult = validators.checkAnswer(q, "DEFINITELY_WRONG_$$$");
    } catch (e) {
      wrongResult = `THREW: ${e.message}`;
    }
    check(`${target.preset} ${target.probeQid} validator rejects wrong answer`,
      wrongResult === false,
      `result=${wrongResult}`);

    // For coordinate type: also verify the axis-value mode works
    if (target.probeTypeKey === "s1t2_coordinate" || target.probeTypeKey === "coordinate") {
      // Try with one of the listed answers (e.g. q.answers[0])
      const altAnswer = (q.answers || [])[0];
      if (altAnswer !== undefined) {
        const altResult = validators.checkAnswer(q, altAnswer);
        check(`${target.preset} ${target.probeQid} validator accepts alt answer ${JSON.stringify(altAnswer)}`,
          altResult === true, `result=${altResult}`);
      }
    }

    // For choice type (triangle_center): verify each option key is accepted if correct
    if (target.probeTypeKey === "triangle_center") {
      console.log(`    (triangle_center options: ${(q.options || []).map((o) => o.key).join(", ")}, correctAnswer=${q.correctAnswer})`);
      const correctOption = (q.options || []).find((o) => o.key === q.correctAnswer);
      check(`${target.preset} ${target.probeQid} correct option exists in options`,
        !!correctOption,
        `correctAnswer=${q.correctAnswer}, options=${(q.options || []).map((o) => o.key).join("|")}`);
      // Try clicking on each wrong option — should be rejected
      let wrongOptionRejected = true;
      for (const opt of (q.options || [])) {
        if (opt.key === q.correctAnswer) continue;
        const r = validators.checkAnswer(q, opt.key);
        if (r !== false) { wrongOptionRejected = false; break; }
      }
      check(`${target.preset} ${target.probeQid} all wrong options are rejected`, wrongOptionRejected);
    }
  }

  console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
  if (failures.length) {
    failures.forEach((f) => console.error("  - " + f));
    process.exit(1);
  }
})();
