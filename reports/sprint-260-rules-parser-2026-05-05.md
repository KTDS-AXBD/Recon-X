# Sprint 260 — F427 rules.md NL parser + BL-024/026/029 detector

**Sprint**: 260
**F-item**: F427
**Plan**: AIF-PLAN-058
**Design**: AIF-DSGN-058
**Session**: 272 (2026-05-05)
**Mode**: Master inline (autopilot 회피 8회 연속)
**Match Rate**: 95%

## TL;DR

F354 (Sprint 218) 5건 BL-level marker 자동화 완성. Sprint 259 (BL-027/028 = 2/5) → Sprint 260 (BL-024/026/029 추가 = **5/5 100%**). Hybrid 접근(markdown table parser + BL_DETECTOR_REGISTRY 매핑 table) 채택 — NL→AST 자동 추출 회피로 신뢰도 75-80%대 유지.

## DoD 체크 (14/14 PASS)

| # | 항목 | 결과 |
|---|------|------|
| 1 | Plan/Design (AIF-PLAN/DSGN-058) | ✅ |
| 2 | SPEC §6 Sprint 260 + F427 등록 | ✅ |
| 3 | BLRuleSchema 신설 + 3 pattern enum 추가 | ✅ |
| 4 | rules-parser.ts 구현 + 테스트 5건 | ✅ |
| 5 | bl-detector.ts 3 detector 추가 | ✅ |
| 6 | 단위 테스트 추가 (BL-024 3 + BL-029 3 + BL-026 3 + Registry 2 = 11) | ✅ |
| 7 | BL_DETECTOR_REGISTRY 매핑 table | ✅ |
| 8 | DETECTOR_SUPPORTED_RULES 5종 확장 | ✅ |
| 9 | 합성 fixture BL-024/029/026 누락 패턴 추가 | ✅ |
| 10 | CLI `--rules` flag | ✅ |
| 11 | 현 refund.ts 실측: 4 RESOLVED 권고 + 1 OPEN 유지 | ✅ |
| 12 | 합성 fixture 실측: 5/5 ABSENCE markers | ✅ |
| 13 | reports JSON + MD 실파일 | ✅ |
| 14 | typecheck (utils + types) + lint + test 108/108 PASS | ✅ |

## 실측 결과 (5 detector × 2 fixture)

### 현 refund.ts (Sprint 251 F359 이후)

| BL | 결과 | provenance 권고 |
|----|------|-----------------|
| BL-024 | 0 markers (PRESENT line 98-103) | OPEN → RESOLVED 권고 |
| BL-026 | 1 marker (ABSENT) | OPEN 유지 (consistent) |
| BL-027 | 0 markers (PRESENT, approveRefund 50+ lines) | OPEN → RESOLVED 권고 |
| BL-028 | 0 markers (PRESENT line 116, cashback*1.1) | OPEN → RESOLVED 권고 |
| BL-029 | 0 markers (PRESENT line 93-96, expires_at<now) | OPEN → RESOLVED 권고 |

**소계**: 4 RESOLVED 권고 + 1 OPEN 유지 (BL-026). UNKNOWN 0건 (Sprint 259 3건 → 0건 해소).

### 합성 fixture refund-pre-f359.ts

| BL | 결과 |
|----|------|
| BL-024 | 1 ABSENCE marker (no `> 7`) |
| BL-026 | 1 ABSENCE marker (no reject ALT) |
| BL-027 | 1 ABSENCE marker (stub function) |
| BL-028 | 1 ABSENCE marker (hardcoded 0) |
| BL-029 | 1 ABSENCE marker (no expiry compare) |

**소계**: 5/5 ABSENCE markers — 모든 detector positive case 검증.

## 핵심 설계 패턴

### Hybrid 접근 (사용자 결정)

```typescript
// rules.md 파서: 구조 추출만 (자연어 의미 추출 X)
parseRulesMarkdown(text) → BLRule[] { id, condition, criteria, outcome, exception }

// 매핑 table: BL-ID → 하드코딩 detector
BL_DETECTOR_REGISTRY: {
  "BL-024": detectTemporalCheck,   // 75% 신뢰도
  "BL-026": detectCashbackBranch,  // 65% 신뢰도 (heuristic)
  "BL-027": detectUnderImplementation,  // Sprint 259
  "BL-028": detectHardCodedExclusion,   // Sprint 259
  "BL-029": detectExpiryCheck,     // 80% 신뢰도
}
```

### PRESENCE/ABSENCE 양면 검증

Sprint 251 F359 round-trip 회복으로 현 refund.ts는 BL-024/027/028/029 코드 RESOLVED 상태이며 BL-026만 미구현. 본 detector는 양면 모두 검증 가능:

- **PRESENCE 매칭** → 0 markers 발행 → "RESOLVED auto-evidence" 출력 → cross-check가 manual=OPEN을 RESOLVED로 권고
- **ABSENCE 매칭** → 1 marker 발행 → cross-check가 manual=OPEN과 consistent 판정

### Confidence calibration

| BL | 신뢰도 | 근거 |
|----|--------|------|
| BL-029 | 80% | 명확한 비교 패턴 (`expires_at < now`) — false positive risk 낮음 |
| BL-024 | 75% | temporal arithmetic 변형 다양 — `daysSince*` alias 또는 직접 계산 둘 다 매칭 |
| BL-027 | 70% | heuristic (line count + branch depth), Sprint 259 유지 |
| BL-026 | 65% | heuristic, cashback identifier가 BL-028 계산에도 등장 — outcome reject 키워드 동시 매칭 의무화 |
| BL-028 | 95% | AST literal `0` 매칭 — 가장 정확 |

## 테스트 매트릭스

```
108/108 PASS (12 신규)
  rules-parser.test.ts: 5 (parser 정확도)
  bl-detector.test.ts: +11 (BL-024/029/026 × 3 + Registry × 2)
  기존: 92 (BL-027/028 + cross-check + provenance)
```

## 후속 확장 포인트

- **F428** (Sprint 261+) — Phase 3b LPON 35 R2 재패키징 + multi-domain rules.md 적용 (lpon-payment / lpon-charge / pension-* 등)
- **F429** — provenance.yaml auto-write — 본 cross-check 권고를 status 필드에 자동 반영. 현재는 read-only 출력만
- BL-025/030 자동 검출 추가 (현재 provenance에 marker 없음, Phase 3 Should)
- BL-024 detector confidence 향상 — `daysSinceXxx > 7` alias 외에 함수 추출 케이스(`isWithin7Days(...)`) 매칭

## 파일 변경 요약

```
docs/01-plan/features/F427-rules-parser.plan.md           +newly created
docs/02-design/features/F427-rules-parser.design.md       +newly created
SPEC.md                                                    + Sprint 260 §6 entry
packages/types/src/divergence.ts                           +BLRuleSchema, +3 pattern enum
packages/utils/src/divergence/rules-parser.ts             +newly created
packages/utils/src/divergence/bl-detector.ts              +3 detector + REGISTRY
packages/utils/src/divergence/provenance-cross-check.ts   +DETECTOR_SUPPORTED_RULES 5종 확장
packages/utils/src/divergence/index.ts                    +re-exports 갱신
packages/utils/test/rules-parser.test.ts                  +newly created (5 tests)
packages/utils/test/bl-detector.test.ts                   +11 tests (BL-024/029/026 + Registry)
scripts/divergence/fixtures/refund-pre-f359.ts            +BL-024/029/026 누락 패턴 추가
scripts/divergence/detect-bl.ts                           +--rules flag, REGISTRY iter
reports/sprint-260-rules-parser-2026-05-05-current.json   +newly created
reports/sprint-260-rules-parser-2026-05-05-fixture.json   +newly created
reports/sprint-260-rules-parser-2026-05-05.md             +newly created (this file)
```

## 결론

F354 5건 BL-level marker 자동화 **5/5 (100%) 완성**. Sprint 218 (manual curation) → Sprint 259 (2/5) → Sprint 260 (5/5). detector 인프라 + Hybrid 접근 정립으로 후속 BL 추가 시 BL_DETECTOR_REGISTRY 1줄 추가만 필요. Master inline 8회 연속 회피 패턴 유지 (autopilot 신뢰도 우려 회피).
