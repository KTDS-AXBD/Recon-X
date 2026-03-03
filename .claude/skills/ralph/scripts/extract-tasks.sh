#!/bin/bash
# extract-tasks.sh — PRD에서 미완료 태스크를 추출
# 사용법: ./extract-tasks.sh [prd-path] [--first | --all | --count]
#
# --first: 첫 번째 미완료 태스크만 출력 (기본값)
# --all: 모든 미완료 태스크 출력
# --count: 미완료 태스크 수만 출력

PRD_PATH="${1:-PRD.md}"
MODE="${2:---first}"

if [ ! -f "$PRD_PATH" ]; then
  echo "ERROR: PRD file not found: $PRD_PATH" >&2
  exit 1
fi

case "$MODE" in
  --first)
    # 첫 번째 미완료 태스크만 추출 (태스크 ID + 설명)
    grep -n "^- \[ \]" "$PRD_PATH" | head -1 | sed 's/^[0-9]*:- \[ \] //'
    ;;
  --all)
    # 모든 미완료 태스크 출력 (번호 포함)
    grep -n "^- \[ \]" "$PRD_PATH" | sed 's/:- \[ \] / | /'
    ;;
  --count)
    # 미완료 태스크 수
    grep -c "^- \[ \]" "$PRD_PATH" 2>/dev/null || echo "0"
    ;;
  --completed)
    # 완료된 태스크 수
    grep -c "^- \[x\]" "$PRD_PATH" 2>/dev/null || echo "0"
    ;;
  *)
    echo "Usage: $0 [prd-path] [--first|--all|--count|--completed]" >&2
    exit 1
    ;;
esac
