---
id: AIF-DSGN-058
title: "F427 — rules.md NL parser + BL-024/026/029 detector 설계"
sprint: 260
f_items: [F427]
plan_ref: AIF-PLAN-058
status: PLANNED
created: "2026-05-05"
author: "Master (session 272)"
---

# F427 — rules.md NL parser + BL-024/026/029 detector 설계

## 데이터 모델 확장

### `packages/types/src/divergence.ts`

기존 `BLDivergenceMarkerSchema.pattern` enum을 5종으로 확장:

```typescript
pattern: z.enum([
  "hardcoded_exclusion",     // BL-028 (Sprint 259)
  "under_implementation",    // BL-027 (Sprint 259)
  "missing_temporal_check",  // BL-024 (신규)
  "missing_validation_check",// BL-029 (신규)
  "missing_alt_branch",      // BL-026 (신규)
])
```

신규 `BLRuleSchema`:

```typescript
export const BLRuleSchema = z.object({
  id: z.string().regex(/^BL-\d{3}$/),
  condition: z.string(),       // "When" 자연어
  criteria: z.string(),        // "If" 자연어
  outcome: z.string(),         // "Then" 자연어
  exception: z.string(),       // "Else" 자연어 (or "[미정의]")
});
export type BLRule = z.infer<typeof BLRuleSchema>;
```

## API 시그니처

### Markdown Parser

```typescript
// packages/utils/src/divergence/rules-parser.ts
export function parseRulesMarkdown(markdownText: string): BLRule[]
```

**구현 방침**:
- 정규식으로 헤더 라인 식별: `/\|\s*ID\s*\|\s*condition.*?\|\s*criteria.*?\|\s*outcome.*?\|\s*exception\s*\|/`
- 헤더 다음 `|---|---|...|` 구분선 skip
- 본문 라인 split('|') → trim → BLRule
- ID 정규식 검증 실패 라인 skip (다른 행 잡음 차단)

### Detector 시그니처

```typescript
export type DetectorFn = (
  sourceFile: ts.SourceFile,
  fileName: string,
  rule?: BLRule,  // 옵션: 현재는 detector 내부에 도메인 지식 하드코딩, 향후 NL 추출 확장 시 사용
) => BLDivergenceMarker[];

export const BL_DETECTOR_REGISTRY: Record<string, DetectorFn> = {
  "BL-024": detectTemporalCheck,
  "BL-026": detectCashbackBranch,
  "BL-027": detectUnderImplementation,
  "BL-028": detectHardCodedExclusion,
  "BL-029": detectExpiryCheck,
};
```

### BL-024 detector 핵심 로직

```typescript
const TEMPORAL_FIELD_PATTERN = /purchas|created|paid/i;

export function detectTemporalCheck(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  let foundCheck = false;
  let foundLine = 0;

  function visit(node: ts.Node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.GreaterThanToken &&
      ts.isNumericLiteral(node.right) &&
      node.right.text === "7"
    ) {
      // left 식별자가 temporal field 참조하는지 확인
      const leftText = node.left.getText(sourceFile);
      if (TEMPORAL_FIELD_PATTERN.test(leftText) || leftText.includes("daysSince")) {
        foundCheck = true;
        foundLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  // ABSENCE 시 marker 1건 emit
  if (!foundCheck) {
    return [{
      ruleId: "BL-024",
      severity: "HIGH",
      pattern: "missing_temporal_check",
      sourceFile: fileName,
      sourceLine: 1,
      detail: "BL-024: No 7-day window check found for temporal-bound refund. Expected pattern: daysSincePurchase > 7 or equivalent.",
      confidence: 0.75,
      autoDetected: true,
    }];
  }
  return [];  // PRESENCE → 0 markers (RESOLVED)
}
```

### BL-029 detector

```typescript
const EXPIRY_FIELD_PATTERN = /expir|valid_until|valid_to/i;

export function detectExpiryCheck(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  let foundCheck = false;
  let foundLine = 0;

  function visit(node: ts.Node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.LessThanToken
    ) {
      const leftText = node.left.getText(sourceFile);
      const rightText = node.right.getText(sourceFile);
      // expiry-side identifier + now-side comparison
      if (
        EXPIRY_FIELD_PATTERN.test(leftText) &&
        (/new Date\(\)|Date\.now\(\)/.test(rightText) || /\bnow\b|\btoday\b/.test(rightText))
      ) {
        foundCheck = true;
        foundLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (!foundCheck) {
    return [{
      ruleId: "BL-029",
      severity: "MEDIUM",
      pattern: "missing_validation_check",
      sourceFile: fileName,
      sourceLine: 1,
      detail: "BL-029: No expiry check found. Expected pattern: voucher.expires_at < new Date() or equivalent.",
      confidence: 0.80,
      autoDetected: true,
    }];
  }
  return [];
}
```

### BL-026 detector (heuristic)

```typescript
const CASHBACK_FIELD_PATTERN = /cashback|discount|할인보전/i;
const REJECT_OUTCOME_PATTERN = /REJECT|DENY|DENIED|cash.*refund.*denied|불가/i;

export function detectCashbackBranch(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  let foundBranch = false;

  function checkBranchOutcome(consequent: ts.Node): boolean {
    const text = consequent.getText(sourceFile);
    return REJECT_OUTCOME_PATTERN.test(text);
  }

  function visit(node: ts.Node) {
    // case A: IfStatement with cashback-discriminating condition
    if (ts.isIfStatement(node)) {
      const condText = node.expression.getText(sourceFile);
      if (CASHBACK_FIELD_PATTERN.test(condText) && checkBranchOutcome(node.thenStatement)) {
        foundBranch = true;
      }
    }
    // case B: SwitchCase
    if (ts.isCaseClause(node)) {
      const caseText = node.expression.getText(sourceFile);
      if (CASHBACK_FIELD_PATTERN.test(caseText)) {
        const bodyText = node.statements.map(s => s.getText(sourceFile)).join("\n");
        if (REJECT_OUTCOME_PATTERN.test(bodyText)) foundBranch = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (!foundBranch) {
    return [{
      ruleId: "BL-026",
      severity: "MEDIUM",
      pattern: "missing_alt_branch",
      sourceFile: fileName,
      sourceLine: 1,
      detail: "BL-026: No cashback/discount branch with reject/alt outcome found. Expected: if (voucher.cashback_amount > 0) { reject or alt }.",
      confidence: 0.65,
      autoDetected: true,
    }];
  }
  return [];
}
```

## CLI 확장

### `scripts/divergence/detect-bl.ts`

기존 args에 `--rules` 추가:

```bash
tsx scripts/divergence/detect-bl.ts \
  --source 반제품-스펙/pilot-lpon-cancel/working-version/src/domain/refund.ts \
  --rules .decode-x/spec-containers/lpon-refund/rules/refund-rules.md \
  --provenance .decode-x/spec-containers/lpon-refund/provenance.yaml \
  --out reports/sprint-260-rules-parser-2026-05-05.json
```

처리 흐름:

```
1. parseRulesMarkdown(rulesText) → BLRule[]
2. for each rule in BLRule[]:
     if BL_DETECTOR_REGISTRY[rule.id] exists:
       markers.push(...BL_DETECTOR_REGISTRY[rule.id](sourceFile, fileName, rule))
     else:
       skip with note (out of scope)
3. crossCheck(provenanceText, markers) → CrossCheckRecommendation[]
4. JSON + MD 출력 → reports/
```

## 합성 fixture 확장

`scripts/divergence/fixtures/refund-pre-f359.ts` 신규 케이스 추가 (기존 BL-027/028 케이스 유지):

```typescript
// BL-024 누락: temporal check 부재
export function processRefundLegacy(payment: any, refundType: string) {
  // No daysSincePurchase check → DIVERGENCE
  if (refundType === 'UNUSED_FULL') {
    return { status: 'APPROVED' };
  }
}

// BL-029 누락: expiry check 부재
export function checkVoucherLegacy(voucher: any) {
  // No expires_at < now check → DIVERGENCE
  return voucher.balance > 0;
}

// BL-026 누락: cashback ALT branch 부재
export function processRefundCashbackLegacy(voucher: any, amount: number) {
  // cashback_amount는 사용하지만 reject/alt 분기 없음 → DIVERGENCE
  const exclusion = voucher.cashback_amount * 1.1;
  return { deposit: amount - exclusion };
}
```

## 테스트 매트릭스

### `packages/utils/test/rules-parser.test.ts` (신규)

| # | 입력 | 기대 출력 |
|---|------|----------|
| 1 | refund-rules.md (실 파일) | 11 BLRule (BL-020 ~ BL-030) |
| 2 | 헤더 없는 마크다운 | [] |
| 3 | ID 형식 위반(BL-X) | skip + 정상 행만 추출 |
| 4 | 다중 테이블(데이터 영향 등) | 첫 BL 테이블만 추출 |

### `packages/utils/test/bl-detector.test.ts` (확장)

| # | detector | fixture | 기대 |
|---|----------|---------|------|
| 1 | detectTemporalCheck | 현 refund.ts | 0 markers (RESOLVED) |
| 2 | detectTemporalCheck | refund-pre-f359 (no 7day) | 1 marker missing_temporal_check |
| 3 | detectTemporalCheck | edge: `> 7.5` literal | 0 markers (보수적, 정확 매칭만) |
| 4 | detectExpiryCheck | 현 refund.ts | 0 markers |
| 5 | detectExpiryCheck | refund-pre-f359 (no expiry) | 1 marker missing_validation_check |
| 6 | detectExpiryCheck | edge: `expires_at > new Date()` (역방향) | 1 marker (← 참고) |
| 7 | detectCashbackBranch | 현 refund.ts (cashback 사용은 있으나 ALT 분기 없음) | 1 marker (BL-026 OPEN) |
| 8 | detectCashbackBranch | RESOLVED 가설 fixture | 0 markers |
| 9 | detectCashbackBranch | edge: cashback 분기는 있으나 outcome reject 없음 | 1 marker |

## 검증 지점

### 현 refund.ts 실측 기대값

| BL | 검출 결과 | provenance.yaml 권고 |
|----|-----------|---------------------|
| BL-024 | 0 markers (PRESENT line 98-103) | RESOLVED 권고 |
| BL-026 | 1 marker (ABSENT) | OPEN 유지 |
| BL-027 | 0 markers (PRESENT, Sprint 259 일관) | RESOLVED 일관 |
| BL-028 | 0 markers (PRESENT line 116, Sprint 259 일관) | RESOLVED 일관 |
| BL-029 | 0 markers (PRESENT line 93-96) | RESOLVED 권고 |

### 합성 fixture 실측 기대값

| BL | 검출 결과 |
|----|-----------|
| BL-024 | 1 marker (no temporal) |
| BL-026 | 1 marker (no ALT) |
| BL-027 | 1 marker (under-impl, Sprint 259 fixture) |
| BL-028 | 1 marker (hardcoded 0, Sprint 259 fixture) |
| BL-029 | 1 marker (no expiry) |

총 5/5 ABSENCE markers — F354 자동화 5/5 (100%) 완성 입증.

## 보안/품질 고려

- AST 파싱은 in-memory only, fs 의존성 최소화
- typescript Compiler API 5.7.3 (이미 의존성)
- js-yaml 회피 — 정규식 기반 cross-check 유지 (Sprint 259 패턴)
- BLRule.condition 등 자연어 필드는 sanitize 안 함 (read-only 분석 용도)

## 후속 확장 포인트

- F428: Multi-domain rules.md 적용 (lpon-payment / lpon-charge / pension-* 등)
- F429: provenance.yaml auto-write — 본 cross-check 결과를 status 필드에 자동 갱신
- 후속: BL-025/030 자동 검출 추가 (Phase 3 Should)
- 후속: rules.md NL parser → 키워드 추출 자동화 (LLM-조력 hybrid → 신뢰도 70%+ 시 detector 부담 경감)
