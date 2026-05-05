---
id: AIF-PLAN-058
title: "F427 — rules.md NL parser + BL-024/026/029 detector (Hybrid 접근)"
sprint: 260
f_items: [F427]
req: AIF-REQ-035
related_features: [F354, F425, F426, F359]
related_td: [TD-24]
status: PLANNED
created: "2026-05-05"
author: "Master (session 272, Sprint 260)"
related: [AIF-PLAN-057]
---

# F427 — rules.md NL parser + BL-024/026/029 detector

## Background

Sprint 259 (F426, AIF-PLAN-057)에서 BL-027/028 자동 검출 detector를 도입했고, **F354 5건 자동화 진행률 2/5 (40%)** 도달. 잔여 BL-024/026/029 3건의 자동 검출은 자연어 조건문(`7일 이내`/`캐시백 또는 할인보전`/`유효기간 만료`) 해석이 필요하여 Sprint 258 분류에서 50~60% 신뢰도 + "rules.md NL parser 선결" 판정.

본 Sprint는 사용자 결정(세션 272, AskUserQuestion):
- **접근 방식**: Hybrid — markdown table parser(구조 추출만) + BL-ID→하드코딩 detector 매핑 table. NL→AST 자동 의미 추출은 risk 회피.
- **범위**: BL-024/026/029 3종 전부 — F354 자동화 5/5 완성.

Sprint 251 F359 round-trip fidelity 회복으로 현 `refund.ts`는 BL-024 (line 98-103) + BL-029 (line 93-96) 코드 RESOLVED 상태이며 BL-026 (캐시백 ALT 분기)만 미구현. 따라서 본 Sprint detector의 가치는 **3축**:

1. **Markdown table 구조화** — rules.md를 BLRule[] 객체로 변환하여 후속 자동화(F428 LPON 재패키징, F429 yaml auto-write)의 입력으로 재사용
2. **BL-024/029 RESOLVED 자동 입증** — 현 refund.ts에서 PRESENCE pattern 검출 → status RESOLVED 권고
3. **BL-026 OPEN 검증** — 미구현 ALT 분기 ABSENCE 검출 → status OPEN 유지

## Objective

본 Sprint의 DoD:

- (a) `packages/utils/src/divergence/rules-parser.ts` 신설 — `parseRulesMarkdown(text)` → `BLRule[]` 추출. ID/condition/criteria/outcome/exception 필드.
- (b) `packages/types/src/divergence.ts` 확장 — `BLRuleSchema` Zod 신설 + `BLDivergenceMarker.pattern` enum에 `missing_temporal_check` / `missing_validation_check` / `missing_alt_branch` 3종 추가.
- (c) `packages/utils/src/divergence/bl-detector.ts` 확장 — 3 detector 신설:
  - `detectTemporalCheck()` — BL-024 7일 윈도 체크 PRESENCE/ABSENCE 검출 (`purchas*|created*` field + `> 7` 비교)
  - `detectExpiryCheck()` — BL-029 만료 거부 PRESENCE/ABSENCE 검출 (`expir*|valid_until` field + `< now()|< Date.*now`)
  - `detectCashbackBranch()` — BL-026 ALT 분기 PRESENCE/ABSENCE 검출 (`cashback*|discount*` field + 거부/대안 outcome)
- (d) `packages/utils/src/divergence/index.ts` re-export 갱신
- (e) BL-ID → detector function 매핑 table 신설 (`BL_DETECTOR_REGISTRY`) — Hybrid 접근 핵심
- (f) `DETECTOR_SUPPORTED_RULES` Set을 5종으로 확장 (BL-024/026/027/028/029)
- (g) `scripts/divergence/detect-bl.ts` CLI 확장 — `--rules <path>` 입력 추가, 5 detector 일괄 실행
- (h) 단위 테스트 ≥12건 (3 detector × {positive 1, negative 1, edge 1, fixture 1}) — `packages/utils/test/bl-detector.test.ts` + `packages/utils/test/rules-parser.test.ts`
- (i) 합성 fixture 확장 — `scripts/divergence/fixtures/refund-pre-f359.ts`에 BL-024 (no 7-day) + BL-029 (no expiry) 케이스 누락 패턴 추가
- (j) **현 refund.ts 실측**: BL-024 PRESENT + BL-029 PRESENT (RESOLVED 권고) + BL-026 ABSENT (OPEN 유지) + BL-027 ABSENT (Sprint 259 RESOLVED 일관) + BL-028 ABSENT (Sprint 259 RESOLVED 일관)
- (k) **합성 fixture 실측**: BL-024/026/029 3종 ABSENCE markers detected + BL-027/028 2종 PRESENCE markers detected → 5/5 patterns 검증
- (l) provenance.yaml 5 markers cross-check — 4 RESOLVED 권고 + 1 OPEN 유지 (BL-026)
- (m) `reports/sprint-260-rules-parser-2026-05-05.json` + `.md` 실파일
- (n) Match Rate ≥ 90% + typecheck/lint/test 전체 PASS

## Scope

### In Scope (Sprint 260)
- Markdown table 구조화 파싱 (rules.md → BLRule[])
- BL-024/026/029 detector 3종 (TS Compiler API 기반, 패턴은 Hybrid 매핑 table)
- 합성 fixture + 현 refund.ts 양쪽 실측
- provenance.yaml read-only cross-check (write는 F429 이관)
- 단위 테스트 + CLI 확장

### Out of Scope (별도 F-item)
- LLM-조력 NL 파싱 (Hybrid 결정으로 제외)
- provenance.yaml auto-write (F429)
- LPON 35 R2 재패키징 (F428 Phase 3b)
- Java source AST detector (현 refund.ts는 TS, Java 도메인은 별도)
- Multi-domain 확장 (lpon-payment / lpon-charge 등 — F428 이후)
- BL-025/030 (이미 코드 구현 + provenance에 markers 없음)

## Algorithm Design

### rules.md Parser (Hybrid 핵심)

```
입력: rules.md (markdown table 포함)
처리:
  1. 헤더 라인 정규식 매칭: /^\| ID \| condition \| criteria \| outcome \| exception \|/
  2. 테이블 본문 라인 추출 (구분선 — 이후 ~ 빈 줄 또는 다음 헤더 직전)
  3. 각 라인 split('|') → trim → BLRule 객체로 변환
  4. ID 정규식 검증: /^BL-\d{3}$/

출력: BLRule[]  // {id, condition, criteria, outcome, exception}
```

**의도적 단순화**: 자연어 조건문에서 키워드/임계값 자동 추출은 안 함 (Pure NL→AST 옵션 거부). 그 책임은 BL_DETECTOR_REGISTRY 매핑 table이 담당.

### BL_DETECTOR_REGISTRY (Hybrid 핵심)

```typescript
// Hybrid: rules.md 구조 파서가 BLRule[] 제공 → 이 매핑 table이 BL-ID로 detector 찾음
const BL_DETECTOR_REGISTRY: Record<string, DetectorFn> = {
  "BL-024": detectTemporalCheck,    // 7일 윈도 체크
  "BL-026": detectCashbackBranch,   // 캐시백 ALT 분기
  "BL-027": detectUnderImplementation,  // Sprint 259
  "BL-028": detectHardCodedExclusion,   // Sprint 259
  "BL-029": detectExpiryCheck,      // 만료 거부
};
```

각 detector는 `(sourceFile, fileName, rule: BLRule) => BLDivergenceMarker[]` 시그니처. `rule` 파라미터는 BLRule(파서 출력) 그대로 받아 detector 내부에서 임계값/필드명을 도메인 지식으로 매핑.

### BL-024 (Temporal Check, 7일)

```
패턴 검출: AST 트리 워크
  1. BinaryExpression with `>` operator
  2. left side contains identifier matching /purchas|created|paid/i
     AND involves arithmetic with Date.now() or similar (subtraction → ms → days)
  3. right side === NumericLiteral with value 7

  positive (RESOLVED): daysSincePurchase > 7
  positive (RESOLVED): (now - purchased_at) / DAY_MS > 7
  negative (DIVERGENCE): no such pattern in any function involving refund

신뢰도: 75% — temporal arithmetic이 다양한 형태이므로 false negative 가능. 보수적으로 PRESENCE 검출 시 RESOLVED 권고.
```

### BL-029 (Expiry Check)

```
패턴 검출: AST 트리 워크
  1. BinaryExpression with `<` operator
  2. left side contains identifier matching /expir|valid_until|valid_to/i
  3. right side compares to current time:
     - new Date() literal
     - Date.now()
     - 변수가 now/today 명명

  positive (RESOLVED): new Date(voucher.expires_at) < new Date()
  positive (RESOLVED): voucher.expires_at < Date.now()
  negative (DIVERGENCE): no such comparison

신뢰도: 80% — 비교 연산자 + 명확한 필드명으로 false positive risk 낮음.
```

### BL-026 (Cashback ALT Branch)

```
패턴 검출: AST 트리 워크 + 의미 분석
  1. IfStatement / SwitchCase / TernaryExpression
  2. 조건 (condition) contains identifier matching /cashback|discount|할인보전/i
  3. body / consequent contains rejection or alt outcome:
     - throw/return with status === 'REJECTED' | 'CASH_REFUND_DENIED'
     - return alt outcome (포인트 전환 등)

  positive (RESOLVED): if (voucher.cashback_amount > 0) { throw new RefundError('CASHBACK_REFUND_DENIED', ...) }
  negative (DIVERGENCE): cashback identifier 사용은 있어도 분기 거부/대안 없음

신뢰도: 65% — heuristic. cashback_amount 사용은 BL-028 exclusionAmount 계산에도 등장하므로 분기 outcome 의미 분석 필요.
```

## 4 Steps

### Step 1 — Plan/Design 작성 (0.5h, 진행 중)

- ✅ AskUserQuestion으로 접근 방식 + scope 결정
- ✅ refund.ts 현 구조 확인 (BL-024/029 RESOLVED, BL-026 OPEN)
- 본 Plan + Design 작성

### Step 2 — rules-parser + 3 detector 구현 (3h)

- `packages/types/src/divergence.ts`: BLRuleSchema + 3 신규 pattern enum 추가
- `packages/utils/src/divergence/rules-parser.ts`: `parseRulesMarkdown()`
- `packages/utils/src/divergence/bl-detector.ts`: 3 detector 추가
- `packages/utils/src/divergence/index.ts`: re-export + BL_DETECTOR_REGISTRY 신설
- `packages/utils/test/rules-parser.test.ts`: ≥4 케이스 (정상 + ID 형식 위반 + 빈 테이블 + 다중 테이블)
- `packages/utils/test/bl-detector.test.ts`: ≥9 추가 (3 detector × {positive, negative, edge})
- 합성 fixture 확장: `scripts/divergence/fixtures/refund-pre-f359.ts`에 BL-024/029 누락 패턴 추가

### Step 3 — CLI 확장 + 실측 (1.5h)

- `scripts/divergence/detect-bl.ts`: `--rules <path>` 추가, 5 detector 일괄 실행
- 실측 1: 현 `반제품-스펙/.../refund.ts` → BL-024/029 PRESENT, BL-026/027/028 ABSENT (RESOLVED 자동 입증 4건 + OPEN 1건)
- 실측 2: 합성 fixture refund-pre-f359.ts → 5/5 패턴 모두 ABSENCE markers (negative case)
- provenance.yaml cross-check: 5 markers 중 4 RESOLVED 권고 + 1 OPEN 유지 (BL-026)

### Step 4 — Analysis + Report + SPEC + Commit (1h)

- AIF-ANLS-058 (rules-parser + 3 detector 결과 분석 + F354 자동화 5/5 완성)
- AIF-RPRT-058 (Sprint 260 종결)
- SPEC §5 Last Updated + Sprint 260 ✅ DONE + F427 [x]
- CHANGELOG 세션 272
- Conventional commit + push

## DoD 매트릭스

- [ ] Plan/Design (AIF-PLAN/DSGN-058)
- [ ] SPEC §6 Sprint 260 + F427 등록
- [ ] BLRuleSchema + 3 pattern enum 추가
- [ ] rules-parser.ts 구현 + 테스트 ≥4건
- [ ] bl-detector.ts 3 detector 추가 + 테스트 ≥9건
- [ ] BL_DETECTOR_REGISTRY 매핑 table
- [ ] DETECTOR_SUPPORTED_RULES 5종 확장
- [ ] 합성 fixture BL-024/029 누락 패턴 추가
- [ ] CLI scripts/divergence/detect-bl.ts `--rules` flag
- [ ] 현 refund.ts 실측: 4 RESOLVED 권고 + 1 OPEN 유지
- [ ] 합성 fixture 실측: 5/5 ABSENCE markers
- [ ] reports JSON + MD 실파일
- [ ] Match ≥ 90% + typecheck/lint/test 전체 PASS

## Risk

- **R1 (Pattern false negative)**: temporal/expiry detector가 ramen-style 코드 변형(arrow funct + util 추출 등)에 대응 못함. → 보수적으로 multiple alias regex 사용 + heuristic 임계치 도메인 지식으로 calibration. F354 자동화 신뢰도는 sprint 258 분석 기준치(75/80/65%) 명시.
- **R2 (BL-026 false positive)**: `cashback_amount` 식별자 자체는 BL-028 계산에도 사용되므로, 분기 의미 분석이 부정확할 시 false positive 가능. → 분기의 outcome (throw/return + REJECTED-like 키워드) 동시 매칭 의무화로 완화.
- **R3 (rules.md 형식 변경)**: 다른 spec-container의 rules.md가 다른 column 순서를 쓸 수 있음 → 본 Sprint는 LPON refund 단일 파일 대응만, 다중 확장은 F428 이후.
- **R4 (Detector registry overhead)**: BL_DETECTOR_REGISTRY가 향후 BL 추가 시마다 코드 변경 필요 — 현 단계는 의도적 trade-off (Hybrid 결정). LLM-조력 옵션은 미래 작업으로 연기.

## Related

- AIF-PLAN-057 (Sprint 259 F426 — BL-027/028 detector + cross-check 인프라, 본 Sprint의 직접 기반)
- AIF-PLAN-056 (Sprint 258 F425 — F354 자동화 분류 분석)
- F354 (Sprint 218 — 5건 manual markers, 본 detector의 5/5 자동화 목표)
- F359 (Sprint 251 — refund.ts BL-024/029 코드 RESOLVED, detector PRESENCE 입증 대상)
- F428 (차기, Sprint 261+) — Phase 3b LPON 35 R2 재패키징 + multi-domain rules.md 확장
- F429 (차기) — provenance.yaml auto-write (본 Sprint cross-check 권고를 yaml에 자동 반영)
