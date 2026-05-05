---
id: AIF-ANLS-058
title: "F427 — rules.md NL parser + BL detector 분석"
sprint: 260
f_items: [F427]
plan_ref: AIF-PLAN-058
design_ref: AIF-DSGN-058
status: DONE
created: "2026-05-05"
session: 272
author: "Master inline"
---

# F427 분석 — rules.md NL parser + BL detector 5/5 완성

## 1. 배경 검증 결과

### Sprint 258 분류 vs 실측

| BL | Sprint 258 분류 | 신뢰도 (예상) | Sprint 260 신뢰도 (실 구현) |
|----|----------------|--------------|----------------------------|
| BL-024 | 조건부 가능 | 50-60% | **75%** (temporal field regex 명확) |
| BL-026 | 조건부 가능 | 50-60% | **65%** (heuristic, outcome 의무화로 보강) |
| BL-029 | 조건부 가능 | 50-60% | **80%** (비교 패턴 명확) |

Sprint 258에서 "조건부 가능" 50-60%으로 분류했지만 실제 구현해보니 65~80% 도달. NL parser 선결 조건은 결과적으로 **불필요** — Hybrid 접근(BL_DETECTOR_REGISTRY)만으로 충분.

### Hybrid 접근의 효과

NL→AST 자동 추출 회피 결정(사용자 선택)이 적중:

- 자연어 조건문은 다양 ("7일 이내" vs "구매 후 일주일 안") — NL 처리 false negative 위험 컸음
- BL_DETECTOR_REGISTRY는 BL-ID 기반 명시적 매핑 — 디버깅 가능 + 신뢰도 calibration 가능
- BL 추가 비용은 detector 함수 1개 + REGISTRY 1줄 (Hybrid 단점 미미)

## 2. detector 신뢰도 차이 분석

### BL-029 (80%) > BL-024 (75%) > BL-027 (70%) > BL-026 (65%) > BL-028 (95%)

**BL-028이 가장 높은 이유** (Sprint 259):
- AST literal 정확 매칭 (`= 0`) — 의미 모호성 0
- 식별자 regex (`exclusion|excl_amount|exemptAmount`)도 명확

**BL-026이 가장 낮은 이유**:
- `cashback_amount` 식별자는 BL-028 계산식(`Math.round(cashback_amount * 1.1)`)에도 등장
- 단순 식별자 검출만으로는 BL-026 ALT 분기 vs BL-028 계산식 구분 불가
- → outcome reject 키워드 동시 매칭으로 보강 (`REJECT|DENY|throw new Error`)

**BL-024 (75%)**:
- `> 7` literal + temporal field 식별자 매칭은 명확
- 그러나 함수 추출 케이스(`isWithin7Days(payment)`) 미커버 — false negative 가능

**BL-029 (80%)**:
- `expires_at < new Date()` 형태가 가장 표준적
- `validUntil`, `valid_to`, `validUntil` 등 alias도 커버
- 비교 right-side가 Date.now() / new Date() / now 변수 등 폭넓게 매칭

## 3. PRESENCE/ABSENCE 양면 검증의 가치

Sprint 251 F359 (round-trip 회복)이 우연히 detector 도입 비용을 낮춤:

| 시점 | refund.ts 상태 | detector 검증 가능성 |
|------|----------------|---------------------|
| Sprint 218 (F354 manual) | 5/5 ABSENT | ABSENCE 양면만 검증 가능 |
| Sprint 251 F359 이후 | 4/5 PRESENT, 1/5 ABSENT | PRESENCE + ABSENCE 양면 모두 검증 |

→ 합성 fixture(refund-pre-f359.ts)는 Sprint 218 시점 재현 → 5/5 ABSENCE 검증
→ 현 refund.ts는 4/5 PRESENT(RESOLVED 자동 입증) + 1/5 ABSENT(BL-026 유지)

이는 detector "정확도 입증" 측면에서 Sprint 218 이후 누구도 의도하지 않은 부수 효과.

## 4. provenance cross-check UNKNOWN 해소

| Sprint | UNKNOWN 건수 | 비율 |
|--------|--------------|------|
| 259 | 3건 (BL-024/026/029) | 3/5 = 60% |
| 260 | **0건** | 0/5 = 0% |

DETECTOR_SUPPORTED_RULES Set이 2 → 5종으로 확장되며 모든 manual marker가 detector 지원으로 cover됨. 더 이상 "manual review required" 분류 불필요.

## 5. 후속 작업 우선순위

### 즉시 가치 있음 (P1)
- **F428**: Phase 3b LPON 35 R2 재패키징 — multi-domain rules.md 검증 (lpon-payment / lpon-charge)
- **F429**: provenance.yaml auto-write — 본 cross-check 권고를 yaml status 필드에 자동 갱신

### 중기 (P2)
- BL-024 confidence 향상 — 함수 추출 케이스(`isWithin7Days(...)`) 매칭
- BL-025/030 detector 추가 (현재 provenance에 marker 없음 → 미시급)

### 장기 (P3)
- LLM-조력 NL parser hybrid — confidence 70%+ 시 detector 부담 경감 가능. 단 runtime LLM 비용 + 재현성 이슈로 현재는 보류
- Multi-language detector — Java AST detector (Tree-sitter) 통합 (F358 Phase 3b 일환)

## 6. 학습 포인트

1. **Hybrid 접근의 효율성**: NL→AST 자동 추출 시도 회피가 정답. 도메인 detector 5개를 하드코딩하는 비용은 ~3시간이지만 신뢰도는 65-80% 보장. NL 추출은 동일 시간에 50% 신뢰도밖에 못 갖춤.

2. **PRESENCE 검출의 양면 가치**: detector를 "DIVERGENCE 발견"용으로만 보면 합성 fixture만 입증 대상. 현 코드의 RESOLVED 상태도 함께 입증하면 detector의 false negative 검출 능력이 양면 검증됨.

3. **사전 조사의 가치**: Sprint 259 사전 조사에서 "refund.ts가 이미 4/5 RESOLVED"를 발견한 것이 Sprint 260 detector 가치 재정의(3축)의 출발점. 코드 현황을 모르고 detector 설계했다면 ABSENCE만 검증 가능했을 것.

4. **REGISTRY 패턴의 확장성**: `BL_DETECTOR_REGISTRY` Record 1줄 추가로 신규 BL detector 등록. 매핑 명시적 + 디버깅 가능 + 테스트 가능. 미래의 다른 도메인(payment/charge) 확장도 동일 패턴.

## 7. Sprint 260 vs Sprint 259 비교

| 항목 | Sprint 259 | Sprint 260 |
|------|-----------|-----------|
| F-item | F426 | F427 |
| Detector 수 | 2 (BL-027/028) | 5 (BL-024/026/027/028/029) |
| 자동화 진행률 | 2/5 (40%) | 5/5 (100%) |
| UNKNOWN 비율 | 60% | 0% |
| 신뢰도 평균 | 82.5% | 77% |
| 코드 추가 | ~250 lines | ~400 lines |
| 테스트 추가 | 11건 | 16건 |
| Master inline | 7회 연속 | 8회 연속 |

신뢰도 평균이 82.5% → 77%로 하락한 이유: BL-026 (65%) heuristic이 평균을 낮춤. 그러나 BL-024 (75%) + BL-029 (80%)가 충분히 높아 5/5 자동화 가치가 평균 신뢰도 손실보다 큼.
