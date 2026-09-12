import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.join(root, "dist", "s4-ch1-question-bundle.js");
await mkdir(path.dirname(outfile), { recursive: true });
await build({
  entryPoints: [path.join(root, "adapters", "ai-learning-s4ch1.js")],
  bundle: true,
  format: "iife",
  globalName: "AssessmentsS4Ch1QuestionBundle",
  platform: "browser",
  target: ["es2020"],
  legalComments: "none",
  minify: false,
  sourcemap: false,
  outfile,
  banner: {
    js: "/* Generated from Assessments S4 Ch1 question templates; do not edit. */"
  }
});
await writeFile(path.join(root, "dist", "s4-ch1-question-bundle.manifest.json"), JSON.stringify({
  schemaVersion: 1,
  course: "s4",
  chapter: "ch1",
  source: "templates/quadratic-equations + questions/s4/ch1",
  entry: "adapters/ai-learning-s4ch1.js",
  publicFile: "s4-ch1-question-bundle.js"
}, null, 2) + "\n");
console.log(`Built ${path.relative(root, outfile)}`);
