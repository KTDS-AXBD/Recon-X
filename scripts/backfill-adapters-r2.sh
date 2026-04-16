#!/bin/bash
# backfill-adapters-r2.sh — wrangler CLI로 R2 SkillPackage의 adapters 필드를 채운다.
# Usage: ./scripts/backfill-adapters-r2.sh [--dry-run] [--org LPON] [--batch 50]

set -euo pipefail

DRY_RUN=false
ORG_FILTER=""
BATCH_SIZE=50
BUCKET="ai-foundry-skill-packages"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVC_DIR="${PROJECT_ROOT}/services/svc-skill"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)  DRY_RUN=true; shift ;;
    --org)      ORG_FILTER="$2"; shift 2 ;;
    --batch)    BATCH_SIZE="$2"; shift 2 ;;
    *)          echo "Unknown: $1"; exit 1 ;;
  esac
done

echo "=== Backfill Adapters (R2 direct) ==="
echo "  dry-run: $DRY_RUN | org: ${ORG_FILTER:-all} | batch: $BATCH_SIZE"

# Step 1: Get skill list from D1
WHERE_CLAUSE=""
[ -n "$ORG_FILTER" ] && WHERE_CLAUSE="WHERE organization_id='$ORG_FILTER'"

SKILLS_JSON=$(cd "$SVC_DIR" && npx wrangler d1 execute db-skill --env production --remote --json \
  --command "SELECT skill_id, r2_key, organization_id FROM skills $WHERE_CLAUSE ORDER BY created_at ASC LIMIT $BATCH_SIZE" 2>/dev/null)

# Parse into a temp file (avoid pipe + subshell issues)
SKILL_LIST="/tmp/backfill-skill-list.txt"
echo "$SKILLS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for row in data[0]['results']:
    print(f\"{row['skill_id']}|{row['r2_key']}|{row['organization_id']}\")
" > "$SKILL_LIST"

TOTAL=$(wc -l < "$SKILL_LIST")
echo "  skills: $TOTAL"
echo ""

UPDATED=0
SKIPPED=0
FAILED=0

# Step 2: Process each skill
while IFS='|' read -r SKILL_ID R2_KEY ORG_ID; do
  TMP_FILE="/tmp/skill-${SKILL_ID}.json"

  # Download from R2
  if ! (cd "$SVC_DIR" && npx wrangler r2 object get "${BUCKET}/${R2_KEY}" --remote --file "$TMP_FILE" >/dev/null 2>&1); then
    echo "  ❌ $SKILL_ID — R2 get failed"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Check current adapters
  ADAPTERS=$(python3 -c "
import json
with open('$TMP_FILE') as f:
    d = json.load(f)
a = d.get('adapters', {})
if a.get('mcp') and a.get('openapi'):
    print('HAS')
else:
    print('NEEDS')
" 2>/dev/null || echo "ERR")

  if [ "$ADAPTERS" = "HAS" ]; then
    echo "  ⏭ $SKILL_ID — already has adapters"
    SKIPPED=$((SKIPPED + 1))
    rm -f "$TMP_FILE"
    continue
  fi

  # Update adapters field in JSON
  MCP_KEY="skill-packages/${SKILL_ID}.mcp.json"
  OPENAPI_KEY="skill-packages/${SKILL_ID}.openapi.json"

  python3 -c "
import json
with open('$TMP_FILE') as f:
    d = json.load(f)
d['adapters'] = {'mcp': '$MCP_KEY', 'openapi': '$OPENAPI_KEY'}
with open('$TMP_FILE', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
"

  if [ "$DRY_RUN" = "true" ]; then
    echo "  🏜️  $SKILL_ID — dry-run (would update)"
    UPDATED=$((UPDATED + 1))
    rm -f "$TMP_FILE"
    continue
  fi

  # Put back to R2
  if (cd "$SVC_DIR" && npx wrangler r2 object put "${BUCKET}/${R2_KEY}" --remote --file "$TMP_FILE" --content-type "application/json" >/dev/null 2>&1); then
    echo "  ✅ $SKILL_ID"
    UPDATED=$((UPDATED + 1))
  else
    echo "  ❌ $SKILL_ID — R2 put failed"
    FAILED=$((FAILED + 1))
  fi

  rm -f "$TMP_FILE"
done < "$SKILL_LIST"

rm -f "$SKILL_LIST"

echo ""
echo "=== Result: updated=$UPDATED  skipped=$SKIPPED  failed=$FAILED ==="
