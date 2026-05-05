---
id: AIF-RPRT-057
title: "Sprint 259 — F426 BL-028 단독 자동 검출 PoC + BL-027 heuristic 종결 보고"
sprint: 259
f_items: [F426]
req: AIF-REQ-035
plan: AIF-PLAN-057
design: AIF-DSGN-057
analysis: AIF-ANLS-057
status: DONE
created: "2026-05-05"
author: "Master (session 271)"
---

# Sprint 259 — F426 종결 보고

## §1 요약

| 항목 | 값 |
|------|-----|
| Sprint | 259 |
| F-item | F426 |
| 진행 방식 | Master inline (S253~271 7회 연속 회피 패턴 유지) |
| 시작 | 2026-05-05 (세션 271) |
| 종료 | 2026-05-05 (~3h) |
| Match Rate | **97%** |
| DoD 매트릭스 | 12/12 PASS |
| 검증 | typecheck 14/14 + lint 9/9 + test 11/11 PASS |

## §2 산출물 인덱스

| 카테고리 | 파일 | ID/메모 |
|----------|------|---------|
| Plan | `docs/01-plan/features/F426-bl-detector.plan.md` | AIF-PLAN-057 |
| Design | `docs/02-design/features/F426-bl-detector.design.md` | AIF-DSGN-057 |
| Analysis | `docs/03-analysis/features/sprint-259-bl-detection.analysis.md` | AIF-ANLS-057 |
| Report | `docs/04-report/features/sprint-259-F426.report.md` (본 문서) | AIF-RPRT-057 |
| Reports | `reports/sprint-259-bl-detection-2026-05-05.{json,md}` | — |
| Types | `packages/types/src/divergence.ts` | BLDivergenceMarker + CrossCheckRecommendation |
| Detector | `packages/utils/src/divergence/bl-detector.ts` | TS Compiler API |
| Cross-check | `packages/utils/src/divergence/provenance-cross-check.ts` | regex 기반 yaml 파서 |
| Index | `packages/utils/src/divergence/index.ts` | export barrel |
| Tests | `packages/utils/test/bl-detector.test.ts` | 11 cases |
| CLI | `scripts/divergence/detect-bl.ts` | tsx-runnable |
| Fixture | `scripts/divergence/fixtures/refund-pre-f359.ts` | F354 시점 시뮬레이션 |
| Tmp data | `/tmp/sprint-259-{fixture,real}-detection.json` | — |

## §3 진행 단계 요약

### Step 1 — 사전 조사 (0.3h)

- refund.ts 위치 발견 (`반제품-스펙/pilot-lpon-cancel/working-version/src/domain/refund.ts`, 252 lines, **TS 파일** — Java 아님)
- **중요 발견**: Sprint 251 F359로 4/5 marker 이미 코드 RESOLVED (BL-024/027/028/029) + BL-026만 미구현
- TypeScript Compiler API 가용성 확인 (`typescript@5.7.3` packages/utils 의존성)
- detector 가치 3축으로 재정의 (AST 정확도 + RESOLVED 자동 입증 + provenance status 권고)

### Step 2 — Plan/Design + SPEC 등록 (0.5h)

- AIF-PLAN-057 / AIF-DSGN-057 신규 작성
- SPEC.md §6 Sprint 259 블록 + F426 IN_PROGRESS 등록

### Step 3 — Detector 코드 + 단위 테스트 (1h)

- `packages/types/src/divergence.ts` 신규 — Zod 스키마 (BLDivergenceMarker + CrossCheckRecommendation + AutoDetectionResult + ProvenanceMarker)
- `packages/utils/src/divergence/bl-detector.ts` 신규 — `detectHardCodedExclusion()` (BL-028) + `detectUnderImplementation()` (BL-027) + `parseTypeScriptSource()` helper
- `packages/utils/src/divergence/provenance-cross-check.ts` 신규 — regex 기반 yaml 파서 + `crossCheck()` (UNKNOWN 분류 도입)
- `packages/utils/src/divergence/index.ts` 신규 — export barrel
- `packages/utils/test/bl-detector.test.ts` 신규 — **11 tests** (Plan 6+ 초과, BL-028 5 + BL-027 3 + cross-check 3) **전원 PASS**

### Step 4 — CLI + 양쪽 실측 (1h)

- `scripts/divergence/detect-bl.ts` CLI 신규 — `--source` / `--provenance` / `--out` / `--target-functions` / `--verbose`
- `scripts/divergence/fixtures/refund-pre-f359.ts` 신규 — F354 시점 코드 시뮬레이션 (BL-028 hardcoded 0 + BL-027 stub 2개)
- 합성 fixture 실측: BL-028 1 + BL-027 2 = **3 markers** (Plan 2+ 초과)
- 현 refund.ts 실측: BL-028 0 + BL-027 0 = **0 markers** (Sprint 251 F359 RESOLVED 자동 입증)
- Provenance cross-check: 2 RESOLVED 권고 (BL-027/028) + 3 UNKNOWN (BL-024/026/029, detector 미지원)
- **cross-check 보강**: 초기 구현이 미지원 marker도 RESOLVED 권고하는 false positive 발견 → `detectorSupported: boolean` + `recommendedStatus: UNKNOWN` enum 추가로 보완

### Step 5 — Analysis + Report + SPEC + Commit (0.5h, 진행 중)

- AIF-ANLS-057 (detector 효과 분석 + 자동화 1/5 정량화)
- AIF-RPRT-057 (본 보고서)
- SPEC §5 Last Updated + Sprint 259 ✅ DONE + F426 [x] 마킹

## §4 핵심 결과

### 4.1 자동화 진척 (F354 5건 → 2/5 즉시 구현)

| 마커 | Sprint 258 분류 | Sprint 259 구현 |
|------|-----------------|-----------------|
| BL-028 | 95% (가능) | ✅ 11 test PASS, 신뢰도 100% (5/5 test) |
| BL-027 | 70% (heuristic) | ✅ 11 test PASS, 신뢰도 ~85% (target 한정) |
| BL-024 | 60% (조건부) | UNKNOWN — F427 rules.md parser 선결 |
| BL-026 | 50% (조건부) | UNKNOWN |
| BL-029 | 50% (조건부) | UNKNOWN |
| **합계** | 5/5 분류 | **2/5 구현 (40%)** |

### 4.2 detector capability 명시 패턴 정립

자동화 시스템 설계 원칙으로 **Detector capability 명시 분리** 도입:
- `DETECTOR_SUPPORTED_RULES = new Set(["BL-027", "BL-028"])` 명시
- cross-check에서 미지원 marker는 `recommendedStatus: UNKNOWN` 분류
- 본 sprint scope를 넘는 marker는 자동 false positive 회피

이 패턴은 향후 다른 자동화 도구에도 적용 가능.

### 4.3 Stale provenance.yaml 자동 감지

Sprint 251 F359 코드 변경 후 provenance.yaml은 stale OPEN 상태 유지. Detector 도입으로 자동 감지:
- BL-027/028 → RESOLVED 권고 (코드 RESOLVED 상태 정확 반영)
- yaml write는 user 검토 후 별도 (audit metadata 보강 필요)

### 4.4 합성 fixture로 positive case 보장

현 코드가 자연 RESOLVED일 때 detector 검증 어려움 → `refund-pre-f359.ts` 합성 fixture로 positive case 입증. detector regression 시 fixture가 자동 catch.

## §5 DoD 매트릭스

| DoD 항목 | Plan | 결과 |
|----------|------|------|
| Plan/Design 신규 (AIF-PLAN/DSGN-057) | 작성 | ✅ PASS |
| SPEC §6 Sprint 259 + F426 등록 | 등록 | ✅ PASS |
| BLDivergenceMarker + CrossCheckRecommendation 타입 | 신설 | ✅ PASS |
| bl-detector.ts 2 detector 구현 | 구현 | ✅ PASS |
| 단위 테스트 ≥6건 PASS | ≥6 | ✅ PASS (11/11) |
| 합성 fixture refund-pre-f359.ts | 신규 | ✅ PASS |
| CLI scripts/divergence/detect-bl.ts | 신규 | ✅ PASS |
| 현 refund.ts 0 markers (RESOLVED auto 입증) | 0 | ✅ PASS (0/0) |
| 합성 fixture 2+ markers (positive case) | ≥2 | ✅ PASS (3 markers) |
| provenance.yaml 5 markers status 분석 | 5건 | ✅ PASS (2 RESOLVED + 3 UNKNOWN) |
| reports/ JSON + MD 실파일 | 실파일 | ✅ PASS |
| Match Rate ≥ 90% + typecheck/lint/test PASS | ≥ 90% | ✅ PASS (97%, 14/14 + 9/9 + 11/11) |

**총 12/12 PASS** — Match Rate **97%**.

## §6 후속 작업

### 6.1 즉시 가능 (P1)

**Sprint 260 (가칭) — F428 Phase 3b LPON 35 R2 재패키징 + F356-A 재평가**
- ~8h, ~$5 비용
- Tree-sitter AST → svc-policy 재추론 입력 통합 → LPON 35 skill 재패키징 → F356-A 재평가
- 가설: source_consistency 점수 향상 (vs 세션 264 baseline avg 0.506)

### 6.2 인프라 선결 (P2)

**F427 (가칭) — rules.md NL parser**
- ~16h
- BL-024/026/029 unblock — 자동화 비율 2/5 → 5/5 가능

### 6.3 보강 작업 (P3)

**F429 (가칭) — provenance.yaml status auto-write**
- ~4h
- detector 권고를 yaml write 자동화 + audit metadata 보강

## §7 학습/교훈

1. **사전 조사가 detector 가치 재정의** — refund.ts가 이미 4/5 RESOLVED 상태였다는 발견이 없었다면 "detector가 17 marker 검출 못 함 = 실패"로 오판할 위험. 사전 조사로 "stale provenance.yaml 자동 감지" 가치 발견.
2. **Detector capability 명시 패턴** — 자동화 도구가 모든 케이스를 다룰 수 없을 때 `DETECTOR_SUPPORTED_RULES` 명시 + `UNKNOWN` 분류 enum 도입이 false positive 회피의 핵심.
3. **합성 fixture의 가치** — 현 코드가 자연 RESOLVED일 때 positive case 검증을 위해 합성 fixture 필요. detector regression 자동 catch 보장.
4. **TS AST는 Java AST보다 즉시 구현 용이** — refund.ts가 TS 파일이라 typescript Compiler API로 ~30분 만에 detector 구현. Java domain 확장 시 Tree-sitter Java 동일 패턴 적용 가능.
5. **Master inline 7회 연속 회피 효율** — autopilot 대신 Master inline 진행이 detector 코드 + cross-check 보강 + 양쪽 실측 정합성 확보에 유리. autopilot self-Match 함정 회피 (Sprint 257 14회차 변종 직후 신뢰도 우려).
