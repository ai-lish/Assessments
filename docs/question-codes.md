# Question Code Reference

Teacher tool question codes are display identifiers for classroom discussion and AI handoff.
They do not replace the stable `key` field used by presets, tests, generators, or validators.

## Source Prefixes

| Prefix | Meaning | Use |
| --- | --- | --- |
| `LSC` | 校內改編題 | Current school-created or school-adapted questions |
| `DSE` | 公開試改編題 | Reserved for future public-exam adaptations |

## LSC Format

`LSC-{schoolYear}-{grade}-{term}-{questionNo}-{topicCode}-{familyNo}`

Example:

- `LSC-2526-S1-T3-01-NA-1`: LSC source, 2025-26 school year, Secondary 1, Term 3, question 01, Number and Algebra family 1.

Rules:

- `schoolYear` is a four-digit school-year code, for example `2526` for 2025-26.
- `grade` uses `S1`, `S2`, `S3`; demo or uncategorized examples may use `S0`.
- `term` uses `T1`, `T2`, `T3`; demo or uncategorized examples may use `T0`.
- `questionNo` is the two-digit order inside the preset.
- `topicCode` is one of the topic abbreviations below.
- `familyNo` is assigned by generator/question semantics, not by grade. Once assigned, a family number must not be reused or changed.

## DSE Reserved Format

`DSE-{year}-{paper}-{part}-{questionNo}-{topicCode}-{familyNo}`

Example:

- `DSE-2025-P1-A1-01-NA-1`: DSE source, 2025 paper, Paper 1, Part A1, question 01, Number and Algebra family 1.

No current question-bank entry uses a `DSE` code. The format is reserved for later DSE-adapted content.

## Topic Abbreviations

| Abbreviation | topicKey | Chinese name |
| --- | --- | --- |
| `NA` | `number_and_algebra` | 數與代數 |
| `ME` | `measurement` | 度量 |
| `GE` | `geometry` | 幾何 |
| `DH` | `data_handling` | 數據處理 |
| `UC` | `uncategorized` | 未分類 / 示範題；僅供無法歸類題型，現時無成員 |

## Family Registry

| Family | Chinese family name | Generator key | Current code |
| --- | --- | --- | --- |
| `NA-1` | 分數運算 | `frac_arith` | `LSC-2526-S1-T3-01-NA-1` |
| `NA-2` | 負數的乘方 | `neg_power` | `LSC-2526-S1-T3-02-NA-2` |
| `NA-3` | 質因數分解 | `prime_factor` | `LSC-2526-S1-T3-03-NA-3`, `LSC-2526-S1-T2-01-NA-3` |
| `NA-4` | HCF / LCM | `hcf_or_lcm` | `LSC-2526-S1-T3-04-NA-4`, `LSC-2526-S1-T2-02-NA-4` |
| `NA-5` | 指數律 / 零指數定律 | `exp_law` | `LSC-2526-S1-T3-05-NA-5`, `LSC-2526-S3-T3-04-NA-5` |
| `NA-6` | 代數化簡 / 合併同類項 | `alg_simplify` | `LSC-2526-S1-T3-06-NA-6`, `LSC-2526-S1-T2-11-NA-6` |
| `NA-7` | 解一元一次方程 | `solve_eq` | `LSC-2526-S1-T3-07-NA-7`, `LSC-2526-S1-T2-06-NA-7`, `LSC-2526-S1-T2-07-NA-7` |
| `NA-8` | 文字轉代數式 | `word_to_alg` | `LSC-2526-S1-T3-08-NA-8`, `LSC-2526-S1-T2-05-NA-8` |
| `NA-9` | 多項式降冪排列 | `poly_desc` | `LSC-2526-S1-T3-11-NA-9`, `LSC-2526-S1-T2-09-NA-9` |
| `NA-10` | 公式代入 | `formula_sub` | `LSC-2526-S1-T3-12-NA-10` |
| `NA-11` | 數列通項 | `seq_nth` | `LSC-2526-S1-T3-15-NA-11` |
| `NA-12` | 有向數加法 | `directed_add` | `LSC-2526-S1-T2-03-NA-12` |
| `NA-13` | 有向數乘法 | `directed_mul` | `LSC-2526-S1-T2-04-NA-13` |
| `NA-14` | 常數項 | `poly_constant` | `LSC-2526-S1-T2-10-NA-14` |
| `NA-15` | 展開括號 | `expand_bracket` | `LSC-2526-S1-T2-12-NA-15` |
| `NA-16` | 多項式加減及去括號 | `poly_add_sub` | `LSC-2526-S3-T3-01-NA-16` |
| `NA-17` | 二項式展開 / 完全平方公式 | `binomial_expand` | `LSC-2526-S3-T3-02-NA-17`, `LSC-2526-S3-T3-03-NA-17` |
| `NA-18` | 平方差因式分解 | `factor_diff_sq` | `LSC-2526-S3-T3-05-NA-18` |
| `NA-19` | 十字相乘法 | `factor_cross` | `LSC-2526-S3-T3-06-NA-19` |
| `NA-20` | 科學記數法 | `sci_notation` | `LSC-2526-S3-T3-07-NA-20` |
| `NA-21` | 一元一次不等式 | `solve_ineq` | `LSC-2526-S3-T3-08-NA-21` |
| `ME-1` | 有效數字 | `sig_fig` | `LSC-2526-S1-T3-09-ME-1` |
| `ME-2` | 分數化百分數 | `frac_to_pct` | `LSC-2526-S1-T3-10-ME-2` |
| `ME-3` | 圓面積 | `area_circle` | `LSC-2526-S0-T0-01-ME-3` |
| `ME-4` | 長方體體積 | `cuboid_volume` | `LSC-2526-S1-T2-08-ME-4` |
| `ME-5` | 球體 / 半球體 / 圓柱 / 圓錐量度 | `solid_mensuration` | `LSC-2526-S3-T3-10-ME-5`, `LSC-2526-S3-T3-11-ME-5`, `LSC-2526-S3-T3-12-ME-5` |
| `ME-6` | 扇形量度 | `sector_measure` | `LSC-2526-S3-T3-13-ME-6` |
| `ME-7` | 畢氏定理配合圓錐 | `pyth_cone` | `LSC-2526-S3-T3-14-ME-7` |
| `GE-1` | 全等三角形判定 | `congruence` | `LSC-2526-S1-T3-13-GE-1` |
| `GE-2` | 坐標輸入及點選 | `coordinate` | `LSC-2526-S1-T3-14-GE-2`, `LSC-2526-S1-T2-13-GE-2` |
| `GE-3` | 角的類型 | `angle_type` | `LSC-2526-S0-T0-02-GE-3` |
| `GE-4` | 象限判斷 | `quadrant` | `LSC-2526-S1-T2-14-GE-4` |
| `GE-5` | 三角形四心 | `triangle_center` | `LSC-2526-S3-T3-09-GE-5` |
| `DH-1` | 離散／連續數據 | `data_type` | `LSC-2526-S1-T3-16-DH-1` |

`UC` is retained as a topic code for unclassifiable future items only. It currently has no registered family members.

## Usage

When asking another AI to fix or discuss a question, cite both fields where possible:

`LSC-2526-S1-T3-04-NA-4` / `hcf_or_lcm`

The code is for human-facing selection. The `key` remains the system contract.
