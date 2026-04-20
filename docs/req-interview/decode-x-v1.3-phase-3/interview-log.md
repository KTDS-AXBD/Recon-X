---
code: AIF-INTV-decode-x-v1.3-phase-3
title: Decode-X v1.3 Phase 3 요구사항 인터뷰 로그
version: 1.0
status: Active
category: INTERVIEW
system-version: 0.7.0
created: 2026-04-21
updated: 2026-04-21
author: Sinclair Seo
related:
  - docs/req-interview/decode-x-v1.3-phase-2/prd-final.md
  - docs/03-analysis/features/phase-2-pipeline.analysis.md
  - SPEC.md §7 AIF-REQ-035, §8 TD-20~28
---

# Decode-X v1.3 Phase 3 요구사항 인터뷰 로그

> 진행일: 2026-04-21 (세션 218)
> 방식: `/ax:req-interview` 스킬 5파트 인터뷰, AskUserQuestion 단일 질문 단위
> 진행자: Sinclair (겸임 Decode-X/Foundry-X PM)
> 선행 컨텍스트: Phase 2 완주 직후 (Match 95.6%, MVP 5/5, round-trip 91.7% 입증)

---

## Part 1 — 왜 (목적/문제)

### Q1. Phase 3의 핵심 목적
**답변 (복수)**:
- 품질 도구 완성 (AI-Ready 자동 채점기 TD-27 + Tree-sitter TD-28)
- Foundry-X Production 실전 운영화 (AgentResume + TD-25 Production E2E 증거)

**미선택**:
- 도메인 확장 (Tier-A 외 → 타 업종)
- 외부 파일럿 (KT DS 외부)
- UX/운영 성숙 (대시보드/모니터링)

### Q2. 시급성 / 이유
**답변**: 본부장 리뷰/데모 일정 (트리거)

**해석**: Phase 2 성과를 외부에 설명하기 위해 (a) Production 실 스크린샷 + (b) 자동 채점 기반 정량 지표 가 필요. "말" 대신 "데이터"로 전환하는 동기.

---

## Part 2 — 누구를 위해 (사용자/이해관계자)

### Q3. Phase 3 성과물의 사용자/관람자
**답변**: Foundry-X 팀 (연계 사용자)

**미선택**:
- 본부장/경영진 (관람자) — Q4에서 트리거/관람자로 재해석됨
- AX BD팀 내부 개발자
- 외부 고객/파트너

### Q4. 시급성(본부장 리뷰) ↔ 주 사용자(Foundry-X 팀) 조합의 해석
**답변**: 본부장 리뷰 = 트리거 / 실질 수혜자 = Foundry-X (Recommended)

**정리**:
- 설계·기능 중심 = Foundry-X 팀이 매일 쓸 경험
- 본부장 리뷰는 아웃풋 시간표로만 작용
- "본부장이 보기 좋은 데모"보다 "Foundry-X가 운영 중 만족하는 인터페이스" 우선

---

## Part 3 — 무엇을 (범위/기능)

### Q5. Must Have 후보
**답변 (전체 선택)**:
- TD-24: DIVERGENCE 공식 마커 발행 (M-3 완결) — P1, 1h
- TD-25: Foundry-X Production E2E 증거 수집 (M-6 완결) — P1, 2h
- TD-27: AI-Ready 자동 채점기 구축 — 신규 Sprint 규모
- Sprint 202: AgentResume 실구현 (REQ-026 Phase 2 잔여) — Foundry-X Orchestrator 전제

### Q6. Should Have 후보
**답변 (전체 선택)**:
- TD-28: Tree-sitter 기반 Java 파서 (TD-19 연장) — 2~3 Sprint
- TD-22: comparator 8 keys silent PASS 교체 — 2h
- TD-20/21/23: Phase 2 작연 (문서/버전/하드코딩) — 총 1.6h
- TD-26: java 파서 공용 모듈 추출 — TD-28 선행

### Q7. Out-of-scope
**답변 (복수)**:
- 타 도메인 확장 (통신/금융/헬스케어 등)
- 외부 파일럿 (KT DS 외부 기업)

**미선택**:
- AIF-REQ-021 PAL Router 고도화
- AIF-REQ-023 Pipeline Event Sourcing

→ 해석: OPEN 상태 유지이나 Phase 3 진행 중 자연 편입 가능 (scope 변동 허용)

### Q8. Cross-repo 작업 (TD-25 Foundry-X 수정 필요성)
**답변**: Foundry-X repo 수정 포함 (교차 PR) (Recommended)

**근거**: Sinclair가 FX PM 겸임이라 양방향 PR 병행 가능. Phase 2 FX-SPEC-003 v1.0도 양방 sync 선례 있음.

---

## Part 4 — 어떻게 판단할 것인가 (성공 기준)

### Q9. KPI 추의 (본부장 리뷰 상상)
**답변 (복수)**:
- AI-Ready 자동 채점 자상 점수 (LPON 859 skill + Fill 9건 × 6기준 = 5,214 점수)
- Foundry-X Production E2E 실사례 수 (Tier-A 6서비스 D1 handoff_jobs INSERT)
- DIVERGENCE 공식 마커 발행 수 (최소 3건)

**미선택**:
- AgentResume 서비스 가용성 (SLA)

### Q10. MVP 최소 기준 (실패 판정)
**답변**: TD-24 + TD-25 완결이 유일한 주요 점 (Recommended)

**함의**:
- True Must = TD-24 + TD-25 (약 3h 분량)
- Should Have로 강등: TD-27 AI-Ready 채점기, Sprint 202 AgentResume
- 기존 Should 4건은 Should로 유지

→ Must 재정의로 체력 경감, Phase 3 압축 가능성 열림

---

## Part 5 — 제약과 리소스

### Q11. 일정 제약
**답변**: 아직 미정 (Plan 단계에서 확정)

→ 본부장 리뷰 D-Day 확정 시점부터 역산.

### Q12. 기술/보안/리소스 제약
**답변**: LLM 비용 (AI-Ready 5,214 점수 + Production E2E)

**미선택**:
- Tree-sitter Workers 호환성 (제약 아님 — PoC로 해결)
- 교차 PR 운영 복잡도 (제약 아님 — 겸임으로 흡수)
- 특별한 제약 없음

→ 순수 리스크 = LLM 호출 비용 폭증 가능성. 예산 가드 필요.

---

## 최종 확인

**답변**: 있는 그대로 PRD 작성 진입 (Recommended)

→ interview-log.md + prd-v1.md 생성 → Phase 2 API 자동 검토 진입
