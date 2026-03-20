#!/usr/bin/env bash
# usage-tracker.sh — PreToolUse hook for skill usage tracking
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$TOOL_NAME" != "Skill" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse"}}'
  exit 0
fi
SKILL_NAME=$(echo "$INPUT" | grep -o '"skill":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$SKILL_NAME" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse"}}'
  exit 0
fi
LOG_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugin-data/skill-framework}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/usage.jsonl"
TS=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
echo "{\"skill\":\"$SKILL_NAME\",\"ts\":\"$TS\",\"tool\":\"Skill\",\"event\":\"PreToolUse\"}" >> "$LOG_FILE"
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse"}}'
