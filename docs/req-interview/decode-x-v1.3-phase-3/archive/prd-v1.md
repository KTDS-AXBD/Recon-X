---
code: AIF-PRD-decode-x-v1.3-phase-3
title: Decode-X v1.3 Phase 3 본 개발 PRD
version: 1.0
status: Draft
category: PRD
system-version: 0.2.0
created: 2026-04-21
updated: 2026-04-21
author: Sinclair Seo
related:
  - docs/req-interview/decode-x-v1.3-phase-3/interview-log.md
  - docs/req-interview/decode-x-v1.3-phase-2/prd-final.md
  - docs/03-analysis/features/phase-2-pipeline.analysis.md
  - SPEC.md §7 AIF-REQ-035, §8 TD-20~28
---

# Decode-X v1.3 Phase 3 PRD

**버전:** v1
**날짜:** 2026-04-21
**작성자:** AX BD팀 (Sinclair Seo)
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Phase 2 핸드오프 E2E 첫 사례를 **"말"에서 "데이터"로 전환**하여 정량 증거로 본부장·Foundry-X 팀에게 설득할 수 있는 품질 도구 + Production 실전 운영 레이어를 완성한다.

**배경:**
- Phase 2 본 개발 완주 직후 (Match 95.6%, MVP 5/5, round-trip 91.7% 입증)
- 그러나 자가보고 99.7% vs 독립 검증 95.6%의 **-4.1%p drift**는 "수동 평가·실증 증거 부족"이 원인
- Phase 2 종합 Gap Analysis에서 P1 2건(TD-24 DIVERGENCE 마커 미발행, TD-25 Foundry-X Production E2E 증거 부재) 식별
- 본부장 리뷰 D-Day 임박 (정확 날짜는 Plan 확정)

**목표:**
- **True Must**: TD-24 + TD-25 완결 → Phase 2 미완 M-3/M-6 공식 종결
- **Should**: AI-Ready 자동 채점기, AgentResume 실구현, Tree-sitter 업그레이드 등 품질·운영 도구 성숙
- 본부장 리뷰에 들고 갈 "한 페이지 정량 요약" 3종(AI-Ready 자동 채점, Production E2E 실사례, DIVERGENCE 마커)을 **자동 산출** 가능한 상태로 진입

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

| 영역 | 현재 상태 |
|------|-----------|
| M-3 DIVERGENCE 마커 | `packages/utils/src/reconcile.ts`에 엔진은 있으나 LPON refund 실행 증거 없음. TC-REFUND-002 실패를 SOURCE_MISSING만 기록, DIVERGENCE 공식 마커 미발행 (85%) |
| M-6 Foundry-X Production E2E | Sprint 215 Handoff Adapter 구현·배포 완료 보고. 그러나 실 POST `/prototype-jobs` 호출 + Production D1 `handoff_jobs` row 생성 증거 없음 |
| AI-Ready 6기준 채점 | Phase 2 자가보고 "AI-Ready 10/10"은 수동 평가. 자동 채점기·구조 점수 출력 미구현 (TD-27) |
| AgentResume 엔드포인트 | `services/svc-mcp-server/src/routes/agent.ts:164-181` stub 상태. Foundry-X Orchestrator 세션 복구 미구현 (Sprint 202 잔여) |
| Java 파서 | Sprint 212 regex CLI로 구현됐으나 PRD §4.1 M-2 명세는 Tree-sitter. PRD↔Code silent drift (TD-19/28) |
| Phase 2 작연 | Sprint 215 Plan/Design 문서 부재(TD-20), 214c FX-SPEC 버전 drift(TD-21), `rfndPsbltyYn` 하드코딩(TD-23), comparator 8 keys silent PASS(TD-22) |

### 2.2 목표 상태 (To-Be)

- **증거 기반 판정**: 자가보고 drift 없이 자동 채점 + Production 실 로그로만 성공 선언
- **M-3 / M-6 완결**: TD-24/25 해소로 Phase 2 미종결 마일스톤 2건 closing
- **품질 자동화**: AI-Ready 6기준이 5,214 점수(LPON 859 skill × 6기준)를 스크립트 1회 실행으로 산출
- **Foundry-X 운영 준비**: AgentResume 실구현으로 Orchestrator 세션 복구 SLA 측정 가능
- **문서·코드 정합성 복원**: Tree-sitter 업그레이드 또는 PRD 갱신으로 silent drift 해소

### 2.3 시급성

- **본부장 리뷰/데모** (D-Day 미확정, Plan 단계에서 역산): Phase 2 성과를 "데이터"로 설명하려면 Production 실 스크린샷 + 자동 채점 기반 정량 지표 필요
- Phase 2 미완 P1 2건(TD-24/25)을 Phase 3 Sprint 1 선행으로 해소하지 않으면 다음 확장(Phase 4 타 도메인)에 "Tier-A 결과물 신뢰도 의심" 리스크 상속

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| **Foundry-X 팀** (실질 수혜자) | Decode-X 핸드오프를 받아 Working Prototype를 실행·발전시키는 팀 | (1) AgentResume 신뢰도, (2) handoff_jobs 실 INSERT 확인, (3) Decode-X가 보내는 provenance/DIVERGENCE 마커 완결성, (4) AI-Ready 점수로 품질 예측 가능 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| 본부장 | 리뷰 트리거 (아웃풋 시간표 설정) | 높음 (D-Day 결정) |
| AX BD팀 | Decode-X 개발·운영 팀. Sinclair가 Decode-X/Foundry-X PM 겸임 | 높음 |
| AI Foundry 포털 팀 | 플랫폼 SVC 5개 운영. Phase 3 변경이 플랫폼 인터페이스에 영향 시 협업 | 중간 |

### 3.3 사용 환경

- **운영 환경**: Cloudflare Workers (Decode-X 7 Workers + Foundry-X Worker) + Pages SPA + Neo4j Aura
- **개발 환경**: WSL + Claude Code (tmux session-based) + Git worktree
- **LLM 환경**: Claude Opus/Sonnet/Haiku via AI Gateway + OpenRouter fallback + Workers AI embedding

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

> **True Must = TD-24 + TD-25 (MVP 임계값). 미완 시 Phase 3 실패 선언.**

| # | 기능 | 설명 | 우선순위 | 예상 규모 |
|---|------|------|----------|-----------|
| M-1 | **TD-24: DIVERGENCE 공식 마커 발행** | `reconcile` 엔진을 LPON refund 도메인에 실 실행 → `docs/poc/sprint-214b/lpon-refund/provenance.yaml`에 DIVERGENCE 마커 추가 + TC-REFUND-002 감사 로그 링크. M-3 달성률 85→95% | P0 | 1h (원자적) |
| M-2 | **TD-25: Foundry-X Production E2E 증거 수집** | Decode-X Production → Foundry-X Production에 실 POST `/prototype-jobs` 호출 + `handoff_jobs` row 생성 확인 + 로그/스크린샷 캡처. **Tier-A 6서비스 모두**에 대해 반복 수행 | P0 | 2h + Foundry-X 교차 PR 2~4h |

### 4.2 부가 기능 (Should Have)

> **Plan 단계에서 본부장 리뷰 D-Day에 맞춰 Sprint 편성. 체력 여유 시 편입.**

| # | 기능 | 설명 | 우선순위 | 예상 규모 |
|---|------|------|----------|-----------|
| S-1 | **TD-27: AI-Ready 6기준 자동 채점기** | Phase 2 Deep Dive PRD §4.2 Should였으나 미구현. LPON 859 skill × 6기준 = 5,214 점수 자동 산출 스크립트 + `/ai-ready/evaluate` API + 구조 점수 출력 | P1 | 2~3 Sprint |
| S-2 | **Sprint 202: AgentResume 실구현** | `services/svc-mcp-server/src/routes/agent.ts:164-181` stub → 실구현. Foundry-X Orchestrator 세션 복구. AIF-REQ-026 Phase 2 잔여 | P1 | 1 Sprint |
| S-3 | **TD-28: Tree-sitter 기반 Java 파서** (TD-19 연장) | regex CLI → Tree-sitter 이관. Workers 호환성 PoC 선행 필요. PRD↔Code drift 해소 | P1 | 2~3 Sprint |
| S-4 | **TD-22: comparator 8 keys silent PASS 교체** | `scripts/roundtrip-verify/comparator.ts:168-177` 하드코딩 → 실 D1 조회. round-trip 신뢰도 보강 | P2 | 2h |
| S-5 | **TD-20/21/23: Phase 2 작연 정리** | Sprint 215 Plan/Design retroactive 작성(0.5h) + gift/settlement provenance FX-SPEC 버전 drift 수정(0.1h) + `rfndPsbltyYn` 하드코딩 해결(1h) | P3 | 1.6h |
| S-6 | **TD-26: Java 파서 공용 모듈 추출** (TD-18 연장) | `svc-ingestion/parsing/java-*.ts` + `scripts/java-ast/runner.ts` → `packages/utils/src/java-parsing/` 공용화. S-3 선행 권장 | P3 | 1 Sprint (S-3 편입 가능) |

### 4.3 제외 범위 (Out of Scope)

- **타 도메인 확장** (통신/금융/헬스케어 등): LPON + 퇴직연금 2개 도메인 유지, 새 도메인은 Phase 4 이후
- **외부 파일럿** (KT DS 외부 기업): Deep Dive v0.3의 "외부 파일럿"도 Phase 3 제외. 내부 2-org 집중
- **Working Prototype 기능 확장**: Foundry-X 쪽 개발은 TD-25 검증 증거 수집에 필요한 cross-repo PR까지. 제품 확장은 별도

**유지 (OPEN 상태 이나 Phase 3 진행 중 자연 편입 허용)**:
- AIF-REQ-021 PAL Router 고도화
- AIF-REQ-023 Pipeline Event Sourcing & Observability

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 | Phase 3에서의 역할 |
|--------|-----------|-----------|-------------------|
| **Foundry-X Production** (`KTDS-AXBD/Foundry-X`) | HTTP POST `/prototype-jobs` + D1 `handoff_jobs` 확인 | **필수 (M-2)** | 실 E2E 증거 대상. Cross-repo PR 포함 |
| **Anthropic API (Opus/Sonnet/Haiku)** | HTTP REST via `packages/utils/src/llm-client.ts` → svc-llm-router → AI Gateway | 필수 (S-1, M-1 일부) | AI-Ready 채점 + DIVERGENCE 분석 |
| **OpenRouter** (ChatGPT/Gemini/DeepSeek) | HTTP REST | 선택 (Fallback) | LLM 장애 시 대체 |
| **Neo4j Aura** | HTTP Query API v2 | 필수 (기존) | ontology 참조 |
| **Tree-sitter** (Java grammar) | WASM / native binding | 선택 (S-3) | Workers 호환성 PoC 선행 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| **AI-Ready 자동 채점 자상 점수** | 수동 평가 "10/10" (정성) | 5,214 점수 중 **95% 이상이 4기준 상기준 통과** | S-1 스크립트 실행 + JSON 리포트 |
| **Foundry-X Production E2E 실사례 수** | 0 (증거 미수집) | **Tier-A 6서비스 전체**에서 handoff_jobs INSERT 확인 (6/6) | Foundry-X Production D1 조회 + 로그 캡처 |
| **DIVERGENCE 공식 마커 발행 수** | 0 (TC-REFUND-002만 SOURCE_MISSING) | **최소 3건 이상** | `provenance.yaml` DIVERGENCE 태그 grep |

### 5.2 MVP 최소 기준

- [ ] **M-1 TD-24 완결**: LPON refund `provenance.yaml`에 DIVERGENCE 마커 1건 이상 존재 + TC-REFUND-002 감사 로그 링크 포함
- [ ] **M-2 TD-25 완결**: Foundry-X Production `handoff_jobs` 테이블에 **Tier-A 6서비스 각각 1건 이상** row 존재 + 로그/스크린샷 증빙

> **이 2개가 미완이면 Phase 3 실패 선언.** Should Have 전부 미완이어도 MVP는 유지.

### 5.3 실패/중단 조건

- **True Must 2건 중 1건이라도 Sprint 1 말(약 1주)에 미완**: Phase 3 범위 재협상 또는 Phase 3 aborting
- **LLM 비용 폭증** (Anthropic/OpenRouter 합산 일일 한도 초과 3회 이상): S-1 AI-Ready 채점 자동화 일시 중단 + 샘플링 전환
- **Foundry-X 교차 PR merge 실패** (2회 이상 rebase 충돌 + 48h 지연): M-2 증거 수집 전략을 mock/재현 하네스로 변경 (MVP 임계값 재정의)

### 5.4 비기능 요구사항

| 항목 | 목표 |
|------|------|
| AI-Ready 채점 처리 속도 | 5,214 점수 산출 **30분 이내** (배치 처리, 병렬화 허용) |
| Production E2E 재현성 | 같은 입력 재실행 시 handoff_jobs row 중복 생성 없음 (idempotent) |
| DIVERGENCE 마커 감사 추적 | TC-ID ↔ BL-ID ↔ provenance.yaml line number 3자 연결 필수 |
| AgentResume SLA (S-2 구현 시) | P95 응답 2s 이내, 세션 재개 성공률 95% |

---

## 6. 제약 조건

### 6.1 일정

- **목표 완료일**: [Plan 단계에서 본부장 리뷰 D-Day 확정 후 역산]
- **마일스톤 후보** (D-Day 미정 상태 가설):
  - Sprint 218 (Week 1): True Must (M-1 + M-2) 완결
  - Sprint 219~220 (Week 2~3): Should Have 우선순위 상(S-1 AI-Ready + S-2 AgentResume) 1~2건
  - Sprint 221+ (Week 4~): Should 나머지 (체력 여유 시)

### 6.2 기술 스택

- **프론트엔드**: React 19 + Vite + Cloudflare Pages (기존 유지)
- **백엔드**: Cloudflare Workers + D1 + R2 + KV + Queues (기존 유지)
- **LLM**: Anthropic (Opus/Sonnet/Haiku) via AI Gateway, OpenRouter fallback
- **그래프 DB**: Neo4j Aura 5.x Query API v2 (기존 유지)
- **신규 검토 대상**: Tree-sitter Java grammar (WASM / native binding) — Workers 호환성 PoC 선행
- **기존 시스템 의존**: Foundry-X (`KTDS-AXBD/Foundry-X`) Production Worker + D1

### 6.3 인력/예산

- **투입 가능 인원**: 1명 (Sinclair 겸임, Decode-X + Foundry-X)
- **예산 규모**: LLM 호출 비용이 주요 변수
  - S-1 AI-Ready 채점 5,214 점수: 약 $50~$100 (Haiku 기준 예측)
  - M-2 Production E2E 6회: $5 미만 (호출 자체는 경량)
  - **일일 한도 가드 필수** — OpenRouter 대시보드 모니터링

### 6.4 컴플라이언스

- **KT DS 내부 정책**: PII 마스킹 체계 기존 유지 (POST /mask)
- **감사 로그**: 5년 보관 (금융 규정). DIVERGENCE 마커 발행도 감사 로그 대상
- **외부 규제**: 없음 (내부 2-org 파일럿)

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | 본부장 리뷰 D-Day 확정 (일정 역산의 전제) | Sinclair | Plan 단계 Sprint 218 착수 전 |
| 2 | Tree-sitter Java grammar의 Cloudflare Workers 환경 호환성 검증 (S-3 진입 전 PoC 필요) | Sinclair | S-3 착수 전 |
| 3 | AIF-REQ-021 PAL Router / REQ-023 Event Sourcing을 Phase 3에 편입할지 Phase 4로 미룰지 판단 | Sinclair | Should Have 4건 소화 후 재판단 |
| 4 | S-1 AI-Ready 채점기의 LLM 비용 관리 — 샘플링 전략 vs 전수 채점 결정 | Sinclair | Plan Sprint 218 말 |
| 5 | S-2 AgentResume 실구현 시 Foundry-X Orchestrator와의 상태 동기화 프로토콜 정의 | Sinclair | S-2 Design 단계 |
| 6 | Cross-repo PR 운영 시 Decode-X ↔ Foundry-X 의 어느 쪽을 먼저 merge할지 규칙화 (conflict 방지) | Sinclair | M-2 착수 전 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-21 | 최초 작성 (인터뷰 5파트 기반) | - |

---

## 부록 A. Phase 2 대비 변경점

### A.1 체질 유지
- Source-First 정책 (원장=Java/Spring 소스, 참고=문서, 3종 마커)
- Foundry-X 역할 분담 (Decode=Input Plane, Foundry=Process-Output Plane)
- 1인 체제 (Sinclair 겸임)
- LPON 전자온누리상품권 + Tier-A 6서비스 집중

### A.2 변경/확장
- 목표 frame: "핸드오프 E2E 첫 사례" → "핸드오프 E2E **정량 증거로 반복 가능성 입증**"
- Must Have 압축: Phase 2는 8 Sprint / Phase 3 True Must는 약 3h (압축 가능)
- Should Have 확장: 품질 자동화(S-1) + 운영화(S-2) + 기술부채 정리(S-3~S-6)
- KPI 이동: Match Rate % 중심 → **증거 수 + 자동 점수** 중심

### A.3 Phase 2 미완 반입
- M-3 DIVERGENCE 공식 마커 미발행 → Phase 3 M-1으로 승격
- M-6 Foundry-X Production E2E 증거 부재 → Phase 3 M-2로 승격
- Sprint 202 AgentResume stub → Phase 3 S-2로 편입

## 부록 B. 관련 문서

- 인터뷰 로그: `docs/req-interview/decode-x-v1.3-phase-3/interview-log.md`
- Phase 2 최종 PRD: `docs/req-interview/decode-x-v1.3-phase-2/prd-final.md`
- Phase 2 종합 Gap Analysis: `docs/03-analysis/features/phase-2-pipeline.analysis.md`
- Phase 2 Batch별 리포트: `docs/03-analysis/features/phase-2-batch2-pipeline.analysis.md`, `docs/03-analysis/features/sprint-214b-report.md`
- SPEC.md: §7 AIF-REQ-035 (IN_PROGRESS), §8 Tech Debt TD-20~28

---

*이 문서는 `/ax:req-interview` 스킬에 의해 자동 생성됐으며, Phase 2 API 자동 검토로 진입 예정.*
