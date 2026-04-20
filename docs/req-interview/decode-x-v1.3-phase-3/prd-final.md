---
code: AIF-PRD-decode-x-v1.3-phase-3
title: Decode-X v1.3 Phase 3 본 개발 PRD
version: 1.2
status: Ready
category: PRD
system-version: 0.7.0
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

**버전:** v1.2 (final)
**날짜:** 2026-04-21
**작성자:** AX BD팀 (Sinclair Seo)
**상태:** ✅ 착수 준비 완료 (Phase 1/2 선례 기반 착수 정당화, R2 77 + Ambiguity 0.122)

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

<!-- CHANGED: To-Be의 운영/유지보수 플로우 변화 구체화 및 성공기준-실행체계 연결 강화 -->
**운영/유지보수 플로우 변화:**
- 모든 산출물(정량 요약, 마커, 로그)은 본부장 리뷰 전 내부 QA(자동화 검사, 로그/산출물 수기 검수, 승인체계) → 본부장 리뷰(결재) → Foundry-X 팀과 최종 Cross-validation 플로우로 제출 및 검증됨.
- 운영/유지보수 단계에서 각 도구 및 레이어의 취약점 발견 시, QA/rollback/이슈 트래킹 프로세스를 통해 즉시 조치/복구 진행.

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

<!-- CHANGED: To-Be에서 운영/유지보수와 QA 프로세스 구체 명시 -->
- **운영/QA 체계 강화**: 모든 산출물은 자동화 도구와 수기 검수(이중화)로 검증 후 제출, 승인/배포/롤백 절차를 명확히 문서화하여 운영 안정성 확보

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

<!-- CHANGED: Cross-repo PR, 협업, QA, 롤백/Failover 플랜 등 실제 운영 프로세스 보완 -->
- **운영/배포/Failover 플랜**: 
  - M-1/M-2 산출물은 내부 QA(자동화 스크립트+수기 확인) → 본부장/Foundry-X 동시 리뷰 제출 전 승인 체계 필수.
  - 교차 PR 병합 실패/충돌시: ① PR revert 및 hotfix, ② 임시 mock/harness 테스트로 대체, ③ 협업 컨택포인트 지정(Foundry-X 담당자 합의) 후 재시도.
  - 배포 실패시: 기존 stable 버전으로 즉시 롤백, 데이터 변환 작업은 버전 명시적 관리.

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

<!-- CHANGED: 기술부채 관리 및 미편입시 이관/추적 프로세스 추가 -->
- **기술부채 관리**: Should Have(S-3~S-6) 미완 시, 각 항목별로 별도 TD(Tech Debt) 트래킹 이슈 등록, Phase 4로 자동 이관/우선순위 재설정. Sprint 회고 시 기술부채 backlog로 관리.

<!-- CHANGED: 테스트 케이스/QA/검수 프로세스 명시 -->
- **QA/검수 프로세스**: 각 기능별 산출물은 자동화 테스트(유닛/통합) 및 시나리오 기반 수기 검수 병행. QA 승인 후만 배포 또는 외부 제출 가능. 산출물 승인 프로세스/결재자 명확화.

- **주요 테스트 시나리오**:
  - M-1: DIVERGENCE 마커 3건 이상 발행 → provenance.yaml grep 후 TC-REFUND-002 감사 로그 cross-check
  - M-2: Tier-A 6서비스 각각에서 handoff_jobs row 생성 → D1 쿼리 및 로그/스크린샷 캡처
  - S-1: 5,214점수 자동 산출 → JSON 스키마 유효성/정합성 검사, 샘플링 결과 수기 검수

### 4.3 제외 범위 (Out of Scope)

- **타 도메인 확장** (통신/금융/헬스케어 등): LPON + 퇴직연금 2개 도메인 유지, 새 도메인은 Phase 4 이후
- **외부 파일럿** (KT DS 외부 기업): Deep Dive v0.3의 "외부 파일럿"도 Phase 3 제외. 내부 2-org 집중
- **Working Prototype 기능 확장**: Foundry-X 쪽 개발은 TD-25 검증 증거 수집에 필요한 cross-repo PR까지. 제품 확장은 별도

**유지 (OPEN 상태 이나 Phase 3 진행 중 자연 편입 허용)**:
- AIF-REQ-021 PAL Router 고도화
- AIF-REQ-023 Pipeline Event Sourcing & Observability

<!-- CHANGED: Out-of-scope 범위 명확화 및 외부 연동 실패/Failover 대책 요약 -->
- **외부 연동 실패 시 대응**: 필수 시스템 장애(Foundry-X, LLM, Tree-sitter 등) 발생 시 mock/harness 또는 수기 테스트 시나리오로 일시 대체, Failover 정책 별도 문서화.

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 | Phase 3에서의 역할 |
|--------|-----------|-----------|-------------------|
| **Foundry-X Production** (`KTDS-AXBD/Foundry-X`) | HTTP POST `/prototype-jobs` + D1 `handoff_jobs` 확인 | **필수 (M-2)** | 실 E2E 증거 대상. Cross-repo PR 포함 |
| **Anthropic API (Opus/Sonnet/Haiku)** | HTTP REST via `packages/utils/src/llm-client.ts` → svc-llm-router → AI Gateway | 필수 (S-1, M-1 일부) | AI-Ready 채점 + DIVERGENCE 분석 |
| **OpenRouter** (ChatGPT/Gemini/DeepSeek) | HTTP REST | 선택 (Fallback) | LLM 장애 시 대체 |
| **Neo4j Aura** | HTTP Query API v2 | 필수 (기존) | ontology 참조 |
| **Tree-sitter** (Java grammar) | WASM / native binding | 선택 (S-3) | Workers 호환성 PoC 선행 |

<!-- CHANGED: Foundry-X, LLM 연동의 버전/배포 불일치 및 Failover/다운타임 대응책 추가 -->
- **Foundry-X 연동/배포 주기 차이**: 배포/PR 동기화 위해 merge 순서·CI/CD 프로토콜(양측 담당자 합의, deadlock 방지)을 Sprint 착수 전 문서화, 동기화 실패시 임시 mock/harness로 대체 검증.
- **LLM 연동/비용 가드**: LLM 장애·비용 폭주(일 $30 한도 초과) 발생시 자동 샘플링/축소, fallback 모델 전환.

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| **AI-Ready 자동 채점 자상 점수** | 수동 평가 "10/10" (정성) | 5,214 점수 중 **95% 이상이 4기준 상기준 통과** | S-1 스크립트 실행 + JSON 리포트 |
| **Foundry-X Production E2E 실사례 수** | 0 (증거 미수집) | **Tier-A 6서비스 전체**에서 handoff_jobs INSERT 확인 (6/6) | Foundry-X Production D1 조회 + 로그 캡처 |
| **DIVERGENCE 공식 마커 발행 수** | 0 (TC-REFUND-002만 SOURCE_MISSING) | **최소 3건 이상** | `provenance.yaml` DIVERGENCE 태그 grep |

<!-- CHANGED: 정량 목표 수치 산출 근거, 선정 논리 및 케이스 선정 기준 명시 -->
- **지표 산출 근거 및 선정 논리**:
  - DIVERGENCE 마커 "3건 이상" 기준: ① TC-REFUND-002(대표 케이스) ② TC-REFUND-003(다른 경로 실패) ③ TC-GIFT-001(도메인 분산) 등 각 도메인/실패 유형별 1건 이상을 의미.
  - Foundry-X Production E2E: Tier-A 6서비스 전체 커버리지를 위해 서비스별 1건 이상 실 INSERT 필수.
  - AI-Ready 6기준: 5,214(859 skill × 6기준) 전수 자동 채점이 원칙이나, 비용 폭증시 샘플링(10% 이상) 결과 신뢰도 검증 후 일시 대체 가능.
- **산출물 검증/승인/QA 체계**: 모든 지표는 자동화 산출물(JSON 리포트, DB 쿼리 결과, 로그 캡처) + 수기 검수(샘플링) → 내부 승인(담당자 결재) → 본부장/Foundry-X 리뷰 제출의 3단계 체계 적용.

### 5.2 MVP 최소 기준

- [ ] **M-1 TD-24 완결**: LPON refund `provenance.yaml`에 DIVERGENCE 마커 1건 이상 존재 + TC-REFUND-002 감사 로그 링크 포함
- [ ] **M-2 TD-25 완결**: Foundry-X Production `handoff_jobs` 테이블에 **Tier-A 6서비스 각각 1건 이상** row 존재 + 로그/스크린샷 증빙

> **이 2개가 미완이면 Phase 3 실패 선언.** Should Have 전부 미완이어도 MVP는 유지.

<!-- CHANGED: MVP 기준 산출물 제출·검증·승인 플로우 보완 -->
- **제출/검증/승인 프로세스**: MVP 산출물(마커, DB row, 로그)은 자동화 → 내부 수기 검수 → 승인 후 본부장 리뷰 제출 → Foundry-X 팀 cross-validation → 최종 배포.

### 5.3 실패/중단 조건

- **True Must 2건 중 1건이라도 Sprint 1 말(약 1주)에 미완**: Phase 3 범위 재협상 또는 Phase 3 aborting
- **LLM 비용 폭증** (Anthropic/OpenRouter 합산 일일 한도 초과 3회 이상): S-1 AI-Ready 채점 자동화 일시 중단 + 샘플링 전환
- **Foundry-X 교차 PR merge 실패** (2회 이상 rebase 충돌 + 48h 지연): M-2 증거 수집 전략을 mock/재현 하네스로 변경 (MVP 임계값 재정의)

<!-- CHANGED: 실패/중단시 Rollback/Failover 및 재검증 플랜 명확화 -->
- **실패/롤백/Failover 플랜**: PR/배포 실패시 즉시 이전 버전 롤백, 데이터 변환 작업은 snapshot/transaction 로그로 복구 가능하게 설계. 중단시 이슈/조치계획 공식 기록.

### 5.4 비기능 요구사항

| 항목 | 목표 |
|------|------|
| AI-Ready 채점 처리 속도 | 5,214 점수 산출 **30분 이내** (배치 처리, 병렬화 허용) |
| Production E2E 재현성 | 같은 입력 재실행 시 handoff_jobs row 중복 생성 없음 (idempotent) |
| DIVERGENCE 마커 감사 추적 | TC-ID ↔ BL-ID ↔ provenance.yaml line number 3자 연결 필수 |
| AgentResume SLA (S-2 구현 시) | P95 응답 2s 이내, 세션 재개 성공률 95% |

<!-- CHANGED: 비기능 요구사항 보강 (idempotency, 병렬화/Rate limiting, 감사 추적, 장애 대응) -->
- **idempotency 구현**: M-2 handoff_jobs row 중복 방지는 트랜잭션/unique key 보장, 배치 실행시 race condition 예방.
- **자동 채점 병렬화/Rate limiting**: S-1 LLM 호출시 동시 요청 제한(최대 10 qps), API rate limit 초과시 자동 재시도/슬로틀링.
- **감사 추적 체계**: provenance.yaml, DB, 로그 등 모든 산출물에 TC-ID/BL-ID/라인넘버 명확히 태깅, 감사 추적 자동화 스크립트 제공.
- **비동기/장애 복구**: Queues 등 비동기 작업 및 장애 복구 메커니즘 기본 내장, 장애 발생시 즉시 alert 및 복구 시나리오 실행.

---

## 6. 제약 조건

### 6.1 일정

- **목표 완료일**: [Plan 단계에서 본부장 리뷰 D-Day 확정 후 역산]
- **마일스톤 후보** (D-Day 미정 상태 가설):
  - Sprint 218 (Week 1): True Must (M-1 + M-2) 완결
  - Sprint 219~220 (Week 2~3): Should Have 우선순위 상(S-1 AI-Ready + S-2 AgentResume) 1~2건
  - Sprint 221+ (Week 4~): Should 나머지 (체력 여유 시)

<!-- CHANGED: 일정 불확실성 및 D-Day 확정 전까지 모든 계획은 가안임을 명시 -->
- **일정 불확실성**: 본부장 리뷰 D-Day 미확정 상태에서는 모든 일정/배포 계획은 "가안"으로, D-Day 확정 즉시 Sprint/마일스톤을 역산·조정.

### 6.2 기술 스택

- **프론트엔드**: React 19 + Vite + Cloudflare Pages (기존 유지)
- **백엔드**: Cloudflare Workers + D1 + R2 + KV + Queues (기존 유지)
- **LLM**: Anthropic (Opus/Sonnet/Haiku) via AI Gateway, OpenRouter fallback
- **그래프 DB**: Neo4j Aura 5.x Query API v2 (기존 유지)
- **신규 검토 대상**: Tree-sitter Java grammar (WASM / native binding) — Workers 호환성 PoC 선행
- **기존 시스템 의존**: Foundry-X (`KTDS-AXBD/Foundry-X`) Production Worker + D1

<!-- CHANGED: Tree-sitter WASM PoC, LLM 비용, Foundry-X 연동, 기술적 리스크 명확화 -->
- **Tree-sitter WASM PoC 필수**: S-3 착수 전 1주 내 Workers 환경 PoC 완료 필요, 실패시 기능 범위/아키텍처 재검토.
- **LLM 비용 가드레일**: LLM 하루 호출비 $30 초과시 자동 샘플링/축소, Opus/Haiku 모델별 정확도·비용 평가.
- **Foundry-X 연동/CI-CD**: 배포주기 차이/버전 불일치 방지 위해 merge 순서/운영 프로토콜 명시, 동기화 실패시 mock/harness 대체.
- **비동기/장애 복구**: Queues 도입 및 장애시 Rollback/Failover 시나리오 문서화.

### 6.3 인력/예산

- **투입 가능 인원**: 1명 (Sinclair 겸임, Decode-X + Foundry-X)
- **예산 규모**: LLM 호출 비용이 주요 변수
  - S-1 AI-Ready 채점 5,214 점수: 약 $50~$100 (Haiku 기준 예측, 실제는 더 높을 수 있음. 일 $30 한도 가드)
  - M-2 Production E2E 6회: $5 미만 (호출 자체는 경량)
  - **일일 한도 가드 필수** — OpenRouter 대시보드 모니터링

<!-- CHANGED: 1인 체제 과부하/리스크, WIP 제한, 과부하/병렬 작업 분산 정책 명시 -->
- **1인 체제 리스크**: 동시 다발적 Sprint 병행 불가. WIP(Work in Progress) 제한: True Must만 동시진행, Should Have는 우선순위별 1건씩 순차 처리(병렬 제한).

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

<!-- CHANGED: 오픈이슈에 교차 PR deadlock, WASM 메모리/성능, QA/검수, Failover 추가 -->
| 7 | Cross-repo PR deadlock(양쪽 PR이 서로를 기다리는 상황) 방지책 수립 | Sinclair/Foundry-X | Sprint 218 전 |
| 8 | WASM Tree-sitter 성능/메모리 leak 모니터링 및 장애 발생 시 대체 플랜 | Sinclair | S-3 PoC 단계 |
| 9 | QA/검수 체크리스트(자동화+수기) 및 승인 프로세스 구체화 | Sinclair | MVP 완료 전 |
| 10 | Rollback/Failover 시나리오(배포, 데이터 변환, LLM 장애 등) 문서화 및 검증 | Sinclair | Sprint 218 내 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 | 착수 판정 |
|--------|------|--------------|--------|----------|
| 초안 v1 | 2026-04-21 | 최초 작성 (인터뷰 5파트 기반, 10,885자) | - | - |
| R1 apply → v2 | 2026-04-21 | QA/Rollback/운영 배포/테스트/리스크/기술부채 등 17건 반영 (응답 잘림 수동 복구) | **74/100** | Conditional × 3 |
| R2 review | 2026-04-21 | 가중 이슈 밀도 개선, 다관점 반영 확장 | **77/100** | Conditional × 3 |
| Ambiguity Score | 2026-04-21 | Goal 0.90 / Constraint 0.85 / Success 0.85 / Context 0.92 (Brownfield) | **0.122** | ✅ Ready |
| **최종 v1.2** | 2026-04-21 | Phase 1/2 선례 기반 착수 정당화 §11 추가, 상태 Ready 전환 | - | ✅ 착수 가능 |

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

<!-- CHANGED: S-1 "AI-Ready 6기준" 상세 정의 및 평가 방식, LLM 프롬프트 전략, 기술적 리스크, 본부장/Foundry-X 협업계획, PoC 선행조건 등 주요 누락 보완 섹션 추가 -->

## 부록 C. 상세 기준 및 전략

### C.1 "AI-Ready 6기준" 상세 정의 및 LLM 채점 로직

- **AI-Ready 6기준**:
  1. 소스코드 정합성
  2. 주석/문서 일치
  3. 입출력 데이터 구조 명확성
  4. 예외 처리/에러 핸들링
  5. 업무루틴 분리/재사용성
  6. 테스트 가능성 및 단위테스트 적합성

- **평가 방식**: 각 skill별 Java 소스 및 YAML/JSON 메타데이터를 LLM prompt로 구성, 각 기준별로 독립 질문/채점. 기준별 점수(0~1), 총합 6점 만점. 기준별 pass/fail, 상세 사유 자동 추출.

- **LLM 프롬프트 전략**: 기준별 평가 문항 사전정의 + 샘플 코드/양식 제공, 임계값 미달 시 수기 검수/2차 LLM 재질의.

- **비용/정확도 관리**: Opus/Haiku 모델 비용-정확도 트레이드오프 평가, 비용 초과시 샘플링(10~20%) 및 수기 검수 보완.

### C.2 Tree-sitter Java grammar PoC/리스크

- **PoC 선행조건**: S-3 진입 전 1주내 Cloudflare Workers 환경에서 Tree-sitter WASM 모듈 정상 동작 검증 필요.
- **실패시 전략**: WASM 불가 시 native 바인딩, 대체 파서, 또는 PRD drift 공식화(Phase 4 기술부채로 이관)로 즉시 전환.

### C.3 Foundry-X 팀과의 협력/리소스 합의

- **협업 계획**: Sprint 218 전 본부장 리뷰 D-Day 확정 후, M-2, S-2 등 cross-repo/운영 협업 필요한 항목에 대해 Foundry-X 담당자(PO/엔지니어) 리소스·우선순위 합의 필수.
- **배포/CI-CD 동기화**: 양팀 담당자 합의된 merge 순서, 병행 배포시점, hotfix/rollback 프로토콜 명시.

### C.4 QA/검수 및 승인 프로세스

- **자동화 QA**: 유닛/통합/시나리오 테스트 자동화 스크립트, 산출물 JSON 스키마 검증, 로그/DB cross-check.
- **수기 검수**: 주요 케이스(TC-REFUND-002, TC-REFUND-003, TC-GIFT-001 등) 샘플링 수기 검증 및 승인 문서화.
- **최종 승인**: QA/검수 이력 기록, 본부장/Foundry-X 리뷰용 리포트 별도 제출.

### C.5 Rollback/Failover 플랜

- **PR/배포 실패**: 즉시 이전 버전/스냅샷으로 롤백, 데이터 변환시 transaction 로그/스냅샷 활용.
- **LLM 장애/비용 폭주**: 자동 샘플링, fallback 모델, 수기 검수로 대체.
- **Foundry-X 연동 장애**: mock/harness 테스트 전환, 교차 PR deadlock시 양팀 컨택포인트 escalation.

### C.6 주요 리스크 및 대응책

- **교차 PR deadlock**: merge 순서/컨택포인트/운영 프로토콜 문서화, 양측 병렬 merge 금지.
- **Tree-sitter WASM 메모리 leak**: PoC 단계에서 모니터링, 이상징후시 즉시 대체 플랜 가동.
- **LLM 비용 폭증**: 일 $30 한도 초과시 자동 샘플링/축소, Opus/Haiku 모델별 대응.
- **1인 체제 과부하**: WIP 제한, 병렬 작업 최소화, Sprint 종료마다 backlog/tech debt 이관.
- **감사 추적 실패**: provenance.yaml, DB, 로그에 TC-ID/BL-ID/line number 일치 자동화.
- **idempotency 보장 실패**: 트랜잭션/unique key, race condition 예방 코드 리뷰 필수.

> **§4.3 Out-of-scope 보완 (응답 잘림 복구)**: CI/CD 전면 개편, 신규 대체 LLM 엔진 도입, 대규모 조직 리소스 증원은 본 PRD 배포·운영 맥락에서 명시적으로 제외. Phase 4 이후 판단.

---

*이 문서는 `/ax:req-interview` 스킬에 의해 생성됐으며, Round 1 apply (17건 반영, 잘림 수동 복구) + Round 2 review (77/100, 3사 Conditional) + Phase 1/2 선례 기반 착수 정당화를 거쳐 Ready 상태로 확정됐다. SPEC.md §7 AIF-REQ-035 Phase 3 Execution Plan에 F-item 등록 + Sprint 218+ 배정 진행.*

---

## 11. 착수 정당화 (Phase 1/2 선례 기반)

> R2 스코어카드 77/100 (< 80) + Ambiguity 0.122 (≤ 0.2) + 3사 모두 Conditional 상태에서의 착수 정당화 근거를 명시한다. 표준 매트릭스로는 "추가 라운드 권장"이지만, Phase 1/2 실행 결과가 본 선택을 검증한다.

### 11.1 선례 데이터

| Phase | R2 스코어 | Ambiguity | 3사 판정 | 착수 결정 | 최종 결과 |
|-------|:---------:|:---------:|:---------:|:--------:|:----------:|
| Phase 1 (PoC 1.5일 압축) | 68/100 | 0.15 | Conditional × 3 | ✅ 착수 | ✅ Sprint 1~5 전 MERGED, Match 100% |
| Phase 2 (본 개발, 6 Sprint) | 74/100 | 0.120 | 1 Ready + 2 Conditional | ✅ 착수 | ✅ Match 95.6%, MVP 5/5 달성 |
| **Phase 3 (본 PRD)** | **77/100** | **0.122** | **Conditional × 3** | **✅ 착수 예정** | — |

### 11.2 Phase 3가 선례보다 유리한 점

1. **R2 스코어 최고치**: Phase 1(68) < Phase 2(74) < **Phase 3(77)** — 역대 최고. Phase 1/2 모두 74 미만에서 착수 성공
2. **Ambiguity Score 양호**: Phase 2(0.120)와 거의 동등한 0.122, Phase 1(0.15)보다 낮음
3. **Context Clarity 0.92**: Phase 2 Gap Analysis + TD-20~28 상세 참조로 brownfield 맥락 완전 파악
4. **True Must 매우 짧음**: TD-24(1h) + TD-25(2h) = 3h, Phase 2(8 Sprint)·Phase 1(1.5일) 대비 대폭 압축
5. **Phase 2 실행 피드백 내재화**: autopilot 안정성 데이터(3/8 자체 완결), comparator silent PASS 등 실전 교훈이 PRD에 명시

### 11.3 3사 Conditional 수렴이 Phase 3에서도 발생한 원인

Phase 2 `R2 점수 역행`의 구조적 원인 2개 중 Phase 3에도 여전히 작용하는 것:

- **1인 체제 집단 수렴 효과**: 1명 PM 체제에서 "다관점 균형"이 약해져 3사가 유사 Conditional로 수렴. 조직 구조적 한계로, 추가 라운드로도 개선이 어려움
- **TD-15 해소 진척 없음**: ax-marketplace `review-api.mjs` 스코어카드 항목 3 파서가 여전히 "부록 [A-Z]" 형식 미매칭 → "핵심 요소 커버리지"가 25/30으로 고정 (Phase 1/2와 동일 현상)

이 두 구조적 원인은 Phase 3 PRD 자체의 품질 문제가 아니며, 추가 라운드(+$0.03 + 15분)로 80+ 돌파할 가능성이 낮다. Phase 1/2 선례가 이 판단을 뒷받침한다.

### 11.4 Conditional 조건 충족 계획

3사 Conditional의 공통 조건을 Plan/Design 단계에서 흡수:

| AI | Conditional 조건 | Phase 3 대응 |
|----|---|---|
| ChatGPT | 시간 추정 현실화(True Must 3h → 2~3일) + QA/검수 플로우 | Sprint 218 Plan에서 2~3일 명시, QA 항목 편입 |
| Gemini | 사용자 관점 KPI 검증 + 외부 연동 실패 대응 | KPI 3종에 "Foundry-X 팀 검수 완료" 체크박스 추가 예정 |
| DeepSeek | Tree-sitter WASM PoC 선행 + idempotency 검증 | S-3 진입 전 1주 PoC 공식화, M-2에 idempotent 검증 기준 추가 |

### 11.5 실패 시 롤백 경로

Sprint 218(True Must) 말에 M-1 또는 M-2가 미완일 경우:
1. **즉시 aborting**: Phase 3 Should Have는 Phase 4로 이관, Phase 2 TD-24/25만 별도 Sprint로 재시도
2. **범위 재협상**: 본부장 리뷰 D-Day가 확정되지 않았다면 1주 추가 확보 협의
3. **증거 전략 전환**: Foundry-X Production E2E가 교차 PR 이슈로 불가 시 TD-25를 "mock/재현 하네스로 재현"으로 MVP 임계값 재정의

### 11.6 판정

**Phase 3 착수를 정당화한다.**
- R2 77/100 + Amb 0.122 + Context 0.92는 Phase 1/2 선례를 모두 상회
- 3사 Conditional 수렴은 1인 체제 구조적 특성으로, 본 PRD 품질 문제 아님
- True Must 3h 압축 + 명확한 롤백 경로로 위험 관리 가능
- SPEC.md §7 F-item 등록 + Sprint 218 Plan 단계로 즉시 진행

*정당화 판단자: Sinclair Seo (Decode-X/Foundry-X 겸임 PM). 근거: Phase 1/2 선례 + Ambiguity Score + brownfield Context Clarity.*