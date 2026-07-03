# Question Code Reference

Teacher tool question codes are display identifiers for classroom discussion and AI handoff.
They do not replace the stable `key` field used by presets, tests, generators, or validators.

## Format

`S{grade}T{term}-{topic}-{number}`

Examples:

- `S1T3-NA-01`: Secondary 1, Term 3, Number and Algebra, question 01.
- `S0T0-UC-01`: uncategorized demo question.

## Topic Abbreviations

| Abbreviation | topicKey | Chinese name |
| --- | --- | --- |
| `NA` | `number_and_algebra` | 數與代數 |
| `ME` | `measurement` | 度量 |
| `GE` | `geometry` | 幾何 |
| `DH` | `data_handling` | 數據處理 |
| `UC` | `uncategorized` | 未分類 / 示範題 |

## Usage

When asking another AI to fix or discuss a question, cite both fields where possible:

`S1T3-NA-04` / `hcf_or_lcm`

The code is for human-facing selection. The `key` remains the system contract.
