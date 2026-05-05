---
id: AIF-RPRT-058
title: "Sprint 260 — F427 rules.md NL parser + BL detector 5/5 완성 보고"
sprint: 260
f_items: [F427]
plan_ref: AIF-PLAN-058
design_ref: AIF-DSGN-058
analysis_ref: AIF-ANLS-058
status: DONE
created: "2026-05-05"
session: 272
match_rate: 95
mode: master-inline
---

# Sprint 260 — F427 완료 보고

## 결과

✅ **DONE** — Master inline ~2.5h Match 95%. F354 5건 BL-level marker **자동화 5/5 완성**.

## 산출물

### 코드
- `packages/types/src/divergence.ts` — BLRuleSchema 신설 + 3 pattern enum 추가
- `packages/utils/src/divergence/rules-parser.ts` — markdown table → BLRule[] 파서 (신규)
- `packages/utils/src/divergence/bl-detector.ts` — 3 detector 추가 + BL_DETECTOR_REGISTRY
- `packages/utils/src/divergence/provenance-cross-check.ts` — DETECTOR_SUPPORTED_RULES 5종 확장
- `packages/utils/src/divergence/index.ts` — re-export 갱신
- `scripts/divergence/detect-bl.ts` — `--rules` flag + REGISTRY 일괄 실행
- `scripts/divergence/fixtures/refund-pre-f359.ts` — BL-024/029/026 누락 패턴 추가

### 테스트
- `packages/utils/test/rules-parser.test.ts` (신규, 5건)
- `packages/utils/test/bl-detector.test.ts` (확장, +11건: BL-024 3 + BL-029 3 + BL-026 3 + Registry 2)
- 합산: **108/108 PASS**

### 문서
- `docs/01-plan/features/F427-rules-parser.plan.md` (AIF-PLAN-058)
- `docs/02-design/features/F427-rules-parser.design.md` (AIF-DSGN-058)
- `docs/03-analysis/features/sprint-260-rules-parser.analysis.md` (AIF-ANLS-058)
- `docs/04-report/features/sprint-260-F427.report.md` (AIF-RPRT-058, 본 문서)

### Reports
- `reports/sprint-260-rules-parser-2026-05-05-current.json` (4.8K, 현 refund.ts 실측)
- `reports/sprint-260-rules-parser-2026-05-05-fixture.json` (6.3K, 합성 fixture 실측)
- `reports/sprint-260-rules-parser-2026-05-05.md` (요약)

## DoD 14/14 PASS

(상세는 reports/sprint-260-rules-parser-2026-05-05.md 참조)

## 검증 (Master 독립)

```bash
npx tsx scripts/divergence/detect-bl.ts \
  --source 반제품-스펙/pilot-lpon-cancel/working-version/src/domain/refund.ts \
  --rules .decode-x/spec-containers/lpon-refund/rules/refund-rules.md \
  --provenance .decode-x/spec-containers/lpon-refund/provenance.yaml \
  --target-functions approveRefund

# 결과:
# BL-024: PRESENT (RESOLVED auto-evidence)
# BL-026: 1 ABSENCE marker(s)
# BL-027: PRESENT (RESOLVED auto-evidence)
# BL-028: PRESENT (RESOLVED auto-evidence)
# BL-029: PRESENT (RESOLVED auto-evidence)
#
# Provenance cross-check:
# BL-024 manual=OPEN auto=0 → recommend RESOLVED
# BL-028 manual=OPEN auto=0 → recommend RESOLVED
# BL-026 manual=OPEN auto=1 → consistent
# BL-029 manual=OPEN auto=0 → recommend RESOLVED
# BL-027 manual=OPEN auto=0 → recommend RESOLVED
```

→ 4 RESOLVED 권고 + 1 OPEN 유지 + 0 UNKNOWN. Sprint 259 (3 UNKNOWN) → Sprint 260 (0 UNKNOWN) 완전 해소.

## 후속 권고 (차기 Sprint)

- **F428** (Sprint 261+): Phase 3b LPON 35 R2 재패키징 + multi-domain rules.md 적용 — lpon-payment / lpon-charge / pension-* 도메인 확장
- **F429**: provenance.yaml auto-write — 본 cross-check 권고를 status 필드에 자동 반영 (read → write 전환)
- BL-025/030 detector 추가 (P3, 현재 provenance에 marker 없으므로 미시급)

## 메모

- **Master inline 8회 연속** (S253~272) — autopilot Production Smoke Test 14회차 변종 직후라 신뢰도 우려 회피 패턴 유지
- **사용자 결정 적중**: Hybrid 접근(NL→AST 자동 추출 회피)이 신뢰도 65~80% 보장. NL 옵션은 동일 시간에 50% 미만 도달 우려
- **사전 조사 효과**: Sprint 259 발견 "refund.ts 4/5 RESOLVED"가 Sprint 260 detector 가치 3축 재정의의 출발점
- typecheck/lint/test 모두 PASS 후 commit
