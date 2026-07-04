#!/usr/bin/env bash
# scripts/regenerate_samples.sh
# 重生 samples/ 內 3 份 standalone HTML。Fixed-seed PRNG 確保兩次跑嘅
# 輸出除 GENERATED_AT 時間戳外完全相同（diff stable）。
#
# 用法：bash scripts/regenerate_samples.sh
# 環境：node 18+；需要 question-bank.json 同 templates/student.html 喺 ROOT。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAMPLES_DIR="$ROOT/samples"
cd "$ROOT"

mkdir -p "$SAMPLES_DIR"

# 清空舊 samples HTML（保留 README.md）
find "$SAMPLES_DIR" -maxdepth 1 -type f -name '*.html' -delete

# 跑 generator（output 帶日期後綴，例如 student-practice-s1_term3_part_a-20260704.html）
node scripts/gen_practice_html.cjs \
  question-bank.json \
  templates/student.html \
  "$SAMPLES_DIR"

# 改名 → URL 穩定
shopt -s nullglob
for f in "$SAMPLES_DIR"/student-practice-s1_term3_part_a-*.html; do
  mv "$f" "$SAMPLES_DIR/s1-t3-part-a.html"
done
for f in "$SAMPLES_DIR"/student-practice-s1_term2_part_a-*.html; do
  mv "$f" "$SAMPLES_DIR/s1-t2-part-a.html"
done
for f in "$SAMPLES_DIR"/student-practice-s3_term3_part_a-*.html; do
  mv "$f" "$SAMPLES_DIR/s3-t3-part-a.html"
done
shopt -u nullglob

echo ""
echo "=== samples/ after regen ==="
ls -la "$SAMPLES_DIR"

# 確認 3 份檔案都存在
for f in s1-t3-part-a.html s1-t2-part-a.html s3-t3-part-a.html; do
  if [ ! -f "$SAMPLES_DIR/$f" ]; then
    echo "❌ missing $SAMPLES_DIR/$f" >&2
    exit 1
  fi
done

echo ""
echo "✅ samples regenerated (diff stable: only GENERATED_AT timestamp differs between runs)"
