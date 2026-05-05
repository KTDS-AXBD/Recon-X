---
id: AIF-PLAN-059
title: "F428 — Phase 3b 분할 1/2: Multi-domain rules.md parser 검증 + detector 적용 매트릭스"
sprint: 261
f_items: [F428]
req: AIF-REQ-035
related_features: [F354, F425, F426, F427]
related_td: [TD-24, TD-55]
status: PLANNED
created: "2026-05-05"
author: "Master (session 273, Sprint 261)"
related: [AIF-PLAN-058]
---

# F428 — Multi-domain rules.md parser 검증 (Phase 3b 분할 1/2)

## Background

Sprint 260 (F427)에서 lpon-refund 단일 도메인에 한정된 rules.md parser + 5 detector(BL-024/026/027/028/029) 완성. Sprint 261은 **나머지 6 spec-containers**에 parser 적용성 검증 + detector 적용 가능 매트릭스 도출.

**사용자 결정** (세션 273 AskUserQuestion):
- 범위 = **분할 접근** (R2 재패키징은 Sprint 262 이관, parser 검증 우선)
- 우선순위 = **Multi-domain parser 먼저** (code-only, ~5-6h, R2 production 작업 회피)

## 사전 조사 결과

| spec-container | BL 수 | BL ID 형식 | DIVERGENCE markers | source 코드 |
|----------------|-----:|-----------|-------:|-------------|
| lpon-refund | 11 | `BL-020`~`BL-030` | 5 (Sprint 260 처리) | refund.ts ✅ |
| lpon-charge | 8 | `BL-001`~`BL-008` | 0 | charging.ts (이름 차이) |
| lpon-payment | 7 | `BL-013`~`BL-019` | 0 | payment.ts ✅ |
| lpon-gift | 6 | **`BL-G001`~`BL-G006`** ⚠️ | 0 | (없음) |
| lpon-settlement | 6 | `BL-031`~`BL-036` | 0 | (없음) |
| lpon-budget | 0 (BL 테이블 부재) | — | 0 | (없음) |
| lpon-purchase | 0 (BL 테이블 부재) | — | 0 | (없음) |

**핵심 발견 2종**:

1. **Parser 한계**: 현 regex `/^BL-\d{3}$/`은 lpon-gift `BL-G001` 형식 미매칭. parser 보강 필요.
2. **Detector 적용성**: BL_DETECTOR_REGISTRY 5종(BL-024/026/027/028/029)은 refund 도메인 specific. 다른 도메인 BL은 ID 충돌 없음(charge 001-008은 다른 의미). spec-only 도메인 vs source 존재 도메인 구분 필요.

## Objective

본 Sprint의 DoD:

- (a) `parseRulesMarkdown()` regex 보강 — `/^BL-[A-Z]?\d{1,3}$/` (gift `BL-G001` 매칭 + future `BL-PA001` 등 prefix 패턴 허용)
- (b) `parseRulesMarkdown()` 6th column 처리 — settlement처럼 `policyId` 컬럼이 추가된 행도 정상 파싱 (현재 `cells.length < 5` 체크라 통과하나, 6번째 cell 정보 보존 옵션)
- (c) 7 spec-containers parser 일괄 검증 — 5 active domains BL count 매칭 (38 = 11+8+7+6+6, gift G prefix 포함)
- (d) Domain → source 코드 매핑 정리 — refund.ts/charging.ts/payment.ts 3종 매핑 + gift/settlement spec-only 명시
- (e) 적용 가능 detector 매트릭스 — 각 도메인 BL × 5 detector pattern × source 존재 여부 매핑 → "적용 가능 / 적용 불가" 분류
- (f) `scripts/divergence/detect-bl.ts` `--container <name>` 또는 `--all-domains` flag 추가
- (g) 5 active domains 일괄 실행 → 도메인별 PRESENCE/ABSENCE 결과 리포트
- (h) 단위 테스트 ≥4건 — parser regex 보강 (G prefix + numeric prefix + invalid prefix + 6 column row)
- (i) `reports/sprint-261-multi-domain-2026-05-05.{json,md}` 실파일
- (j) Match Rate ≥ 90% + typecheck/lint/test PASS

## Scope

### In Scope (Sprint 261)
- parser regex 보강 (gift `BL-G001` 매칭)
- 7 spec-containers parser 동작 검증
- BL_DETECTOR_REGISTRY 매핑 가능 매트릭스 (refund 외 도메인은 적용 불가 명시)
- 5 active domains source 매핑 + CLI 일괄 실행
- 후속 detector 추가 후보 분석 (예: BL-005 한도 체크 → reusable threshold detector)

### Out of Scope (별도 Sprint)
- LPON 35 R2 재패키징 (Sprint 262 — production 작업)
- Refund 외 4 도메인 신규 detector 작성 (Sprint 263+ — 도메인별 검토)
- F356-A 재평가 (Sprint 263+)
- gift/settlement source code 작성 (out of project scope)

## 4 Steps

### Step 1 — Plan/Design + SPEC §6 등록 (0.5h)
- 본 Plan + Design 작성
- SPEC §6 Sprint 261 + F428 OPEN 등록
- 사전 조사 결과 문서화

### Step 2 — parser regex 보강 + 도메인 매핑 (1.5h)
- `packages/types/src/divergence.ts` BLRule.id regex 변경 (`/^BL-[A-Z]?\d{1,3}$/`)
- `packages/utils/src/divergence/rules-parser.ts` BL_ID_PATTERN 동기화
- `scripts/divergence/domain-source-map.ts` 신규 — 도메인별 (rules.md path, source.ts path | null) 매핑 테이블
- 단위 테스트 추가 — gift G prefix 매칭 + 6 column row 처리

### Step 3 — CLI 확장 + 일괄 실행 (1.5h)
- `scripts/divergence/detect-bl.ts` `--all-domains` flag 추가
- 5 active domains 순회 실행 (gift/settlement은 source 없음 → spec-only 분류)
- reports JSON 구조: `[{ domain, rulesParsed, sourceFile|null, applicableDetectors[], markersFound[] }]`
- reports MD: 도메인별 표 + 적용 가능 매트릭스 + 후속 detector 후보

### Step 4 — Analysis + Report + 커밋 (1h)
- AIF-ANLS-059 (도메인별 detector 적용성 + Sprint 263+ 신규 detector 후보)
- AIF-RPRT-059 (Sprint 261 종결)
- SPEC §5 Last Updated + Sprint 261 ✅ DONE + F428 [x]
- CHANGELOG 세션 273
- Conventional commit + push

## DoD 매트릭스 (10개)

- [ ] Plan/Design (AIF-PLAN/DSGN-059)
- [ ] SPEC §6 Sprint 261 + F428 등록
- [ ] BLRule.id regex 보강 (`BL-G001` 매칭)
- [ ] parser 단위 테스트 ≥4건 (gift prefix + 6 column + invalid + boundary)
- [ ] 7 spec-containers 일괄 검증 — 5 active domains BL count 매칭 (38 BLs)
- [ ] domain-source-map 정리 (refund/charge/payment 3종 매핑 + gift/settlement spec-only)
- [ ] CLI `--all-domains` flag
- [ ] reports JSON + MD 실파일
- [ ] Match ≥ 90% + typecheck/lint/test PASS
- [ ] Sprint 263+ 후속 detector 후보 ≥3건 문서화

## Risk

- **R1 (Parser regex 너무 느슨)**: `/^BL-[A-Z]?\d{1,3}$/`이 `BL-A` 같은 형식도 통과 → 1자리 숫자 + prefix 검증 강화. 단, 현 도메인 5종은 모두 정수 number 또는 G+number 패턴이라 안전.
- **R2 (Source 코드 부재 도메인 처리)**: gift/settlement은 source 없음 → detector 적용 불가 명시 + spec-only 분류. 사용자에게 source 작성 여부 결정 의뢰 (out of scope).
- **R3 (charge.ts 이름 차이)**: `charging.ts`로 존재 → 매핑 시 명시적 alias 처리. domain-source-map에 명시.
- **R4 (BL ID 충돌 우려)**: refund BL-024와 다른 도메인 BL-024가 추후 등장 시 BL_DETECTOR_REGISTRY 매핑 모호 → 본 Sprint scope 외, refund 단독 매핑 유지.

## Related

- AIF-PLAN-058 (Sprint 260 F427 — refund 단일 도메인 detector + parser, 본 Sprint의 직접 기반)
- F354 (Sprint 218 — 5건 manual markers, refund 외 도메인 marker 발행은 Sprint 263+)
- F428 (Sprint 262, 별도) — Phase 3b 분할 2/2: LPON 35 R2 재패키징 + production 검증
- F429 (차기, 보류) — provenance.yaml auto-write
