#!/bin/bash
# @axbd/harness-kit — PostToolUse hook: eslint --fix on .ts/.tsx edits
# Origin: Foundry-X Phase 14, battle-tested across 3,000+ tests

FILE=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')
if [ -z "$FILE" ]; then exit 0; fi
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then exit 0; fi

# Find package dir (monorepo support)
PKG_DIR=$(echo "$FILE" | grep -oP '.*/packages/[^/]+' | head -1)
if [ -z "$PKG_DIR" ]; then
  # Single-repo fallback: use project root
  PKG_DIR=$(echo "$FILE" | grep -oP '.*/[^/]+(?=/src/)' | head -1)
fi
if [ -z "$PKG_DIR" ]; then exit 0; fi

# Check for eslint config (flat config or legacy)
if [ -f "$PKG_DIR/eslint.config.js" ] || [ -f "$PKG_DIR/eslint.config.mjs" ] || [ -f "$PKG_DIR/.eslintrc.js" ]; then
  npx eslint --fix "$FILE" 2>&1 | tail -5
  exit 0
fi

# Fallback: project root config
PROJECT_ROOT=$(echo "$FILE" | grep -oP '.*/(?=packages/)' | head -1)
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT=$(echo "$FILE" | grep -oP '.*/(?=src/)' | head -1)
fi
if [ -n "$PROJECT_ROOT" ] && { [ -f "${PROJECT_ROOT}eslint.config.js" ] || [ -f "${PROJECT_ROOT}eslint.config.mjs" ]; }; then
  npx eslint --fix "$FILE" 2>&1 | tail -5
  exit 0
fi

exit 0
