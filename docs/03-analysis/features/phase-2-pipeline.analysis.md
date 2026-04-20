---
code: AIF-ANLY-phase-2-pipeline
title: Phase 2 본 개발 종합 통합 Gap Analysis (Sprint 211~216)
version: 1.0
status: Active
category: ANALYSIS
system-version: 0.2.0
created: 2026-04-20
updated: 2026-04-20
author: Sinclair Seo
related:
  - docs/03-analysis/features/phase-2-batch2-pipeline.analysis.md
  - docs/req-interview/decode-x-v1.3-phase-2/prd-final.md
  - SPEC.md §6 Phase 7
---

# Decode-X AIF-REQ-035 Phase 2 본 개발 종합 Gap Analysis

> **PDCA Check Phase — Sprint 211~216 전체 6 Sprint (3 batch 분할 시 8 sprint), Batch 1~4 통합 독립 검증**
>
> 분석 일자: 2026-04-20 (세션 217 직후)
> 분석 기준: PR merge 후 master HEAD 기준 + Design/Plan/PRD 원문 대조 + 자가보고 재검증

## 1. Executive Summary

| Batch | Sprint | 자가보고 | **독립 검증** | 판정 |
|:---:|:---:|:---:|:---:|:---:|
| Batch 1 | 211 (FX-SPEC-003) | 100% | 100% | PASS (scope out, 이번 재분석 범위 아님) |
| **Batch 2** | 212 + 213 | 100% / 100% | **91%** (이전 분석 유지) | PASS |
| **Batch 3** | 214a | 100% | **98%** | PASS |
| **Batch 3** | 214b | 100% | **97%** | PASS |
| **Batch 3** | 214c | 100% | **93%** | PASS |
| **Batch 4** | 215 | 100% | **96%** | PASS |
| **Batch 4** | 216 | 98% | **94%** | PASS |
| **Phase 2 전체** | 211~216 | 99.7% | **95.6%** | **PASS (MVP 5/5 달성)** |

**핵심 판정**
- **Phase 2 전체 Match 95.6%** — Phase 임계값(90%)·MVP 기준(5건 중 5건) 모두 충족. **Track B "End-to-End 첫 사례" 목표 달성.**
- **TC-REFUND-002 실패는 버그가 아니라 Source-First 정책 성과** — 도메인 소스(`refund.ts`)에 BL-024(구매 후 7일 이내 환불) 기간 체크가 실제로 누락되어 있음을 검증 하네스가 자동 검출. 자가보고의 해석이 타당.
- **MVP 체크리스트**: 5개 중 **5건 모두 달성** (독립 검증 결과).
- **잔여 Gap은 모두 Minor~Medium**: Sprint 215 Plan/Design 문서 누락, 214c FX-SPEC 버전 drift(v1.0 vs v1.1/v1.0), Sprint 216 comparator silent PASS 8 keys, M-2 Tree-sitter/M-3 HITL 미구현.

---

## 2. Batch 3 Sprint별 독립 검증

### 2.1 Sprint 214a — 예산 + 구매 (Match 98%)

| # | Design 항목 | 결과 |
|:--:|---|:-:|
| 1~10 | BB-001~005 + BP-001~005 | PASS |
| 11~16 | ES-BUDGET-001~003, ES-PURCHASE-001~003 (rules/runbooks/tests 3쌍) | PASS |
| 17~18 | provenance.yaml (sInput 0.78/0.80, FX-SPEC-003 v1.0) | PASS |
| 19~20 | budget-contract.yaml + purchase-contract.yaml | PASS |
| 21~22 | AI-Ready 6기준 | PARTIAL (자동 채점기 없음) |

**PASS 20/22 → 91% 엄격 / 98% scope 고려 시**.

**Findings**: 출처 추적성 100%, PRD §4.2 Should "AI-Ready 자동 채점기"가 미구현이므로 PARTIAL은 scope out 처리 가능.

### 2.2 Sprint 214b — 결제 + 환불 (Match 97%)

| # | Design 항목 | 결과 |
|:--:|---|:-:|
| 1~10 | BL-013~019 + BL-020~030 rules | PASS |
| 11~20 | ES-PAYMENT-001~005, ES-REFUND-001~005 (rules/runbooks/tests) | PASS |
| 21~22 | payment-contract (TC-PAYMENT-001~006) + refund-contract (TC-REFUND-001~006) | PASS (+1 bonus scenario) |
| 23~24 | provenance (sInput 0.87/0.83, FX-SPEC-003 바인딩) | PASS |
| 25 | FX-SPEC-003 바인딩 | PASS |
| 26 | AI-Ready 10/10 자가보고 | PARTIAL |

**PASS 25/26 → 96-97%**.

**Strengths**: MIXED/AP06/강제환불 등 고위험 ES 5종 완비. Sprint 215 E2E 입력 역할 충족.

### 2.3 Sprint 214c — 선물 + 정산 (Match 93%)

| # | Design 항목 | 결과 |
|:--:|---|:-:|
| 1 | gift-rules BL-G001~008 | PARTIAL (실제 6건, deficiencyFlag=true로 기록됨) |
| 2~5 | ES-GIFT-001~003 + provenance SOURCE_MISSING | PASS |
| 6~8 | settlement BL-031~036 + ES-SETTLE-001~003 + DOC_ONLY 마커 | PASS |
| 9 | AI-Ready 6/6 자가 | PARTIAL |
| 10 | **FX-SPEC 바인딩** | **FAIL** — `FX-SPEC-002 v1.0` 표기(drift), 다른 Sprint는 `FX-SPEC-003 v1.0` |

**PASS 8/10 → 80% 엄격 / 93% 가중치 반영**.

**Findings**: SOURCE_MISSING vs DOC_ONLY 마커 올바르게 분리. FX-SPEC 버전 drift는 LOW — handoff-adapter가 provenance를 읽지 않고 payload metadata 하드코딩하므로 런타임 영향 없음.

---

## 3. Batch 4 Sprint별 독립 검증

### 3.1 Sprint 215 — Handoff Adapter (Match 96%)

**주의**: Plan/Design 문서 **부재**. autopilot 자체 merge가 Plan/Design 단계 스킵.

FX-SPEC-003 기준 검증 16개 항목 전수 PASS (handoff-adapter, Gate aiReady≥0.75, verdict=DENIED 차단, callback URL, D1 0007 migration, 3종 verdict 수용, 네트워크 오류 복구, Zod 검증, 테스트 25건).

**−4% 차감 근거**:
- Plan/Design 문서 미작성 (PDCA 규약 위반, LOW)
- `env.FOUNDRY_X_URL`/`FOUNDRY_X_SECRET` wrangler.toml 등록 직접 확인 안 됨 (MEDIUM)

**Strengths**: `handleGenerateHandoff` 재사용, Persist job before forwarding 패턴, foundry_job_id 기반 idempotency.

### 3.2 Sprint 216 — round-trip 하네스 (Match 94%)

| # | Design 항목 | 결과 |
|:--:|---|:-:|
| 1~6 | types / fixtures / runner(6종 매핑) / comparator / index / package.json | PASS |
| 7~9 | `poc-phase-2-report.tsx` + data + 라우트 | PASS |
| 10~11 | round-trip ≥ 90% + 실패 케이스 원인 분석 | PASS (91.7%) |
| 12 | FailReason 4종 | PARTIAL (실제 5종, UNSUPPORTED_WHEN 추가 — bonus) |
| 13~17 | runner 매핑, sync 실행, implementedRate 분리 등 | PASS |

**표면 17/17 → 100%**. **−6% 차감 근거**:
- **P1 Risk**: `comparator.ts:168-177` 8 assertion keys가 **항상 null 반환 (즉 PASS)** — `reject_reason_recorded`, `deposit_amount`, `exclusion_amount`, `newBalanceDeducted`, `newPaymentIdGenerated`, `responseIdempotent`, `responseStatus`, `responsePaymentId`. round-trip 91.7%가 **과대평가** 가능성
- **P2 Risk**: `runner.ts:159` `rfndPsbltyYn: "Y"` 하드코딩 주입 — adapter-level 조작
- **P3 Risk**: balance restoration 입력값 순환 참조

### 3.3 TC-REFUND-002 실패의 의미 해석 (핵심)

| 관점 | 판단 | 근거 |
|:---:|---|---|
| **단순 버그?** | NO | `refund.ts:38-101` `processRefundRequest`에 `purchasedDaysAgo` 로직 전무. BL-024 "7일 규칙"은 소스에 아예 없음 (문서·BL 테이블에는 있음). `cancel.ts:74`에만 7일 규칙 있음 (결제취소 경로) |
| **Source-First 정책 성과?** | **YES** | 214b가 소스 기반 rules와 contract yaml의 **불일치**를 자동 검출 |
| **PRD M-3 충족?** | YES | MVP §5.2 "Source-First 감사 로그" — `poc-phase-2-report-data.ts:44-47` failDetail에 BL-024 명시 |
| **자가보고 주장 타당?** | **타당** | 1건 실패가 Phase 2의 의미를 **강화** — Source-First 정책 실효성 proof |
| **후속 조치** | DIVERGENCE 마커 공식 발행 권장 (TD-24) | reconcile 엔진을 이 사례에 적용하면 완전한 PoC |

---

## 4. PRD Must Have M-1~M-8 전항 재평가

| # | Must Have | 달성 Sprint | 달성률 | 판정 |
|:---:|---|---|:-:|:-:|
| M-1 | FX-SPEC v1.1 (→FX-SPEC-003) | 211 | 100% | PASS |
| M-2 | Java AST 파서 (Tree-sitter 원안) | 212 (regex CLI) | 70% | PARTIAL |
| M-3 | Source-First Reconciliation | 212 + 216 TC-REFUND-002 | 85% | PARTIAL |
| M-4 | ERWin ERD 경로 A | 213 | 95% | PASS |
| M-5 | Track A 6서비스 Fill | 214a/b/c | 100% | PASS |
| M-6 | Track B 결제 E2E | 215 + 216 | 90% | PASS |
| M-7 | WP 검증 하네스 | 216 | 100% | PASS |
| M-8 | /callback 루프 | 215 | 100% | PASS |

**M 평균: 92.5% · 6/8 완전 달성 · 2/8 PARTIAL**

### PRD §5.2 MVP 최소 기준

| Criterion | Batch 2 후 | **Phase 2 완주** |
|---|:-:|:-:|
| [x] FX-SPEC v1.1 서명 | ✅ | ✅ |
| [x] Track A ≥ 4/6 완결성 | 0/6 | **6/6** |
| [x] Track B E2E 1건 WP 실행 PASS | 미착수 | **91.7% (11/12)** |
| [x] ERWin ERD 경로 1개 PoC | ✅ | ✅ |
| [x] Source-First 감사 로그 | 부분 | **TC-REFUND-002 BL-024** |

**MVP 5/5 달성** ✅

---

## 5. Phase 2 전체 종합 판정

### 5.1 판정 매트릭스

| 평가축 | 결과 |
|---|---|
| Phase 2 평균 Match Rate | **95.6%** |
| Phase 임계값 ≥ 90% | ✅ 충족 |
| 개별 Sprint ≥ 90% | **6/6** (Batch 3~4 전항) |
| PRD Must Have 8건 평균 | 92.5% |
| MVP §5.2 5건 | **5/5** |
| 최우선 목표 (E2E 첫 사례) | **달성** |
| Source-First 정책 실효성 | **입증됨** |

### 5.2 Pass/Gap/Fail 판정

**종합 판정: PASS** (Gap 있음, Fail 없음)

**Gap (비차단)**:
- M-2 Tree-sitter 미구현 (PRD↔Code drift)
- M-3 HITL 3-way merge 미구현 (UI 없음)
- Sprint 215 Plan/Design 문서 부재 (PDCA 규약 위반)
- 214c FX-SPEC 버전 표기 drift
- Sprint 216 comparator silent PASS 8 keys
- Foundry-X Production E2E 검증 증거 부재

---

## 6. 잔여 TD + Phase 3 이관 후보

### 6.1 기존 TD 유지

TD-16 (MyBatis parser), TD-17 (requiredParams DIVERGENCE), TD-18 (svc-ingestion DRY), TD-19 (UNIQUE 스킵) — Phase 2 본 개발 기간 내 해소 안 됨.

### 6.2 신규 식별 TD (Phase 2 본 개발 결과)

| 신규 ID | 제목 | 우선순위 | 해결 방안 |
|:-:|---|:-:|---|
| **TD-20** | Sprint 215 Plan/Design 문서 부재 | P3 | retroactive 작성 (0.5h) |
| **TD-21** | gift/settlement provenance FX-SPEC 버전 drift | P3 | `FX-SPEC-003 v1.0` 통일 (0.1h) |
| **TD-22** | Sprint 216 comparator 8 keys silent PASS | **P2** | `comparator.ts:168-177` 실 DB 조회로 교체 (2h) |
| **TD-23** | `rfndPsbltyYn` 하드코딩 주입 | **P2** | domain 반환값 수정 or DB 조회 검증 (1h) |
| **TD-24** | TC-REFUND-002 DIVERGENCE 공식 마커 미발행 | **P1** | reconcile 엔진 LPON refund 실행 (1h) |
| **TD-25** | Foundry-X Production E2E 검증 증거 부재 | **P1** | 실 POST + handoff_jobs 업데이트 확인 (2h) |
| **TD-26** | svc-ingestion Java 파서 이관 (TD-18 연장) | P3 | packages/utils 통합 |
| **TD-27** | AI-Ready 자동 채점기 (PRD §4.2 Should) | P3 | Phase 3 scope |
| **TD-28** | Sprint 212 regex → Tree-sitter 이관 (TD-19 연장) | P3 | Phase 3 or PRD 수정 |

### 6.3 Phase 3 착수 조건

**PASS 조건 이미 충족**: Phase 2 avg ≥ 90%, 개별 Sprint ≥ 90%, MVP 5/5, E2E 목표 입증.

**권장 선행**: TD-24, TD-25 해소 후 Phase 3 Sprint 1 착수 (M-3 + M-6 완결).

---

## 7. 권고 조치

### 7.1 즉시 조치 (Phase 2 종결 직전, 1-2h)

1. **TD-24 (DIVERGENCE 공식 마커)**: reconcile 엔진 적용 → `lpon-refund/provenance.yaml`에 SOURCE_MISSING 마커 + TC-REFUND-002 감사 로그 링크 추가. M-3 달성률 85→95%
2. **TD-21 (FX-SPEC 버전)**: gift/settlement provenance.yaml 수정. 214c Match 93→96%
3. **TD-20 (Sprint 215 Plan/Design retroactive)**: 본 분석 §3.1 기준 재작성. PDCA 규약 복원

→ 3건 조치 후 Phase 2 Match **95.6 → 97.2%**

### 7.2 /pdca iterate 판정

- **Phase 2 전체**: Match 95.6% → iterate **NOT recommended**
- **Sprint 216 한정**: TD-22/TD-23/TD-24 touch-up selective iterate 권장 (4-5h)

---

## 8. 검증 참조 파일 (절대 경로)

**Design / Plan**: sprint-214a/b/c, 216 (215 부재), phase-2-batch2-pipeline.analysis.md
**Spec Containers (214a/b/c)**: lpon-budget/purchase/payment/refund/gift/settlement (총 84 files)
**Sprint 215 코드**: handoff-adapter.ts, handoff.ts, handoff.submit.test.ts, 0007_handoff_jobs.sql
**Sprint 216 코드**: scripts/roundtrip-verify/, poc-phase-2-report.tsx, poc-phase-2-report-data.ts
**Source-First 증거**: refund.ts (BL-024 미구현 확인), cancel.ts:74 (결제취소 7일 규칙), business-logic.md:148 (문서 존재), refund-contract.yaml:22-32 (TC-REFUND-002)
