#!/bin/bash
# chunk-import.sh — Split SQL into chunk files and import via --file
# Usage: bash scripts/chunk-import.sh <db-name> <sql-file> [chunk-size]
set -euo pipefail

DB_NAME="${1:?Usage: $0 <db-name> <sql-file> [chunk-size]}"
SQL_FILE="${2:?Usage: $0 <db-name> <sql-file> [chunk-size]}"
CHUNK_SIZE="${3:-20}"  # statements per chunk file

TMPDIR="/tmp/d1-chunks-${DB_NAME}"
rm -rf "$TMPDIR"
mkdir -p "$TMPDIR"

# Extract INSERT statements
echo "=== Importing $DB_NAME from $SQL_FILE ==="
TOTAL=$(grep -c "^INSERT" "$SQL_FILE" || echo 0)
echo "Total INSERT statements: $TOTAL"

# Split into chunk files
CHUNK_NUM=0
LINE_COUNT=0
OUTFILE="$TMPDIR/chunk_$(printf '%04d' $CHUNK_NUM).sql"

while IFS= read -r line; do
  if [[ "$line" == INSERT* ]]; then
    echo "$line" >> "$OUTFILE"
    LINE_COUNT=$((LINE_COUNT + 1))
    if [ "$LINE_COUNT" -ge "$CHUNK_SIZE" ]; then
      CHUNK_NUM=$((CHUNK_NUM + 1))
      LINE_COUNT=0
      OUTFILE="$TMPDIR/chunk_$(printf '%04d' $CHUNK_NUM).sql"
    fi
  fi
done < "$SQL_FILE"

TOTAL_CHUNKS=$((CHUNK_NUM + 1))
echo "Split into $TOTAL_CHUNKS chunk files"

# Import each chunk
SUCCESS=0
FAILED=0
for CHUNK_FILE in "$TMPDIR"/chunk_*.sql; do
  CHUNK_BASE=$(basename "$CHUNK_FILE")
  RESULT=$(npx wrangler d1 execute "$DB_NAME" --remote --file="$CHUNK_FILE" 2>&1)
  if echo "$RESULT" | grep -q "ERROR"; then
    FAILED=$((FAILED + 1))
    echo "  ❌ $CHUNK_BASE: $(echo "$RESULT" | grep 'ERROR' | head -1 | cut -c1-100)"
  else
    SUCCESS=$((SUCCESS + 1))
  fi
  echo -ne "  Progress: $((SUCCESS + FAILED))/$TOTAL_CHUNKS chunks\r"
done

echo ""
echo "✅ Done: $SUCCESS/$TOTAL_CHUNKS chunks succeeded, $FAILED failed"

# Cleanup
rm -rf "$TMPDIR"
