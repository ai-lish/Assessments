# HKDSE data module

This directory is the independent HKDSE data module described by
`PLANNING/20260612_HKDSE_P1_P2_ASSESSMENTS_V3.md`.

PR A1 contains data import, image allowlists, disposition reports, and validation only.
It intentionally contains no student or teacher HTML. Those interfaces belong to later
PR A2 and PR A4. Mimic-template runtime belongs to PR A3.

## Layout

- `data/`: generated student runtime JSON.
- `images/`: only source images referenced by the 198 P1 questions, 495 P2 questions,
  or the 198-question P1 answer intersection.
- `reports/`: source disposition, canonical differences, image inventory, and integrity
  evidence.
- `scripts/`: deterministic Node.js importer.
- `teacher-data/`: scope marker for teacher-only data deferred to PR A4.
- `test/`: schema, coverage, image, grading, and report validation.

## Reproduce the import

Use a clean checkout of `ai-lish/ai-learning` at the exact source commit:

```bash
node hkdse/scripts/import-from-ai-learning.mjs \
  --source /absolute/path/to/ai-learning \
  --source-commit ef5a578a04f424754ca3733f44f16eaff590f266 \
  --imported-at 2026-06-12T00:00:00.000Z
```

The importer refuses a source checkout whose `HEAD` does not match `--source-commit`.
It regenerates `data/`, `images/`, and `reports/`, then automatically runs all A1
validators.

Run validation without importing:

```bash
node hkdse/test/run-all.mjs
```
