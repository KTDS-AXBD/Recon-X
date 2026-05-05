---
id: AIF-PLAN-060
title: "F429 — 보편 detector 3종 (Threshold/Status transition/Atomic transaction)"
sprint: 262
f_items: [F429]
req: AIF-REQ-035
related_features: [F354, F427, F428]
status: PLANNED
created: "2026-05-05"
author: "Master (session 274, Sprint 262)"
related: [AIF-PLAN-059]
---

# F429 — 보편 detector 3종 (Threshold/Status transition/Atomic transaction)

## Background

Sprint 261 (F428)에서 multi-domain parser 검증 + detector 적용 매트릭스 도출. **현 coverage 5/38 = 13.2%** (refund 단독). Sprint 261 분석에서 보편 detector 3종 도입 시 47.4% 도달 가능성 제안.

**사전 조사 결과 정정**: Sprint 261에서 47.4%로 추정한 13 BL 중 **6 BL은 source 부재(gift/settlement spec-only)** → detector 자동 검증 불가. 실효 적용 = **7 BL**, 정확한 coverage = 5+7 = **12/38 = 31.6%**.

| Detector | 적용 BL (source 존재) | spec-only (skip) | 실효 |
|----------|---------------------|-----------------|-----:|
| Threshold check | charge BL-005~008, payment BL-015 | settlement BL-036 | 5 |
| Status transition | payment BL-014 | gift BL-G002~G005 | 1 |
| Atomic transaction | refund BL-022 | gift BL-G006 | 1 |
| **합계** | — | — | **7** |

**사용자 결정** (세션 274): 보편 detector 3종 모두 도입 + Master inline.

## Objective

본 Sprint의 DoD:

- (a) `packages/types/src/divergence.ts` `BLDivergenceMarkerSchema.pattern` enum 3종 추가 — `missing_threshold_check` / `missing_status_transition` / `missing_atomic_transaction`
- (b) `packages/utils/src/divergence/bl-detector.ts` 3 detector 신설:
  - `detectThresholdCheck()` — 변수 vs literal/상수 임계값 비교 + 함수 throw/error 패턴 (BL-005~008/BL-015 적용)
  - `detectStatusTransition()` — `status === 'X'` 체크 + `status: 'Y'` 할당 패턴 (BL-014 적용)
  - `detectAtomicTransaction()` — `db.transaction(() => ...)` 또는 BEGIN/COMMIT 블록 (BL-022 적용)
- (c) `BL_DETECTOR_REGISTRY` 5종 → **12종** 확장 (BL-005/006/007/008/014/015/022 매핑 추가)
- (d) `DETECTOR_SUPPORTED_RULES` Set 5종 → 12종 확장
- (e) DOMAIN_MAP 갱신 — charge/payment의 `underImplTargets` 추가 (필요 시) — 본 detector는 함수 단위 분석이 아니므로 underImplTargets 무관
- (f) 단위 테스트 ≥9건 (3 detector × {positive, negative, edge})
- (g) 합성 fixture 확장 — `scripts/divergence/fixtures/refund-pre-f359.ts`에 missing threshold/status/transaction 패턴 추가 (refund 도메인은 BL-022 atomic transaction이 정상 = PRESENCE 검증이 필요한 케이스)
- (h) `--all-domains` 실측 — coverage 5/38 → 12/38 = 31.6% 정량 확인
- (i) `reports/sprint-262-universal-detectors-2026-05-05.{json,md}` 실파일
- (j) Match Rate ≥ 90% + typecheck/lint/test 120/120 PASS

## Scope

### In Scope (Sprint 262)
- 3 보편 detector 구현 (Threshold/Status transition/Atomic transaction)
- BL_DETECTOR_REGISTRY 12종 매핑
- charge/payment 도메인 PRESENCE 자동 입증 (RESOLVED 권고)
- 합성 fixture 확장 (3 detector positive case)
- 단위 테스트 + multi-domain 실측

### Out of Scope (별도 Sprint)
- gift/settlement source code 작성 PoC (별도 결정 필요)
- LPON 35 R2 재패키징 (Sprint 263+)
- 도메인 specific detector (Timeout retry/External API/Batch trigger 등)
- F429 provenance.yaml auto-write (Sprint 263+)
- BL-031~035 settlement (spec-only, source 부재)

## Algorithm Design

### 1. Threshold Check (BL-005~008/BL-015)

PRESENCE 패턴: 변수가 임계값과 비교되는 BinaryExpression + 비교 결과에 따른 분기 (throw/return error).

```typescript
const THRESHOLD_OPERATORS = [
  ts.SyntaxKind.GreaterThanToken,        // >
  ts.SyntaxKind.GreaterThanEqualsToken,  // >=
  ts.SyntaxKind.LessThanToken,           // <
  ts.SyntaxKind.LessThanEqualsToken,     // <=
];

// PRESENCE 검출 조건:
//   1. BinaryExpression with threshold operator
//   2. left side: 변수/필드 reference (NOT literal)
//   3. right side: NumericLiteral 또는 식별자(상수 명명 e.g. DAILY_LIMIT, MAX_AMOUNT)
//   4. 함수 내에 throw 또는 return error 동시 존재 (의미 분석)
```

긍정 매칭 예 (charging.ts BL-005):
```typescript
if (dailyRow.total + amount > DAILY_LIMIT) {
  throw new ChargeError('E422-LMT', ...);
}
```

긍정 매칭 예 (payment.ts BL-015):
```typescript
if (amount >= 50_000) {
  await notifService.sendPaymentSms(...);
}
```

신뢰도: 70% (변수와 literal/상수 조합이 다양하므로 false positive 가능, 함수 내 throw 동시 매칭으로 보강)

### 2. Status Transition (BL-014)

PRESENCE 패턴: `status === 'X'` 또는 `status !== 'X'` 비교 + 별도 statement에서 `status: 'Y'` 할당/INSERT.

```typescript
// PRESENCE 검출 조건:
//   1. BinaryExpression with === or !== operator
//   2. left side identifier text matches /\bstatus\b/i
//   3. right side StringLiteral
//   4. 같은 함수 내 다른 위치에 status: 'Y' 또는 INSERT INTO ... status='Y' 패턴 존재
```

긍정 매칭 예 (payment.ts BL-014):
```typescript
if (voucher.status !== 'ACTIVE') { throw ... }
// 별도 위치:
INSERT INTO payments (..., status, ...) VALUES (..., 'PAID', ...)
```

신뢰도: 75% — `status` 식별자 + 문자열 비교는 명확하나, 도메인별 status 값 다양 (PAID/ACTIVE/COMPLETED 등)

### 3. Atomic Transaction (BL-022)

PRESENCE 패턴: `db.transaction(() => {...})` 형태 호출 또는 `BEGIN/COMMIT` SQL 블록.

```typescript
// PRESENCE 검출 조건:
//   1. CallExpression with property access "transaction"
//   2. argument: ArrowFunction or FunctionExpression
//   3. callee object identifier matches /\bdb\b|\bdatabase\b|\btx\b/i
```

긍정 매칭 예 (refund.ts BL-022):
```typescript
const tx = db.transaction(() => {
  db.prepare('INSERT ...').run(...);
  db.prepare('UPDATE ...').run(...);
});
tx();
```

신뢰도: 85% — `db.transaction()` 호출 패턴은 better-sqlite3 표준이며 false positive 거의 없음

## 4 Steps

### Step 1 — Plan/Design + SPEC §6 (0.5h)
- 본 Plan + Design 작성
- SPEC §6 Sprint 262 + F429 OPEN 등록

### Step 2 — 3 detector 구현 + REGISTRY 확장 (3h)
- types/divergence.ts pattern enum 3종 추가
- bl-detector.ts 3 detector + BL_DETECTOR_REGISTRY 12종
- provenance-cross-check.ts DETECTOR_SUPPORTED_RULES 12종
- 단위 테스트 ≥9건
- 합성 fixture 확장

### Step 3 — Multi-domain 실측 (1h)
- `--all-domains` 실행 → 12 detector × 7 containers
- charge/payment 도메인 RESOLVED 자동 입증
- 결과 검증: coverage 5/38 → 12/38 = 31.6%

### Step 4 — Analysis + Report + commit (1h)
- AIF-ANLS-060 (실효 vs 추정 coverage 차이 분석 + gift/settlement source 작성 PoC 가치)
- AIF-RPRT-060
- SPEC §5 + Sprint 262 ✅ DONE + F429 [x]
- CHANGELOG 세션 274
- commit + push

## DoD 매트릭스 (10개)

- [ ] Plan/Design (AIF-PLAN/DSGN-060)
- [ ] SPEC §6 Sprint 262 + F429 등록
- [ ] BLDivergenceMarkerSchema.pattern 3종 추가
- [ ] bl-detector.ts 3 detector 구현
- [ ] BL_DETECTOR_REGISTRY 12종 + DETECTOR_SUPPORTED_RULES 12종
- [ ] 단위 테스트 ≥9건 PASS
- [ ] 합성 fixture 확장 (3 detector positive case)
- [ ] 현 source 코드 실측: charge 4/4 + payment 2/2 + refund BL-022 1/1 PRESENCE 자동 입증
- [ ] reports JSON + MD 실파일
- [ ] Match ≥ 90% + typecheck/lint/test 120/120 PASS

## Risk

- **R1 (Threshold detector false positive)**: `if (count > 0)` 같은 일반 조건도 매칭 우려 → 함수 내 throw/error 동시 매칭 의무화로 완화. 변수명 화이트리스트(`amount|limit|threshold`) 추가 검토.
- **R2 (Status transition 의미 분석 한계)**: status 식별자 사용은 흔하므로 단순 비교만으로 detector 적용 어려움 → 같은 함수 내 status 비교 + status 할당 동시 매칭으로 의미 명시.
- **R3 (Atomic transaction 도메인 의존)**: `db.transaction()` 패턴은 better-sqlite3 specific. Foundry-X 프로젝트(다른 DB 사용 시)에는 적용 불가 — 본 Sprint scope는 Decode-X LPON PoC 한정 명시.
- **R4 (실효 coverage 31.6% vs 47.4% 차이)**: 사용자 기대치 47.4% 달성을 위해서는 gift/settlement source 작성 PoC 추가 필요. 본 Sprint는 31.6% 목표로 한정 + 47.4% 도달 경로 명시.

## Related

- AIF-PLAN-059 (Sprint 261 F428 — multi-domain parser 검증, 본 Sprint의 직접 기반)
- AIF-PLAN-058 (Sprint 260 F427 — refund 단독 detector + parser)
- F428 (Sprint 261 — multi-domain 인프라)
- F429 (차기, 보류) — provenance.yaml auto-write
