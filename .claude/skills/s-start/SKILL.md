---
name: s-start
description: res-ai-foundry 세션 시작. PRD/doc 기반 컨텍스트와 SPEC/CHANGELOG 상태를 빠르게 복원한다.
argument-hint: "[오늘 작업할 내용]"
user-invocable: true
---

# Session Start — res-ai-foundry 컨텍스트 복원

## 목적
- 현재 프로젝트 상태를 3분 내 파악
- 오늘 작업 범위를 SPEC 기준으로 고정
- 문서 중심(Pre-development) 단계에서 흔들리지 않게 시작

## 3-Tier 컨텍스트 로딩

```
Tier 1 (자동): CLAUDE.md + MEMORY.md (자동 로드)
Tier 2 (필수 Read): SPEC.md + memory/deployment.md + memory/patterns.md
Tier 3 (선택 검색): docs/CHANGELOG.md
```

> **메모리 토픽 파일** (`~/.claude-work/.claude/projects/.../memory/`):
> - `deployment.md` — Worker URLs, Cloudflare 리소스, Secrets 상태
> - `patterns.md` — Queue Router, Neo4j, HITL DO, Wrangler 팁

## 시작 체크

```bash
!`git branch --show-current`
!`git log --oneline -5`
!`git status --short`
```

## 지시사항

### 1) 현재 컨텍스트 요약
- MEMORY.md에서 Phase 상태, Known Blockers, 다음 작업 확인
- memory/deployment.md에서 배포 상태, Secrets 현황 확인 (필요 시)
- memory/patterns.md에서 Queue Router, HITL 등 고유 패턴 확인 (필요 시)
- CLAUDE.md에서 아키텍처/제약(6-layer, 5-stage, 11 Workers) 재확인

### 2) SPEC.md 확인 (필수)
아래 섹션 중심으로 확인:
- §5 Current Status
- §6 Execution Plan
- §8 Decision Log

### 3) CHANGELOG 확인 (필요 시)
최근 세션 상세가 필요하면:
```bash
grep -n "세션" docs/CHANGELOG.md | head -n 10
```

### 4) 오늘 작업 포커스 정리
`$ARGUMENTS`가 있으면 해당 범위를 아래 형식으로 정리:
- 관련 SPEC 항목
- 변경 예정 파일
- 완료 기준(Definition of Done)

## 출력 형식

```markdown
## 프로젝트 상태 요약

- 브랜치: [현재 브랜치]
- 작업트리: [clean/dirty]
- 현재 단계: [SPEC §5 기준]
- 오늘 목표: [인자 기반 또는 사용자 지정]

### 오늘 작업 체크리스트
- [ ] 항목 1
- [ ] 항목 2
- [ ] 항목 3

### 참고
- 리스크/주의사항 1~2개
```

## res-ai-foundry 전용 주의
- Phase G (Integration) 진행 중 — 5-Stage 파이프라인 전체 구현 완료, E2E 통합 테스트 단계
- PRD 원문(`docs/AI_Foundry_PRD_TDS_v0.6.docx`)과 SPEC 불일치 시 SPEC을 즉시 갱신
- MEMORY.md의 Known Blockers를 반드시 확인하여 작업 시작 전 블로커를 인지
