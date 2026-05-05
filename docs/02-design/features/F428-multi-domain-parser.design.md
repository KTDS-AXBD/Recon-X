---
id: AIF-DSGN-059
title: "F428 — Multi-domain rules.md parser 검증 설계"
sprint: 261
f_items: [F428]
plan_ref: AIF-PLAN-059
status: PLANNED
created: "2026-05-05"
author: "Master (session 273)"
---

# F428 설계 — Multi-domain parser + Domain-source 매핑

## 데이터 모델 변경

### `packages/types/src/divergence.ts`

`BLRuleSchema.id` regex 보강:

```typescript
export const BLRuleSchema = z.object({
  // 기존: /^BL-\d{3}$/
  // 변경: gift "BL-G001" 매칭 + 1~3 digit 허용
  id: z.string().regex(/^BL-[A-Z]?\d{1,3}$/),
  condition: z.string(),
  criteria: z.string(),
  outcome: z.string(),
  exception: z.string(),
});
```

## Parser 보강

### `packages/utils/src/divergence/rules-parser.ts`

`BL_ID_PATTERN` 동기화:

```typescript
// 기존: /^BL-\d{3}$/
const BL_ID_PATTERN = /^BL-[A-Z]?\d{1,3}$/;
```

`parseRow` 6+ column 허용 (현재 5 cell 제한 없음, settlement처럼 6 column 시 5번째까지 추출):

```typescript
// 현재 코드:
const cells = parseRow(line);
if (cells.length < 5) break;
const [id, condition, criteria, outcome, exception] = cells as [...];

// 변경:
// cells.length >= 5 이면 5개 추출, 6번째 이상은 보존하지 않음 (현재 정상 동작이므로 변경 없음)
// 단, 6번째 cell이 'policyId' 같이 의미 있을 수 있으나 본 Sprint scope 외
```

→ 실제로는 코드 변경 없이 현 parser가 settlement 6-column 행도 정확히 처리. test로 검증만.

## Domain-Source 매핑

### `scripts/divergence/domain-source-map.ts` (신규)

```typescript
import path from "node:path";

export interface DomainMapping {
  container: string;        // 예: "lpon-refund"
  rulesPath: string;        // ".decode-x/spec-containers/lpon-refund/rules/refund-rules.md"
  sourcePath: string | null;// "반제품-스펙/.../src/domain/refund.ts" or null (spec-only)
  provenancePath: string;   // ".decode-x/spec-containers/lpon-refund/provenance.yaml"
  sourceCodeStatus: "present" | "spec-only";
}

const ROOT = "."; // 호출자 cwd 기준
const SPEC_CONTAINER_BASE = ".decode-x/spec-containers";
const DOMAIN_SOURCE_BASE = "반제품-스펙/pilot-lpon-cancel/working-version/src/domain";

export const DOMAIN_MAP: DomainMapping[] = [
  {
    container: "lpon-refund",
    rulesPath: `${SPEC_CONTAINER_BASE}/lpon-refund/rules/refund-rules.md`,
    sourcePath: `${DOMAIN_SOURCE_BASE}/refund.ts`,
    provenancePath: `${SPEC_CONTAINER_BASE}/lpon-refund/provenance.yaml`,
    sourceCodeStatus: "present",
  },
  {
    container: "lpon-charge",
    rulesPath: `${SPEC_CONTAINER_BASE}/lpon-charge/rules/charge-rules.md`,
    sourcePath: `${DOMAIN_SOURCE_BASE}/charging.ts`, // 이름 차이!
    provenancePath: `${SPEC_CONTAINER_BASE}/lpon-charge/provenance.yaml`,
    sourceCodeStatus: "present",
  },
  {
    container: "lpon-payment",
    rulesPath: `${SPEC_CONTAINER_BASE}/lpon-payment/rules/payment-rules.md`,
    sourcePath: `${DOMAIN_SOURCE_BASE}/payment.ts`,
    provenancePath: `${SPEC_CONTAINER_BASE}/lpon-payment/provenance.yaml`,
    sourceCodeStatus: "present",
  },
  {
    container: "lpon-gift",
    rulesPath: `${SPEC_CONTAINER_BASE}/lpon-gift/rules/gift-rules.md`,
    sourcePath: null, // spec-only
    provenancePath: `${SPEC_CONTAINER_BASE}/lpon-gift/provenance.yaml`,
    sourceCodeStatus: "spec-only",
  },
  {
    container: "lpon-settlement",
    rulesPath: `${SPEC_CONTAINER_BASE}/lpon-settlement/rules/settlement-rules.md`,
    sourcePath: null, // spec-only
    provenancePath: `${SPEC_CONTAINER_BASE}/lpon-settlement/provenance.yaml`,
    sourceCodeStatus: "spec-only",
  },
  {
    container: "lpon-budget",
    rulesPath: `${SPEC_CONTAINER_BASE}/lpon-budget/rules/budget-rules.md`,
    sourcePath: null,
    provenancePath: `${SPEC_CONTAINER_BASE}/lpon-budget/provenance.yaml`,
    sourceCodeStatus: "spec-only",
  },
  {
    container: "lpon-purchase",
    rulesPath: `${SPEC_CONTAINER_BASE}/lpon-purchase/rules/purchase-rules.md`,
    sourcePath: null,
    provenancePath: `${SPEC_CONTAINER_BASE}/lpon-purchase/provenance.yaml`,
    sourceCodeStatus: "spec-only",
  },
];

export function findDomainMapping(container: string): DomainMapping | undefined {
  return DOMAIN_MAP.find((m) => m.container === container);
}

void path;
```

## CLI 확장

### `scripts/divergence/detect-bl.ts` `--all-domains` flag

```bash
# 단일 도메인 (기존):
tsx scripts/divergence/detect-bl.ts \
  --source 반제품-스펙/.../refund.ts \
  --rules .decode-x/spec-containers/lpon-refund/rules/refund-rules.md \
  --provenance .decode-x/spec-containers/lpon-refund/provenance.yaml

# 전체 도메인 (신규):
tsx scripts/divergence/detect-bl.ts \
  --all-domains \
  --out reports/sprint-261-multi-domain-2026-05-05.json
```

`--all-domains` flag 처리:

```typescript
if (args.allDomains) {
  const results = [];
  for (const mapping of DOMAIN_MAP) {
    const rules = parseRulesMarkdown(readFileSync(mapping.rulesPath, "utf8"));

    let perRule: PerRuleResult[] = [];
    if (mapping.sourcePath) {
      const sf = parseTypeScriptSource(mapping.sourcePath, readFileSync(mapping.sourcePath, "utf8"));
      // BL_DETECTOR_REGISTRY는 refund 도메인 specific이므로 ID 매칭만 적용 (충돌 없음)
      for (const rule of rules) {
        const fn = BL_DETECTOR_REGISTRY[rule.id];
        if (fn) {
          const markers = fn(sf, mapping.sourcePath);
          perRule.push({ ruleId: rule.id, detected: markers.length, markers, rule });
        } else {
          // detector 미적용 BL → "applicable: false" 분류
          perRule.push({ ruleId: rule.id, detected: 0, markers: [], rule, applicable: false });
        }
      }
    }

    const yamlText = readFileSync(mapping.provenancePath, "utf8");
    const allMarkers = perRule.flatMap((p) => p.markers);
    const recommendations = crossCheck(yamlText, allMarkers);

    results.push({
      container: mapping.container,
      rulesParsed: rules.length,
      sourcePath: mapping.sourcePath,
      sourceCodeStatus: mapping.sourceCodeStatus,
      perRule,
      crossCheck: recommendations,
    });
  }
  // JSON + MD 출력
}
```

## 적용 가능 매트릭스 (예상)

| Domain | BLs | source | applicable detectors | 예상 결과 |
|--------|----:|--------|---------------------:|----------|
| lpon-refund | 11 | ✅ refund.ts | 5 (BL-024/026/027/028/029) | Sprint 260 결과 재현 |
| lpon-charge | 8 | ✅ charging.ts | 0 (ID 충돌 없음) | spec parsed only |
| lpon-payment | 7 | ✅ payment.ts | 0 (ID 충돌 없음) | spec parsed only |
| lpon-gift | 6 | ❌ spec-only | 0 | spec parsed, no detector run |
| lpon-settlement | 6 | ❌ spec-only | 0 | spec parsed, no detector run |
| lpon-budget | 0 | ❌ spec-only | 0 | no BLs |
| lpon-purchase | 0 | ❌ spec-only | 0 | no BLs |

**총 BLs**: 38 (refund 11 + charge 8 + payment 7 + gift 6 + settlement 6)
**Detector 적용 가능**: 11 (refund 단독), **27 BL 미커버** = Sprint 263+ 후속 detector 후보

## 후속 detector 추가 후보 (Sprint 263+)

### 보편적 패턴 (재사용 가능)

1. **Threshold check detector** (BL-005/006/007 한도 체크):
   - 패턴: 변수가 임계값과 비교(`<=`, `<`)되는지 확인
   - 적용 BL: charge BL-005~008, payment BL-015 (50,000원), settlement BL-036 (수수료 차감)

2. **Status transition detector** (status enum 변환):
   - 패턴: `status === 'X'` 분기 + assignment to 'Y' or 'Z'
   - 적용 BL: gift BL-G002~G005 (pending→accepted/rejected/expired), payment BL-014 (status='PAID' check)

3. **Atomic transaction detector** (트랜잭션 일관성):
   - 패턴: `db.transaction(...)` 또는 begin/commit/rollback 블록
   - 적용 BL: gift BL-G006 (sender debit + receiver credit)

### 도메인 specific (재사용 불가)

4. **Timeout retry detector** (BL-004 출금 타임아웃 5분 후 재시도)
5. **External API call detector** (BL-019 AP06 API)
6. **Batch trigger detector** (BL-033 BATCH_004)

## 검증 시나리오

### Test 1: parser regex 보강 — gift BL-G001 매칭

```typescript
const md = `| ID | condition | criteria | outcome | exception |
|----|-----------|----------|---------|-----------|
| BL-G001 | a | b | c | d |
| BL-G002 | a | b | c | d |`;
const rules = parseRulesMarkdown(md);
expect(rules.map((r) => r.id)).toEqual(["BL-G001", "BL-G002"]);
```

### Test 2: settlement 6-column row

```typescript
const md = `| ID | condition | criteria | outcome | exception | policyId |
|----|-----------|----------|---------|-----------|----------|
| BL-031 | a | b | c | d | POL-X |`;
const rules = parseRulesMarkdown(md);
expect(rules).toHaveLength(1);
expect(rules[0]?.exception).toBe("d");
// policyId(6번째 cell)는 무시되지만 정상 추출
```

### Test 3: invalid prefix 거부

```typescript
const md = `| ID | condition | criteria | outcome | exception |
|----|-----------|----------|---------|-----------|
| BL-XX | a | b | c | d |
| BL- | a | b | c | d |
| BL-A | a | b | c | d |
| BL-001 | a | b | c | d |`;
const rules = parseRulesMarkdown(md);
expect(rules.map((r) => r.id)).toEqual(["BL-A", "BL-001"]);
// BL-A는 [A-Z]?+\d{1,3} 매칭 (A는 prefix, 0 digit 허용?)
// → 실제로는 \d{1,3} 최소 1 digit 필수이므로 BL-A 미매칭. 정확한 동작 확인.
```

→ regex `/^BL-[A-Z]?\d{1,3}$/` 정확한 의미: optional 1자 알파벳 + 1~3자리 숫자. `BL-A`는 미매칭 (digit 부재).

## 보안/품질 고려

- DOMAIN_MAP은 hardcoded path 배열 — 신규 도메인 추가 시 코드 변경 필수 (의도적 명시성)
- spec-only 도메인은 detector 실행 자체 skip (미적용 sourcePath 처리 NPE 방지)
- charge.ts ↔ charging.ts 이름 alias는 DOMAIN_MAP에서만 처리 (코드 다른 곳 침투 X)

## 후속 확장 포인트

- **F428 (Sprint 262)**: LPON 35 R2 재패키징 — production HTTP 200 검증 + TD-55 해소
- **F429**: provenance.yaml auto-write
- **Sprint 263+**: 보편적 detector 3종 (Threshold / Status transition / Atomic transaction) 도입 → 27 BL 추가 커버 가능
