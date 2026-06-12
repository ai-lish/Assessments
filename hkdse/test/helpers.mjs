import {
  createHash,
} from "node:crypto";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import {
  dirname,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

export const HKDSE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(HKDSE_ROOT, relativePath), "utf8"));
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, label) {
  assert(
    actual === expected,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

export function fileExists(relativePath) {
  return existsSync(resolve(HKDSE_ROOT, relativePath));
}

export function sha256File(relativePath) {
  return createHash("sha256")
    .update(readFileSync(resolve(HKDSE_ROOT, relativePath)))
    .digest("hex");
}

export function unique(values) {
  return new Set(values).size === values.length;
}
