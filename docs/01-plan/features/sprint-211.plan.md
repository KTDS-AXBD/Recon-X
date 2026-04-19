---
id: PLAN-SPRINT-211
title: Sprint 211 — FX-SPEC-003 Decode-X Handoff Contract 신규 발행
sprint: 211
req: AIF-REQ-035
phase: Phase 2 A (선행 게이트)
status: IN_PROGRESS
created: 2026-04-20
author: Sinclair (세션 217)
---

# Sprint 211 Plan — FX-SPEC-003 Handoff Contract

## 1. 목적

Phase 2 진입 선행 게이트: Decode-X↔Foundry-X 간 **Handoff Package 계약(FX-SPEC-003)**을 신규 발행한다.

FX-SPEC-002 (PlumbBridge Plumb Output Contract, v1.0 @ e5c7260) 는 동결 유지 — 수정 없음.  
FX-SPEC-003은 별도 계약 코드로 **Decode-X 측 Handoff Package 생산 규격 + Foundry-X 수용 기준**을 명시한다.

이 계약이 없으면 Sprint 212~216이 블로킹된다.

## 2. 산출물 (Deliverables)

| 파일 | 설명 | KPI |
|------|------|-----|
| `docs/specs/FX-SPEC-003-handoff-contract.md` | 계약 원본 (Foundry-X repo 미러 예정) | self-sign 완료 |
| `docs/mou/FX-SPEC-003.md` | Decode-X repo 미러 (thin wrapper) | 원본과 일치 |

## 3. 계약 포함 항목

### 3.1 Tier-A 6개 서비스 특성 정의
- 예산(lpon-budget), 구매(lpon-purchase), 결제(lpon-payment)
- 환불(lpon-refund), 선물(lpon-gift), 정산(lpon-settlement)
- 각 서비스별 도메인 맥락, 입력 채널, 예상 Empty Slot 범위

### 3.2 Handoff Package 스키마 (from `handoff-package-format.md` 확장)
- 필수 파일 목록 + JSON Schema
- AI-Ready 6기준 passRate 임계값 (≥ 0.75 이전 투입 금지)
- Source-First 3종 마커 (SOURCE_MISSING / DOC_ONLY / DIVERGENCE) 포함 규칙

### 3.3 E2E 실행 요구사항
- Foundry-X `POST /prototype-jobs` (F353) 수용 포맷
- 수용 응답 코드 및 에러 처리
- 비동기 실행 결과 피드백: `/callback/{job-id}` 엔드포인트

### 3.4 Working Prototype 수용 기준 (Acceptance Criteria)
- SyncResult verdict 3종 (green / yellow / red) 판정 기준
- round-trip 일치율 목표 (≥ 90%)
- DIVERGENCE 발생 시 HITL 3-way merge 워크플로우

### 3.5 버전 정책 + 서명 절차
- Breaking change / Non-breaking 구분
- Self-sign 절차 (1인 겸임, Phase 0 Closure 선례)
- freeze 조건: Sprint 212 착수 전

## 4. 비포함 항목 (Out of Scope)

- FX-SPEC-002 수정 — 동결
- Foundry-X 내부 구현 상세
- 코드 구현 (이번 Sprint는 계약 문서만)

## 5. 일정

| 단계 | 내용 | 예상 소요 |
|------|------|----------|
| Plan | 이 문서 | 완료 |
| Design | §5 파일 매핑 + 계약 구조 상세화 | 15분 |
| Implement | FX-SPEC-003 계약 문서 2종 작성 | 45분 |
| Analyze | Design vs 구현 Gap 분석 | 10분 |
| Report + Commit | 완료 보고 + push | 10분 |
| **합계** | | **~80분** |

## 6. 의존성

- **선행**: SPEC.md Sprint 211 항목 (세션 217 재정의 완료)
- **후행 블로킹**: Sprint 212 (AST 파서), Sprint 213 (ERWin), Sprint 214a/b/c (Fill), Sprint 215 (E2E Handoff)
- **참조**: `docs/contracts/foundry-x-mou.v0.2-draft.md`, `docs/poc/handoff-package-format.md`
