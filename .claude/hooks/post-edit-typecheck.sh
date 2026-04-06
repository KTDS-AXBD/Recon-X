#!/bin/bash
# @axbd/harness-kit — PostToolUse hook: tsc --noEmit after .ts/.tsx edits
# Only reports errors from the edited file (filters out pre-existing noise)
# Origin: Foundry-X Phase 14

FILE=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')
if [ -z "$FILE" ]; then exit 0; fi
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then exit 0; fi

# Resolve package dir (monorepo support)
PKG_DIR=$(echo "$FILE" | grep -oP '.*/packages/[^/]+' | head -1)
if [ -z "$PKG_DIR" ]; then
  # Single-repo fallback
  PKG_DIR=$(echo "$FILE" | grep -oP '.*/[^/]+(?=/src/)' | head -1)
fi
if [ -z "$PKG_DIR" ]; then exit 0; fi
if [ ! -f "$PKG_DIR/tsconfig.json" ]; then exit 0; fi

# Extract relative path for filtering
REL_FILE=$(echo "$FILE" | sed "s|${PKG_DIR}/||")

# Run tsc and filter to only show errors from the edited file
OUTPUT=$(cd "$PKG_DIR" && npx tsc --noEmit --pretty false 2>&1 | grep -F "$REL_FILE" | head -10)

if [ -n "$OUTPUT" ]; then
  echo "$OUTPUT"
  exit 1
fi

exit 0
