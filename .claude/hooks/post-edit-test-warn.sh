#!/bin/bash
# @axbd/harness-kit — PostToolUse hook: warn about missing test files
# Non-blocking (always exit 0) — advisory only
# Origin: Foundry-X Phase 14

FILE=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')
if [ -z "$FILE" ]; then exit 0; fi

# Only check .ts/.tsx source files
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then exit 0; fi

# Skip: test files, type declarations, index/barrel, type-only files
BASENAME=$(basename "$FILE")
if echo "$BASENAME" | grep -qE '\.(test|spec)\.(ts|tsx)$'; then exit 0; fi
if echo "$BASENAME" | grep -qE '\.d\.ts$'; then exit 0; fi
if echo "$BASENAME" | grep -qE '^(index|types)\.(ts|tsx)$'; then exit 0; fi

# Skip files inside __tests__/ directories
if echo "$FILE" | grep -q '/__tests__/'; then exit 0; fi

# Skip non-package files (hooks, skills, configs)
if ! echo "$FILE" | grep -q '/packages/\|/src/'; then exit 0; fi

# Compute expected test file path
DIR=$(dirname "$FILE")
STEM=$(echo "$BASENAME" | sed 's/\.\(ts\|tsx\)$//')
TEST_FILE="${DIR}/__tests__/${STEM}.test.ts"
TEST_FILE_TSX="${DIR}/__tests__/${STEM}.test.tsx"
# Also check co-located pattern (file.test.ts next to file.ts)
TEST_FILE_COLOCATED="${DIR}/${STEM}.test.ts"
TEST_FILE_COLOCATED_TSX="${DIR}/${STEM}.test.tsx"

if [ ! -f "$TEST_FILE" ] && [ ! -f "$TEST_FILE_TSX" ] && \
   [ ! -f "$TEST_FILE_COLOCATED" ] && [ ! -f "$TEST_FILE_COLOCATED_TSX" ]; then
  echo "⚠️  테스트 파일 없음: ${STEM}.test.ts"
fi

exit 0
