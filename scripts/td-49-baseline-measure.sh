#!/bin/bash
# TD-49 baseline measurement — 7 lpon-* skills × N runs
# Usage: bash scripts/td-49-baseline-measure.sh <run_label>
#   run_label: e.g. "run1" or "run2"
set -euo pipefail

RUN="${1:?run label required (e.g. run1)}"
SECRET=$(cat ~/.secrets/decode-x-internal)
BASE_URL="https://svc-skill.ktds-axbd.workers.dev"
OUT_DIR="reports/td-49-baseline-2026-05-02"
mkdir -p "$OUT_DIR"

SKILLS=(
  "lpon-budget:5d59e8d7-790d-4a0b-91a3-30e316e88a26"
  "lpon-charge:4591b69e-4e6a-4ac8-8261-ce177c35f994"
  "lpon-gift:17bc6d1d-f8b6-49e9-8407-2b424b97cd6a"
  "lpon-payment:7dd016bb-7f66-4a68-b905-a68972d6203c"
  "lpon-purchase:b923a11b-3b6e-4489-9600-2345fa395bce"
  "lpon-refund:fc4204c8-af26-4c47-889d-11012e56c241"
  "lpon-settlement:5c872ee3-f506-417d-8429-e23935cfd50b"
)

START=$(date +%s)
TOTAL_COST=0
echo "=== TD-49 baseline $RUN START $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

for entry in "${SKILLS[@]}"; do
  name="${entry%%:*}"
  uuid="${entry#*:}"
  out="$OUT_DIR/$RUN-$name.json"
  t0=$(date +%s)
  echo "--- $name ($uuid) ..."
  http_code=$(curl -sS -X POST "$BASE_URL/skills/$uuid/ai-ready/evaluate" \
    -H "X-Internal-Secret: $SECRET" \
    -H "X-Organization-Id: lpon" \
    -H "Content-Type: application/json" \
    -d '{"model":"haiku","force":true}' \
    -o "$out" \
    -w "%{http_code}")
  t1=$(date +%s)
  elapsed=$((t1 - t0))
  if [ "$http_code" != "200" ]; then
    echo "    HTTP $http_code FAIL after ${elapsed}s — see $out"
    continue
  fi
  total=$(jq -r '.data.totalScore' "$out")
  pass=$(jq -r '.data.passCount' "$out")
  cost=$(jq -r '.data.costUsd' "$out")
  echo "    HTTP $http_code OK ${elapsed}s — total=$total pass=$pass/6 cost=\$$cost"
  TOTAL_COST=$(awk "BEGIN { printf \"%.4f\", $TOTAL_COST + $cost }")
done

END=$(date +%s)
DUR=$((END - START))
echo "=== $RUN COMPLETE ${DUR}s total_cost=\$$TOTAL_COST ==="
