#!/bin/bash
# migrate-r2.sh — R2 버킷 간 오브젝트 이전 (개인 → 회사 계정)
# AIF-REQ-020 Phase 3-3
#
# Usage: bash scripts/migrate-r2.sh [bucket-name]
# Example: bash scripts/migrate-r2.sh ai-foundry-documents

set -uo pipefail

OLD_TOKEN="j6ukvbiBkT_NHhUhZEBZ11zevnxaYlqYJ_i8hyCQ"
OLD_ACCOUNT="02ae9a2bead25d99caa8f3258b81f568"
NEW_TOKEN="${CLOUDFLARE_API_TOKEN}"
NEW_ACCOUNT="${CLOUDFLARE_ACCOUNT_ID}"

BUCKET="${1:-ai-foundry-skill-packages}"
TMPDIR="/tmp/r2-migrate-${BUCKET}"
mkdir -p "$TMPDIR"

echo "=== R2 Migration: $BUCKET ==="
echo "  From: $OLD_ACCOUNT (sinclair.seo)"
echo "  To:   $NEW_ACCOUNT (ktds.axbd)"

# Step 1: List all objects from old bucket
echo ""
echo "Step 1: Listing objects..."
ALL_KEYS=()
CURSOR=""
PAGE=0

while true; do
  PAGE=$((PAGE + 1))
  URL="https://api.cloudflare.com/client/v4/accounts/${OLD_ACCOUNT}/r2/buckets/${BUCKET}/objects"
  if [ -n "$CURSOR" ]; then
    URL="${URL}?cursor=${CURSOR}"
  fi

  RESP=$(curl -s "$URL" -H "Authorization: Bearer ${OLD_TOKEN}")
  KEYS=$(echo "$RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for obj in d.get('result', []):
    print(obj['key'])
" 2>/dev/null)

  COUNT=$(echo "$KEYS" | grep -c "." || echo 0)
  if [ "$COUNT" -eq 0 ]; then
    break
  fi

  while IFS= read -r key; do
    ALL_KEYS+=("$key")
  done <<< "$KEYS"

  # Check for more pages
  CURSOR=$(echo "$RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ri = d.get('result_info', {})
if ri.get('cursor'):
    print(ri['cursor'])
" 2>/dev/null)

  echo "  Page $PAGE: +$COUNT keys (total: ${#ALL_KEYS[@]})"

  if [ -z "$CURSOR" ]; then
    break
  fi
done

TOTAL=${#ALL_KEYS[@]}
echo "Total objects to migrate: $TOTAL"

# Step 2: Download from old → Upload to new
echo ""
echo "Step 2: Migrating objects..."
SUCCESS=0
FAILED=0
SKIPPED=0

for i in "${!ALL_KEYS[@]}"; do
  KEY="${ALL_KEYS[$i]}"
  ENCODED_KEY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$KEY', safe='/'))")
  PROGRESS=$(( (i + 1) * 100 / TOTAL ))

  # Download from old bucket
  TMP_FILE="$TMPDIR/obj_${i}"
  HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TMP_FILE" \
    "https://api.cloudflare.com/client/v4/accounts/${OLD_ACCOUNT}/r2/buckets/${BUCKET}/objects/${ENCODED_KEY}" \
    -H "Authorization: Bearer ${OLD_TOKEN}")

  if [ "$HTTP_CODE" != "200" ]; then
    FAILED=$((FAILED + 1))
    rm -f "$TMP_FILE"
    continue
  fi

  # Upload to new bucket
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
    -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/${NEW_ACCOUNT}/r2/buckets/${BUCKET}/objects/${ENCODED_KEY}" \
    -H "Authorization: Bearer ${NEW_TOKEN}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@${TMP_FILE}")

  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))
  else
    FAILED=$((FAILED + 1))
  fi

  rm -f "$TMP_FILE"
  printf "  [%d%%] %d/%d (ok: %d, fail: %d)\r" "$PROGRESS" "$((i + 1))" "$TOTAL" "$SUCCESS" "$FAILED"
done

echo ""
echo "=== Migration Complete ==="
echo "  Total: $TOTAL"
echo "  Success: $SUCCESS"
echo "  Failed: $FAILED"
echo "  Skipped: $SKIPPED"

# Cleanup
rm -rf "$TMPDIR"
