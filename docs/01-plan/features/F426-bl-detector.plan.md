---
id: AIF-PLAN-057
title: "F426 — BL-028 단독 자동 검출 PoC + BL-027 heuristic + provenance status auto-update"
sprint: 259
f_items: [F426]
req: AIF-REQ-035
related_features: [F354, F425, F359]
related_td: [TD-24]
status: PLANNED
created: "2026-05-05"
author: "Master (session 271, Sprint 259)"
related: [AIF-PLAN-056]
---

# F426 — BL-028 단독 자동 검출 PoC + BL-027 heuristic + provenance status auto-update

## Background

Sprint 258 (Phase 3a, AIF-PLAN-056 / AIF-ANLS-056)에서 F354 5건 BL-level marker 자동화 분류 분석 완료. **BL-028 95% 신뢰도 (즉시 가능) + BL-027 70% 신뢰도 (heuristic)** 즉시 PoC 가능 판정.

Sprint 259 사전 조사 (세션 271)에서 **중요 발견**: `refund.ts`가 Sprint 251 F359 (round-trip 91.7→100% 회복)으로 이미 4/5 marker 코드 RESOLVED 상태:
- BL-024 (7-day check): line 98-102 `daysSincePurchase > 7` ✅
- BL-027 (계좌 오류 수기 처리): line 167 `MANUAL_REQUIRED` ✅
- BL-028 (exclusionAmount 공식): line 116 `Math.round(cashback_amount * 1.1)` ✅ — hardcoded 0 사라짐
- BL-029 (만료 거부): line 93 `expires_at` 체크 ✅
- BL-026 (cashback ALT 분기): 여전히 미구현 ❌

따라서 본 Sprint detector의 실제 가치는 **3축**:
1. **AST 패턴 검출 정확도 입증** — 합성 fixture(과거 refund-pre-f359.ts 형태)로 positive case 검증
2. **현재 RESOLVED 상태 자동 입증** — 현 refund.ts에서 0 BL-028 + BL-027 검출 (negative case = RESOLVED)
3. **provenance.yaml status auto-update** — stale OPEN markers를 코드 검사 결과 기반 RESOLVED로 자동 갱신

## Objective

본 Sprint의 DoD:
- (a) `packages/utils/src/divergence/bl-detector.ts` 신설 — `detectHardCodedExclusion()` (BL-028 pattern) + `detectUnderImplementation()` (BL-027 heuristic)
- (b) `packages/types/src/divergence.ts` 확장 — `BLDivergenceMarker` 타입 신설 (id, severity, line, pattern, autoDetected:boolean)
- (c) TypeScript Compiler API 활용 (`typescript` 5.7.3 이미 설치) — Java가 아닌 TS source(refund.ts)이므로 ts-morph/tsc API 사용
- (d) `scripts/divergence/detect-bl.ts` CLI 신설 — refund.ts 입력 → bl-detector 호출 → provenance.yaml cross-check + status 갱신 옵션
- (e) 단위 테스트 ≥6건 (BL-028 positive 2 / negative 2, BL-027 positive 1 / negative 1) — `packages/utils/test/bl-detector.test.ts`
- (f) 합성 fixture 1건 — `scripts/divergence/fixtures/refund-pre-f359.ts` (BL-028 hardcoded 0 + BL-027 빈 함수 패턴)
- (g) **현 refund.ts 실측**: BL-028 0 detections + BL-027 0 detections (RESOLVED 자동 입증)
- (h) **합성 fixture 실측**: BL-028 1 detection + BL-027 1 detection (positive case PASS)
- (i) provenance.yaml 5 markers status 자동 분석 — 4 RESOLVED candidates + 1 OPEN (BL-026)
- (j) `reports/sprint-259-bl-detection-2026-05-05.json` + `.md` 실파일
- (k) Match Rate ≥ 90% + typecheck/lint/test 전체 PASS

## Scope

### In Scope (Sprint 259)
- BL-028 정확 매칭 detector (TS AST literal matching)
- BL-027 heuristic detector (line count + branch depth)
- TypeScript Compiler API 활용
- 합성 fixture + 현 refund.ts 양쪽 검증
- provenance.yaml cross-check (read-only, status 추천만 — 실 yaml 갱신은 user 결정 후 별도 작업)
- 단위 테스트 + CLI

### Out of Scope (별도 F-item)
- BL-024/026/029 자동 검출 (rules.md NL parser 선결, F427 가칭)
- Java source AST detector (현 refund.ts는 TS, Java domain은 svc-ingestion Tree-sitter 별도)
- provenance.yaml 자동 write (현 RESOLVED 표기는 user 검토 후 수동 — 안전)
- Multi-domain 확장 (lpon-payment / lpon-charge 등)

## Algorithm Design

### BL-028: hardcoded exclusion = 0 (AST literal matching)

```
입력: TS AST (refund.ts)
패턴:
  1. VariableDeclaration / BinaryExpression with assignment
  2. left.text matches /exclusion|excl_amount|exemptAmount/i
  3. right.kind === SyntaxKind.NumericLiteral
  4. right.text === "0"

  positive 매칭 예 (legacy):
    const exclusionAmount = 0;
    let excl_amount = 0;

  negative 매칭 예 (current):
    const exclusionAmount = Math.round(voucher.cashback_amount * 1.1);
    const excl_amount = computeExclusion(voucher);
```

신뢰도: 95% (false positive 가능 — BL-028과 무관한 `excl_amount = 0` 변수 다른 의미)

### BL-027: under-implemented function (heuristic)

```
입력: TS AST + 함수명 (e.g., "approveRefund")
heuristic 임계치:
  - bodyLineCount < 10 → under-implemented 후보
  - branchDepth < 2 (no if/switch/try-catch) → under-implemented 후보
  - 두 조건 동시 충족 시 detection

  positive 매칭 예 (legacy stub):
    function approveRefund() {
      return { status: "approved" };
    }

  negative 매칭 예 (current):
    async function approveRefund(...) {
      ... 50+ lines, 3+ branches, try-catch ...
    }
```

신뢰도: 70% (heuristic — 임계치 도메인별 calibration 필요)

## 4 Steps

### Step 1 — 사전 조사 + Plan/Design (0.5h, 진행 중)

- ✅ refund.ts 위치 + 4/5 marker RESOLVED 발견
- ✅ TypeScript API 가용성 확인
- 본 Plan + Design 작성

### Step 2 — bl-detector 코드 + 단위 테스트 (3h)

- `packages/types/src/divergence.ts` BLDivergenceMarker 타입 + Zod 스키마
- `packages/utils/src/divergence/bl-detector.ts` 2 detector
- `packages/utils/test/bl-detector.test.ts` ≥6 테스트
- 합성 fixture `scripts/divergence/fixtures/refund-pre-f359.ts`

### Step 3 — CLI + 실측 (1.5h)

- `scripts/divergence/detect-bl.ts` CLI
  - `--source <path>` TS source
  - `--provenance <path>` provenance.yaml
  - `--out <path>` JSON 산출
- 실측 1: 현 `반제품-스펙/.../refund.ts` → 0+0 = 0 markers (RESOLVED 입증)
- 실측 2: 합성 fixture refund-pre-f359.ts → BL-028 1 + BL-027 1 = 2 markers (positive case)
- provenance.yaml 5 markers 상태 분석:
  - BL-024/027/028/029: 코드 RESOLVED → 자동 권고 "RESOLVED candidate"
  - BL-026: 미구현 → "OPEN 유지"

### Step 4 — Analysis + Report + SPEC + Commit (1h)

- AIF-ANLS-057 (검출 결과 분석 + 자동화 효과 정량)
- AIF-RPRT-057 (Sprint 259 종결)
- SPEC §5 Last Updated + Sprint 259 ✅ DONE + F426 [x]
- CHANGELOG 세션 271
- Conventional commit + push

## DoD 매트릭스

- [ ] Plan/Design (AIF-PLAN/DSGN-057)
- [ ] SPEC §6 Sprint 259 + F426 등록
- [ ] BLDivergenceMarker 타입 신설
- [ ] bl-detector.ts 2 detector 구현
- [ ] 단위 테스트 ≥6건 PASS
- [ ] 합성 fixture refund-pre-f359.ts
- [ ] CLI scripts/divergence/detect-bl.ts
- [ ] 현 refund.ts 0 markers (RESOLVED auto 입증)
- [ ] 합성 fixture 2 markers (positive case PASS)
- [ ] provenance.yaml 5 markers 상태 분석 (4 RESOLVED candidate + 1 OPEN)
- [ ] reports JSON + MD 실파일
- [ ] Match ≥ 90% + typecheck/lint/test PASS

## Risk

- **R1**: TS Compiler API learning curve — typescript 5.7.3 표준 API, 1h 내 적응 가능
- **R2**: 합성 fixture가 현실 패턴과 동떨어짐 — F354 작성 시점(Sprint 218) 코드 git history에서 추출 가능 시 대체 (선택)
- **R3**: BL-027 heuristic 임계치(< 10 line, < 2 branch)가 너무 낮아 모든 짧은 함수가 false positive — 첫 PoC는 임계치 보수적, calibration은 후속 작업
- **R4**: provenance.yaml 자동 갱신 시 user 검토 없이 RESOLVED 마킹 위험 — 본 Sprint는 read-only 권고만, write는 별도 결정

## Related

- AIF-PLAN-056 (Sprint 258 Phase 3a — F354 자동화 분류 입력)
- AIF-ANLS-056 (Sprint 258 BL-028 95% / BL-027 70% 분류 결과)
- F354 (Sprint 218 — 5건 manual markers, 본 detector의 대상)
- F359 (Sprint 251 — refund.ts 4/5 marker 코드 RESOLVED, detector negative case 입증 대상)
