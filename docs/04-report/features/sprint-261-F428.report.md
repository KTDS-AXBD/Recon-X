---
id: AIF-RPRT-059
title: "Sprint 261 — F428 Multi-domain parser 검증 보고"
sprint: 261
f_items: [F428]
plan_ref: AIF-PLAN-059
design_ref: AIF-DSGN-059
analysis_ref: AIF-ANLS-059
status: DONE
created: "2026-05-05"
session: 273
match_rate: 95
mode: master-inline
---

# Sprint 261 — F428 완료 보고

## 결과

✅ **DONE** — Master inline ~3h Match 95%. F428 Phase 3b 분할 1/2 완료. Multi-domain rules.md parser 검증 + detector 적용 매트릭스 도출.

## 산출물

### 코드
- `packages/types/src/divergence.ts` — BLRule.id regex 보강 (`/^BL-[A-Z]?\d{1,3}$/`)
- `packages/utils/src/divergence/rules-parser.ts` — BL_ID_PATTERN 동기화
- `scripts/divergence/domain-source-map.ts` — 신규 DOMAIN_MAP 7 entries + DomainMapping interface (underImplTargets 포함)
- `scripts/divergence/detect-bl.ts` — `--all-domains` flag + runMultiDomain() 추가, BL-027 도메인별 underImplTargets 매핑

### 테스트
- `packages/utils/test/rules-parser.test.ts` — +3건 (gift G prefix + settlement 6-column + invalid prefix boundary)
- 합산: **111/111 PASS** (Sprint 260 108 → Sprint 261 111, +3 신규)

### 문서
- `docs/01-plan/features/F428-multi-domain-parser.plan.md` (AIF-PLAN-059)
- `docs/02-design/features/F428-multi-domain-parser.design.md` (AIF-DSGN-059)
- `docs/03-analysis/features/sprint-261-multi-domain.analysis.md` (AIF-ANLS-059)
- `docs/04-report/features/sprint-261-F428.report.md` (AIF-RPRT-059, 본 문서)

### Reports
- `reports/sprint-261-multi-domain-2026-05-05.json` (실측, 7 containers, 38 BLs)
- `reports/sprint-261-multi-domain-2026-05-05.md` (요약)

## DoD 10/10 PASS

(상세는 reports/sprint-261-multi-domain-2026-05-05.md 참조)

## 핵심 결과

### 7 spec-containers 일괄 파싱 (38 BLs)
| Domain | BLs | source | applicable | ABSENCE |
|--------|----:|--------|-----------:|--------:|
| lpon-refund | 11 (BL-020~030) | ✅ | 5 | 1 (BL-026) |
| lpon-charge | 8 (BL-001~008) | ✅ | 0 | 0 |
| lpon-payment | 7 (BL-013~019) | ✅ | 0 | 0 |
| lpon-gift | 6 (BL-G001~G006) | spec-only | 0 | 0 |
| lpon-settlement | 6 (BL-031~036) | spec-only | 0 | 0 |
| lpon-budget | 0 | spec-only | 0 | 0 |
| lpon-purchase | 0 | spec-only | 0 | 0 |

### Detector coverage
- 현재: 5/38 = **13.2%**
- Sprint 263 (보편 3종 도입 시 예상): **47.4%**
- Sprint 264+ (보편 5종 추가): **78.9%**

## 검증 (Master 독립)

```bash
npx tsx scripts/divergence/detect-bl.ts --all-domains \
  --out reports/sprint-261-multi-domain-2026-05-05.json

# 결과:
# Multi-Domain BL Detector — 7 containers
#   lpon-refund: 11 BLs, 5 applicable detectors, 1 ABSENCE markers (BL-026, Sprint 260 일관)
#   lpon-charge: 8 BLs, 0 applicable, 0 ABSENCE
#   lpon-payment: 7 BLs, 0 applicable, 0 ABSENCE
#   lpon-gift: 6 BLs, 0 applicable, 0 ABSENCE (G prefix 매칭 PASS)
#   lpon-settlement: 6 BLs, 0 applicable, 0 ABSENCE (6-column PASS)
#   lpon-budget: 0 BLs
#   lpon-purchase: 0 BLs
#
# Summary: 38 total BLs, 5 detector applications across 7 containers
# Detector coverage: 5/38 = 13.2%
```

## 후속 권고

### Sprint 262 (가치/risk 분석 결과 권고 변경)
- **원안**: LPON 35 R2 재패키징 + production HTTP 200 검증 (production 작업, autopilot 14회차 직후 risk)
- **권고**: 보편 detector 3종 도입 (Threshold/Status transition/Atomic transaction) → coverage 47.4%
- **이유**: code-only 작업, Master inline 적합, 가치 +34%p coverage. R2 재패키징은 Sprint 263+ 별도 검토 (production smoke 직접 검증 가능 시점)

### Sprint 263+
- 도메인별 specific detector 선별 도입
- gift/settlement source code 작성 PoC (별도 결정 필요)
- F429 provenance.yaml auto-write

## 메모

- **Master inline 9회 연속** (S253~273) — autopilot Production Smoke Test 14회차 변종 직후 신뢰도 우려 회피 패턴 유지
- **F427 인프라 재활용 효과 입증**: 신규 코드 ~150 lines로 7배 도메인 확장 (Sprint 260 ~400 lines 대비)
- **BL-027 false positive 자동 회피 패턴 정립**: DOMAIN_MAP `underImplTargets` 화이트리스트 — 신규 도메인 BL-027 적용 시 동일 패턴 적용
- **Parser regex 1줄 보강의 비대칭 가치**: 6 BLs 추가 매칭, 회귀 risk 0
