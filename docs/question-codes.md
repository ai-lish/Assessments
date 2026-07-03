# Question Code Reference

Teacher tool question codes are display identifiers for classroom discussion and AI handoff.
They do not replace the stable `key` field used by presets, tests, generators, or validators.

## Format

`{schoolYear}-{grade}-{term}-{questionNo}-{topicCode}-{familyNo}`

Examples:

- `2526-S1-T3-01-NA-1`: 2025-26 school year, Secondary 1, Term 3, question 01, Number and Algebra family 1.
- `2526-S0-T0-01-UC-1`: uncategorized demo question.

Rules:

- `schoolYear` is a four-digit school-year code, for example `2526` for 2025-26.
- `grade` uses `S1`, `S2`, `S3`; demo or uncategorized examples use `S0`.
- `term` uses `T1`, `T2`, `T3`; demo or uncategorized examples use `T0`.
- `questionNo` is the two-digit order inside the preset.
- `topicCode` is one of the topic abbreviations below.
- `familyNo` is assigned by generator/question semantics, not by grade. Once assigned, a family number must not be reused or changed.

## Topic Abbreviations

| Abbreviation | topicKey | Chinese name |
| --- | --- | --- |
| `NA` | `number_and_algebra` | 數與代數 |
| `ME` | `measurement` | 度量 |
| `GE` | `geometry` | 幾何 |
| `DH` | `data_handling` | 數據處理 |
| `UC` | `uncategorized` | 未分類 / 示範題 |

## Family Registry

| Family | Chinese family name | Generator key | Current code |
| --- | --- | --- | --- |
| `UC-1` | 圓面積 | `area_circle` | `2526-S0-T0-01-UC-1` |
| `UC-2` | 角的類型 | `angle_type` | `2526-S0-T0-02-UC-2` |
| `NA-1` | 分數運算 | `frac_arith` | `2526-S1-T3-01-NA-1` |
| `NA-2` | 負數的乘方 | `neg_power` | `2526-S1-T3-02-NA-2` |
| `NA-3` | 質因數分解 | `prime_factor` | `2526-S1-T3-03-NA-3` |
| `NA-4` | HCF / LCM | `hcf_or_lcm` | `2526-S1-T3-04-NA-4` |
| `NA-5` | 指數律 | `exp_law` | `2526-S1-T3-05-NA-5` |
| `NA-6` | 代數化簡 | `alg_simplify` | `2526-S1-T3-06-NA-6` |
| `NA-7` | 解一元一次方程 | `solve_eq` | `2526-S1-T3-07-NA-7` |
| `NA-8` | 文字轉代數式 | `word_to_alg` | `2526-S1-T3-08-NA-8` |
| `NA-9` | 多項式降冪排列 | `poly_desc` | `2526-S1-T3-11-NA-9` |
| `NA-10` | 公式代入 | `formula_sub` | `2526-S1-T3-12-NA-10` |
| `NA-11` | 數列通項 | `seq_nth` | `2526-S1-T3-15-NA-11` |
| `ME-1` | 有效數字 | `sig_fig` | `2526-S1-T3-09-ME-1` |
| `ME-2` | 分數化百分數 | `frac_to_pct` | `2526-S1-T3-10-ME-2` |
| `GE-1` | 全等三角形判定 | `congruence` | `2526-S1-T3-13-GE-1` |
| `GE-2` | 坐標輸入及點選 | `coordinate` | `2526-S1-T3-14-GE-2` |
| `DH-1` | 離散／連續數據 | `data_type` | `2526-S1-T3-16-DH-1` |

## Usage

When asking another AI to fix or discuss a question, cite both fields where possible:

`2526-S1-T3-04-NA-4` / `hcf_or_lcm`

The code is for human-facing selection. The `key` remains the system contract.
