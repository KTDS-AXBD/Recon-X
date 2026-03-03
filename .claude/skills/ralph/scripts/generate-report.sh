#!/bin/bash
# generate-report.sh — Ralph Loop 완료 보고서 생성
# 사용법: ./generate-report.sh <progress-file> <prd-path> [output-path]

PROGRESS_FILE="${1:-scripts/ralph/progress.md}"
PRD_PATH="${2:-PRD.md}"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
OUTPUT_PATH="${3:-scripts/ralph/report-${TIMESTAMP}.md}"

# 통계 수집
TOTAL_TASKS=$(grep -c "^- \[" "$PRD_PATH" 2>/dev/null || echo "0")
COMPLETED=$(grep -c "^- \[x\]" "$PRD_PATH" 2>/dev/null || echo "0")
REMAINING=$((TOTAL_TASKS - COMPLETED))

# 최근 커밋 (Ralph Loop 세션 중)
RECENT_COMMITS=$(git log --oneline --since="1 hour ago" 2>/dev/null | head -20)
COMMIT_COUNT=$(echo "$RECENT_COMMITS" | grep -c "." 2>/dev/null || echo "0")

# 변경된 파일
CHANGED_FILES=$(git diff --name-only HEAD~${COMMIT_COUNT}..HEAD 2>/dev/null | sort -u)
FILE_COUNT=$(echo "$CHANGED_FILES" | grep -c "." 2>/dev/null || echo "0")

# 보고서 생성
cat > "$OUTPUT_PATH" << EOF
# Ralph Loop — Completion Report
Generated: $(date '+%Y-%m-%d %H:%M:%S')

## Summary
| Metric | Value |
|--------|-------|
| Total tasks | ${TOTAL_TASKS} |
| Completed | ${COMPLETED} |
| Remaining | ${REMAINING} |
| Commits | ${COMMIT_COUNT} |
| Files changed | ${FILE_COUNT} |

## Commits
\`\`\`
${RECENT_COMMITS}
\`\`\`

## Changed Files
\`\`\`
${CHANGED_FILES}
\`\`\`

## Remaining Tasks
$(grep "^- \[ \]" "$PRD_PATH" 2>/dev/null || echo "(none)")

## Progress Log (last 30 lines)
$(tail -30 "$PROGRESS_FILE" 2>/dev/null || echo "(no progress file)")
EOF

echo "$OUTPUT_PATH"
