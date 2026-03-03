#!/bin/bash
# mark-complete.sh — PRD에서 특정 태스크를 완료로 마킹
# 사용법: ./mark-complete.sh <prd-path> <line-number>
#
# line-number: grep -n으로 찾은 줄 번호

PRD_PATH="${1}"
LINE_NUM="${2}"

if [ -z "$PRD_PATH" ] || [ -z "$LINE_NUM" ]; then
  echo "Usage: $0 <prd-path> <line-number>" >&2
  exit 1
fi

if [ ! -f "$PRD_PATH" ]; then
  echo "ERROR: PRD file not found: $PRD_PATH" >&2
  exit 1
fi

# 해당 줄의 - [ ] 를 - [x] 로 변경
sed -i "${LINE_NUM}s/^- \[ \]/- [x]/" "$PRD_PATH"

# 변경 확인
sed -n "${LINE_NUM}p" "$PRD_PATH"
