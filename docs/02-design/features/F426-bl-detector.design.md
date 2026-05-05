---
id: AIF-DSGN-057
title: "F426 Design — bl-detector AST 패턴 + provenance cross-check"
sprint: 259
f_items: [F426]
req: AIF-REQ-035
plan: AIF-PLAN-057
status: Active
created: "2026-05-05"
author: "Master (session 271)"
---

# F426 Design — BL-028/BL-027 detector + provenance cross-check

## §1 모듈 구조

```
packages/
├── types/src/
│   └── divergence.ts (신규) — BLDivergenceMarker, AutoDetectionResult
├── utils/src/
│   └── divergence/
│       ├── bl-detector.ts (신규) — detectHardCodedExclusion + detectUnderImplementation
│       ├── ts-ast-helper.ts (신규) — TS Compiler API helper
│       └── provenance-cross-check.ts (신규) — yaml load + status 권고
└── utils/test/
    └── bl-detector.test.ts (신규) — ≥6 unit tests

scripts/divergence/
├── detect-bl.ts (신규) — CLI 진입점
└── fixtures/
    └── refund-pre-f359.ts (신규) — F354 시점 코드 시뮬레이션 (BL-028 hardcoded 0 + BL-027 stub)
```

## §2 타입 설계 (`packages/types/src/divergence.ts`)

```typescript
import { z } from "zod";

export const BLDivergenceMarkerSchema = z.object({
  ruleId: z.string(),                  // "BL-028"
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  pattern: z.enum([
    "hardcoded_exclusion",             // BL-028
    "under_implementation",            // BL-027
  ]),
  sourceFile: z.string(),
  sourceLine: z.number().int().positive(),
  detail: z.string(),
  matchedText: z.string().optional(),
  confidence: z.number().min(0).max(1), // 0.95 (BL-028) or 0.70 (BL-027)
  autoDetected: z.literal(true),       // 자동 검출 마커 표시
});
export type BLDivergenceMarker = z.infer<typeof BLDivergenceMarkerSchema>;

export const AutoDetectionResultSchema = z.object({
  source: z.string(),
  detector: z.string(),                // "bl-028" | "bl-027"
  markers: z.array(BLDivergenceMarkerSchema),
  metadata: z.object({
    detectorVersion: z.string(),
    measuredAt: z.string(),
  }),
});
export type AutoDetectionResult = z.infer<typeof AutoDetectionResultSchema>;
```

## §3 Detector 알고리즘

### 3.1 BL-028 — `detectHardCodedExclusion()`

```typescript
import * as ts from "typescript";

export function detectHardCodedExclusion(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  const markers: BLDivergenceMarker[] = [];

  // Pattern: VariableDeclaration | BinaryExpression(assignment)
  //          where left.text ~ /exclusion|excl_amount|exemptAmount/i
  //          and right is NumericLiteral "0"
  const namePattern = /exclusion|excl_amount|exemptAmount/i;

  function visit(node: ts.Node) {
    // case A: const/let/var X = 0
    if (ts.isVariableDeclaration(node)) {
      const name = node.name.getText(sourceFile);
      const init = node.initializer;
      if (
        namePattern.test(name) &&
        init &&
        ts.isNumericLiteral(init) &&
        init.text === "0"
      ) {
        const lineCol = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        markers.push(buildMarker(name, init.getText(), lineCol.line + 1, fileName));
      }
    }

    // case B: X = 0 (assignment expression)
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const left = node.left.getText(sourceFile);
      const right = node.right;
      if (
        namePattern.test(left) &&
        ts.isNumericLiteral(right) &&
        right.text === "0"
      ) {
        const lineCol = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        markers.push(buildMarker(left, "0", lineCol.line + 1, fileName));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return markers;
}

function buildMarker(name, value, line, fileName): BLDivergenceMarker {
  return {
    ruleId: "BL-028",
    severity: "MEDIUM",
    pattern: "hardcoded_exclusion",
    sourceFile: fileName,
    sourceLine: line,
    detail: `${name} hardcoded to ${value} — spec defines exclusion calculation formula`,
    matchedText: `${name} = ${value}`,
    confidence: 0.95,
    autoDetected: true,
  };
}
```

### 3.2 BL-027 — `detectUnderImplementation()`

```typescript
export function detectUnderImplementation(
  sourceFile: ts.SourceFile,
  fileName: string,
  options: {
    targetFunctionNames?: string[];   // e.g., ["approveRefund"]
    minBodyLines?: number;             // default 10
    minBranchDepth?: number;           // default 2
  } = {},
): BLDivergenceMarker[] {
  const markers: BLDivergenceMarker[] = [];
  const minLines = options.minBodyLines ?? 10;
  const minDepth = options.minBranchDepth ?? 2;
  const targetNames = options.targetFunctionNames;

  function countBranchDepth(body: ts.Node): number {
    let maxDepth = 0;
    function visit(node: ts.Node, depth: number) {
      if (
        ts.isIfStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isTryStatement(node)
      ) {
        depth += 1;
      }
      maxDepth = Math.max(maxDepth, depth);
      ts.forEachChild(node, (c) => visit(c, depth));
    }
    visit(body, 0);
    return maxDepth;
  }

  function visit(node: ts.Node) {
    // 함수 선언 / 함수 표현 / 메서드
    let funcName = "";
    let body: ts.Block | undefined;

    if (ts.isFunctionDeclaration(node) && node.body) {
      funcName = node.name?.getText(sourceFile) ?? "";
      body = node.body;
    } else if (
      (ts.isVariableDeclaration(node) &&
        node.initializer &&
        (ts.isFunctionExpression(node.initializer) ||
          ts.isArrowFunction(node.initializer)))
    ) {
      funcName = node.name.getText(sourceFile);
      const init = node.initializer;
      if ("body" in init && ts.isBlock(init.body)) body = init.body;
    } else if (ts.isMethodDeclaration(node) && node.body) {
      funcName = node.name.getText(sourceFile);
      body = node.body;
    }

    if (funcName && body) {
      // target filter
      if (targetNames && !targetNames.includes(funcName)) {
        ts.forEachChild(node, visit);
        return;
      }

      const start = sourceFile.getLineAndCharacterOfPosition(body.getStart());
      const end = sourceFile.getLineAndCharacterOfPosition(body.getEnd());
      const bodyLines = end.line - start.line;
      const branchDepth = countBranchDepth(body);

      if (bodyLines < minLines && branchDepth < minDepth) {
        markers.push({
          ruleId: "BL-027",
          severity: "LOW",
          pattern: "under_implementation",
          sourceFile: fileName,
          sourceLine: start.line + 1,
          detail: `Function ${funcName}: bodyLines=${bodyLines} (<${minLines}) + branchDepth=${branchDepth} (<${minDepth}). Likely under-implemented.`,
          matchedText: funcName,
          confidence: 0.70,
          autoDetected: true,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return markers;
}
```

## §4 CLI 설계 (`scripts/divergence/detect-bl.ts`)

```
Usage: tsx scripts/divergence/detect-bl.ts \
  --source <path-to-ts> \
  [--provenance <path-to-yaml>] \
  [--out <output-json>] \
  [--target-functions <name1,name2>] \
  [--verbose]

Output (JSON):
{
  "source": "<path>",
  "measuredAt": "<ISO>",
  "bl028": { detector_result },
  "bl027": { detector_result },
  "provenanceCrossCheck": {
    "manualMarkers": [...],
    "autoMarkers": [...],
    "recommendations": [
      { ruleId: "BL-024", manualStatus: "OPEN", autoStatus: "RESOLVED candidate", reason: "..." },
      ...
    ]
  }
}

Stdout summary:
  BL-028: N detections (status: OPEN/RESOLVED)
  BL-027: N detections
  Provenance recommendations: M markers
```

## §5 합성 fixture (`scripts/divergence/fixtures/refund-pre-f359.ts`)

F354 시점 코드 시뮬레이션 (BL-028 hardcoded 0 + BL-027 stub):

```typescript
// scripts/divergence/fixtures/refund-pre-f359.ts
// Synthetic — represents refund.ts pre-Sprint 251 F359 fix.
// BL-028: exclusionAmount hardcoded to 0
// BL-027: approveRefund stub (under-implemented)

export function processRefundRequest(payment: Payment, amount: number) {
  // BL-028: 제외금액 산정 (현 PoC에서는 0)
  const exclusionAmount = 0;
  const depositAmount = amount - exclusionAmount;
  return { depositAmount, exclusionAmount };
}

export async function approveRefund(refundId: string) {
  // BL-027: 부분 구현 — 자세한 로직 미구현
  return { status: "approved" };
}
```

기대 detection:
- BL-028: 1 (line `const exclusionAmount = 0;`)
- BL-027: 1 (`approveRefund` body=2 lines, branchDepth=0)

## §6 테스트 계획

`packages/utils/test/bl-detector.test.ts` ≥6 cases:

| # | Test | Detector | Expected |
|---|------|----------|----------|
| 1 | hardcoded `const exclusionAmount = 0` | BL-028 | 1 marker |
| 2 | hardcoded `let excl_amount = 0` | BL-028 | 1 marker |
| 3 | computed `const exclusionAmount = Math.round(...)` | BL-028 | 0 markers |
| 4 | unrelated `const value = 0` | BL-028 | 0 markers |
| 5 | stub function (3 line body, 0 branch) | BL-027 | 1 marker |
| 6 | implemented function (50 line body, 5 branch) | BL-027 | 0 markers |

## §7 provenance.yaml cross-check 설계

```typescript
// packages/utils/src/divergence/provenance-cross-check.ts
import yaml from "js-yaml";

interface ProvenanceMarker {
  marker: "DIVERGENCE";
  ruleId: string;
  status: "OPEN" | "RESOLVED";
  // ... other fields
}

export function crossCheck(
  provenanceYaml: string,
  autoMarkers: BLDivergenceMarker[],
): Array<{
  ruleId: string;
  manualStatus: "OPEN" | "RESOLVED";
  autoStatus: "OPEN candidate" | "RESOLVED candidate";
  recommendation: string;
}> {
  const parsed = yaml.load(provenanceYaml) as { divergenceMarkers?: ProvenanceMarker[] };
  const manual = parsed.divergenceMarkers ?? [];

  return manual.map((m) => {
    const auto = autoMarkers.filter((a) => a.ruleId === m.ruleId);
    if (auto.length === 0) {
      return {
        ruleId: m.ruleId,
        manualStatus: m.status,
        autoStatus: "RESOLVED candidate" as const,
        recommendation: m.status === "OPEN"
          ? `Manual=OPEN but auto=0 detections. Code may have RESOLVED this. Review and update status.`
          : "Status consistent — RESOLVED in both.",
      };
    } else {
      return {
        ruleId: m.ruleId,
        manualStatus: m.status,
        autoStatus: "OPEN candidate" as const,
        recommendation: m.status === "OPEN"
          ? "Status consistent — OPEN in both."
          : `Manual=RESOLVED but auto=${auto.length} detections. Code regression?`,
      };
    }
  });
}
```

**중요**: 본 Sprint는 read-only 권고만 — yaml 자동 write 안 함. user 검토 후 별도 작업.

## §8 Risk 대응

| ID | 리스크 | 대응 |
|----|--------|------|
| R1 | TS Compiler API 복잡도 | 표준 API, ts-morph 미사용 — direct API 충분 |
| R2 | 합성 fixture 비현실 | F354 발행 시점(Sprint 218) provenance.yaml `actual` 필드 인용 — 정확성 확보 |
| R3 | BL-027 임계치 false positive | 첫 PoC 보수적 (< 10 line + < 2 branch 동시), calibration 후속 |
| R4 | js-yaml 미설치 | `js-yaml` npm 패키지 추가 (workspace deps) — 설치 확인 후 진행 |

## §9 검증 절차

```bash
# Step A: 단위 테스트
cd packages/utils && pnpm test

# Step B: CLI 합성 fixture
npx tsx scripts/divergence/detect-bl.ts \
  --source scripts/divergence/fixtures/refund-pre-f359.ts \
  --out /tmp/sprint-259-fixture-detection.json
# Expected: BL-028 1 + BL-027 1 = 2 markers

# Step C: CLI 현 refund.ts
npx tsx scripts/divergence/detect-bl.ts \
  --source 반제품-스펙/pilot-lpon-cancel/working-version/src/domain/refund.ts \
  --provenance .decode-x/spec-containers/lpon-refund/provenance.yaml \
  --target-functions approveRefund \
  --out /tmp/sprint-259-real-detection.json
# Expected: BL-028 0 + BL-027 0 = 0 markers + 4 RESOLVED candidates + 1 OPEN
```
