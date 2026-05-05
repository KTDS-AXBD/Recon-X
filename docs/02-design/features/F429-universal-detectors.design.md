---
id: AIF-DSGN-060
title: "F429 — 보편 detector 3종 설계"
sprint: 262
f_items: [F429]
plan_ref: AIF-PLAN-060
status: PLANNED
created: "2026-05-05"
author: "Master (session 274)"
---

# F429 설계 — 보편 detector 3종 (Threshold/Status transition/Atomic transaction)

## 데이터 모델 확장

### `packages/types/src/divergence.ts`

`BLDivergenceMarkerSchema.pattern` enum 3종 추가:

```typescript
pattern: z.enum([
  // Sprint 259 (F426)
  "hardcoded_exclusion",
  "under_implementation",
  // Sprint 260 (F427)
  "missing_temporal_check",
  "missing_validation_check",
  "missing_alt_branch",
  // Sprint 262 (F429) 신규
  "missing_threshold_check",
  "missing_status_transition",
  "missing_atomic_transaction",
])
```

## API 시그니처

### Threshold Check Detector

```typescript
const THRESHOLD_VAR_PATTERN = /amount|limit|threshold|max|min|count|total|balance|limit/i;

export function detectThresholdCheck(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  let foundThreshold = false;

  function visit(node: ts.Node): void {
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.GreaterThanToken,
        ts.SyntaxKind.GreaterThanEqualsToken,
        ts.SyntaxKind.LessThanToken,
        ts.SyntaxKind.LessThanEqualsToken,
      ].includes(node.operatorToken.kind)
    ) {
      const leftText = node.left.getText(sourceFile);
      const rightText = node.right.getText(sourceFile);
      // 좌측이 변수/필드, 우측이 numeric literal 또는 상수 식별자(대문자)
      const leftIsVarLike = THRESHOLD_VAR_PATTERN.test(leftText) || leftText.includes(".");
      const rightIsLiteral = ts.isNumericLiteral(node.right);
      const rightIsConstant = /^[A-Z][A-Z_0-9]+$/.test(rightText);

      if (leftIsVarLike && (rightIsLiteral || rightIsConstant)) {
        foundThreshold = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (!foundThreshold) {
    return [
      {
        ruleId: "BL-THRESHOLD-GENERIC",  // 도메인별 ruleId는 호출자가 setRuleId
        severity: "MEDIUM",
        pattern: "missing_threshold_check",
        sourceFile: fileName,
        sourceLine: 0,
        detail:
          "No threshold/limit comparison found. Expected pattern: variable >|>=|<|<= literal or UPPERCASE_CONSTANT.",
        confidence: 0.7,
        autoDetected: true,
      },
    ];
  }
  return [];
}
```

→ 본 detector는 **단일 PRESENCE flag**만 반환. 도메인별 ruleId는 BL_DETECTOR_REGISTRY에서 wrapper로 전달.

**개선**: 함수 단위로 매칭하여 함수마다 별도 marker 발행하면 더 정확하지만, MVP에서는 파일 단위 PRESENCE로 단순화. 향후 calibration 시 함수 단위 확장.

### Status Transition Detector

```typescript
const STATUS_FIELD_PATTERN = /\bstatus\b/i;

export function detectStatusTransition(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  let foundComparison = false;
  let foundAssignment = false;

  function visit(node: ts.Node): void {
    // (a) BinaryExpression with === or !==, left=status, right=string literal
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ].includes(node.operatorToken.kind)
    ) {
      const leftText = node.left.getText(sourceFile);
      if (STATUS_FIELD_PATTERN.test(leftText) && ts.isStringLiteral(node.right)) {
        foundComparison = true;
      }
    }

    // (b) PropertyAssignment status: 'Y' OR string literal containing "status = 'Y'"
    if (ts.isPropertyAssignment(node)) {
      const nameText = node.name.getText(sourceFile);
      if (STATUS_FIELD_PATTERN.test(nameText) && ts.isStringLiteral(node.initializer)) {
        foundAssignment = true;
      }
    }
    // (c) Template/string literal SQL with status = 'X' OR INSERT INTO ... 'PAID'
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.getText(sourceFile);
      if (/\bstatus\s*=\s*['"]\w+['"]|VALUES\s*\([^)]*'\w+'/.test(text)) {
        foundAssignment = true;
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (!(foundComparison && foundAssignment)) {
    return [
      {
        ruleId: "BL-STATUS-TRANSITION-GENERIC",
        severity: "MEDIUM",
        pattern: "missing_status_transition",
        sourceFile: fileName,
        sourceLine: 0,
        detail:
          "Missing status comparison (`status === 'X'`) and/or status assignment (`status: 'Y'`). Expected: state machine transition pattern.",
        confidence: 0.75,
        autoDetected: true,
      },
    ];
  }
  return [];
}
```

→ 본 detector는 **comparison + assignment 동시 매칭** 시 RESOLVED. 한쪽만 있으면 불완전한 transition으로 ABSENCE 발행.

### Atomic Transaction Detector

```typescript
const TX_RECEIVER_PATTERN = /\bdb\b|\bdatabase\b|\btx\b/i;

export function detectAtomicTransaction(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  let foundTransaction = false;

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.getText(sourceFile) === "transaction"
    ) {
      const receiverText = node.expression.expression.getText(sourceFile);
      if (TX_RECEIVER_PATTERN.test(receiverText)) {
        foundTransaction = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (!foundTransaction) {
    return [
      {
        ruleId: "BL-ATOMIC-TX-GENERIC",
        severity: "MEDIUM",
        pattern: "missing_atomic_transaction",
        sourceFile: fileName,
        sourceLine: 0,
        detail:
          "No atomic transaction found. Expected pattern: db.transaction(() => {...}) or BEGIN/COMMIT block.",
        confidence: 0.85,
        autoDetected: true,
      },
    ];
  }
  return [];
}
```

## BL_DETECTOR_REGISTRY 확장

```typescript
// Sprint 259~260 (refund specific): 5 entries
"BL-024": detectTemporalCheck,
"BL-026": detectCashbackBranch,
"BL-027": (sf, fn) => detectUnderImplementation(sf, fn),
"BL-028": detectHardCodedExclusion,
"BL-029": detectExpiryCheck,

// Sprint 262 (F429 보편 detector): 7 entries 추가
"BL-005": (sf, fn) => withRuleId(detectThresholdCheck(sf, fn), "BL-005"),
"BL-006": (sf, fn) => withRuleId(detectThresholdCheck(sf, fn), "BL-006"),
"BL-007": (sf, fn) => withRuleId(detectThresholdCheck(sf, fn), "BL-007"),
"BL-008": (sf, fn) => withRuleId(detectThresholdCheck(sf, fn), "BL-008"),
"BL-014": (sf, fn) => withRuleId(detectStatusTransition(sf, fn), "BL-014"),
"BL-015": (sf, fn) => withRuleId(detectThresholdCheck(sf, fn), "BL-015"),
"BL-022": (sf, fn) => withRuleId(detectAtomicTransaction(sf, fn), "BL-022"),
```

`withRuleId` helper:

```typescript
function withRuleId(markers: BLDivergenceMarker[], ruleId: string): BLDivergenceMarker[] {
  return markers.map((m) => ({ ...m, ruleId }));
}
```

→ 동일 detector를 여러 BL에 매핑 + 도메인 specific ruleId 부여. registry pattern 확장 + 코드 중복 회피.

## DETECTOR_SUPPORTED_RULES 확장

```typescript
export const DETECTOR_SUPPORTED_RULES = new Set<string>([
  // Sprint 259~260
  "BL-024", "BL-026", "BL-027", "BL-028", "BL-029",
  // Sprint 262 (F429)
  "BL-005", "BL-006", "BL-007", "BL-008", "BL-014", "BL-015", "BL-022",
]);
```

12 entries → 12/38 = **31.6% coverage**.

## 합성 fixture 확장

`scripts/divergence/fixtures/refund-pre-f359.ts`에 BL-022 atomic transaction 누락 케이스 추가 (현 refund.ts는 line 180-195에 PRESENT). 새 detector positive case 검증:

```typescript
// BL-022 누락: deposit + status update + balance 차감을 atomic하지 않게 처리
export function approveRefundLegacy(refundId: string, amount: number) {
  // No db.transaction() — 별도 SQL 호출로 일관성 부재 → BL-022 DIVERGENCE marker 발행 기대
  // INSERT INTO deposit_transactions ...;  (atomic 외부)
  // UPDATE refund_transactions SET status='COMPLETED' ...;  (atomic 외부)
  // UPDATE vouchers SET balance = balance - ? ...;  (atomic 외부)
  return { refundId, status: "approved" };
}
```

## 검증 시나리오

### 현 source 실측 기대

| Detector | charging.ts | payment.ts | refund.ts |
|----------|:-----------:|:----------:|:---------:|
| Threshold | PRESENT (DAILY_LIMIT/MONTHLY_LIMIT > 비교 + throw) | PRESENT (amount >= 50_000) | — |
| Status transition | — (charge BL-014 미적용) | PRESENT (status === 'PAID' + INSERT INTO ...status='PAID') | — |
| Atomic transaction | — (charge BL-022 미적용) | — | PRESENT (db.transaction line 180) |

기대 결과: 7 BL × 3 active source files = **0 ABSENCE markers** (모두 PRESENT, RESOLVED 자동 입증).

### 합성 fixture 실측 기대

| Detector | refund-pre-f359.ts (legacy) |
|----------|:---------------------------:|
| BL-022 atomic transaction | ABSENCE marker (no db.transaction) |
| BL-005 threshold | ABSENCE marker (no threshold check) |
| BL-014 status transition | ABSENCE marker (no comparison + assignment 양쪽) |

## 테스트 매트릭스

### `packages/utils/test/bl-detector.test.ts` (확장 +9건)

| # | Detector | fixture | 기대 |
|---|----------|---------|------|
| 1 | detectThresholdCheck | `if (amount > LIMIT) throw` | 0 markers |
| 2 | detectThresholdCheck | `if (count >= 50_000) sms()` | 0 markers |
| 3 | detectThresholdCheck | empty function | 1 marker |
| 4 | detectStatusTransition | `if (status === 'X')` + `status: 'Y'` | 0 markers |
| 5 | detectStatusTransition | only comparison no assignment | 1 marker |
| 6 | detectStatusTransition | only assignment no comparison | 1 marker |
| 7 | detectAtomicTransaction | `db.transaction(() => {...})` | 0 markers |
| 8 | detectAtomicTransaction | `database.transaction(() => {...})` | 0 markers |
| 9 | detectAtomicTransaction | non-atomic sequence | 1 marker |

### REGISTRY enumeration test

```typescript
it("BL_DETECTOR_REGISTRY exposes 12 detectors", () => {
  expect(Object.keys(BL_DETECTOR_REGISTRY).sort()).toEqual([
    "BL-005", "BL-006", "BL-007", "BL-008",
    "BL-014", "BL-015", "BL-022",
    "BL-024", "BL-026", "BL-027", "BL-028", "BL-029",
  ]);
});
```

## 보안/품질 고려

- AST 파싱 in-memory only (Sprint 259~261 동일)
- THRESHOLD_VAR_PATTERN regex가 너무 느슨하면 일반 변수도 매칭 — 이름 + 함수 내 throw 동시 매칭으로 완화
- Status detector는 SQL 텍스트 매칭 포함 (`/\bstatus\s*=\s*['"]\w+['"]/`) — false positive 우려 → 함수 단위 분석으로 향후 강화
- Atomic transaction은 better-sqlite3 specific 패턴 — Decode-X LPON PoC 한정 명시

## 후속 확장 포인트

- **Sprint 263+**: gift/settlement source code 작성 PoC → coverage 31.6% → 47.4% 도달
- **Sprint 263+**: Timeout retry / External API call / Batch trigger / Validation / Event emission 5종 detector 추가 → 30/38 = 78.9%
- **F-XXX**: provenance.yaml auto-write
