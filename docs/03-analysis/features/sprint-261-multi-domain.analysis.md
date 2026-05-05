---
id: AIF-ANLS-059
title: "F428 — Multi-domain parser 검증 분석"
sprint: 261
f_items: [F428]
plan_ref: AIF-PLAN-059
design_ref: AIF-DSGN-059
status: DONE
created: "2026-05-05"
session: 273
author: "Master inline"
---

# F428 분석 — Multi-domain parser + Domain-source 매핑

## 1. 사전 조사 vs 실측 비교

| 항목 | 사전 조사 (예상) | 실측 결과 | 일치 여부 |
|------|-----------------|----------|----------|
| 7 spec-containers BL 총합 | 38 | 38 | ✅ 정확 |
| gift `BL-G001` prefix 매칭 | parser 보강 필요 | 보강 후 6 BLs 추출 | ✅ |
| settlement 6-column row | 코드 변경 불필요 (현 parser 통과) | 6 BLs 추출 PASS | ✅ |
| BL_DETECTOR_REGISTRY 적용성 | refund 단독 5종 매칭 | 5/38 = 13.2% | ✅ |
| BL-027 false positive | mock/helper 함수 false positive 우려 | mockDepositApi.requestDeposit 잡힘 → DOMAIN_MAP `underImplTargets` 보강 | ⚠️ 발견 |

## 2. 핵심 발견

### 발견 1: Parser regex 1회 보강으로 multi-prefix 지원
- 변경 비용: 정규식 1줄 (`/^BL-\d{3}$/` → `/^BL-[A-Z]?\d{1,3}$/`)
- 회귀 risk 0: refund 11/charge 8/payment 7/settlement 6 모두 호환
- 단점: regex가 약간 느슨해져 `BL-Z999` 같은 미래 패턴도 통과 — 의도된 trade-off

### 발견 2: BL-027 detector multi-domain 적용 시 false positive
- 원인: `targetFunctionNames` 옵션 미지정 시 모든 함수 검사 → mock/helper 짧은 함수 잡힘
- 해결: `DOMAIN_MAP.underImplTargets` 도메인별 화이트리스트 추가
- 구조적 의의: detector 옵션도 도메인별로 다른 게 자연 — registry pattern + per-domain config 결합

### 발견 3: detector 5/38 = 13.2% 커버리지 한계 정량화
- refund 단독 detector는 도메인 specific 패턴 (7일 윈도/캐시백/만료/exclusion/under-impl)
- 다른 도메인 BL과 ID 충돌 없음 (charge BL-005 ≠ refund BL-005 의미) → 매핑 그대로 안전
- 근본 한계: refund 외 BL은 매핑 없음. 후속 detector 도입 필요

### 발견 4: 후속 보편적 detector 3종 도입 시 47.4% 커버 가능
- Threshold check (6 BL): charge BL-005~008, payment BL-015, settlement BL-036
- Status transition (5 BL): gift BL-G002~G005, payment BL-014
- Atomic transaction (2 BL): gift BL-G006, refund BL-022
- 추가 도입 시 5종 detector × 7종 도메인 적용 + Sprint 263 후속

## 3. spec-only 도메인의 의미

7 containers 중 **4종(gift/settlement/budget/purchase)이 source 부재** spec-only 상태.

| 도메인 | spec 상태 | source 작성 가능성 |
|--------|----------|------------------|
| gift | rules.md + tests + ES specs 모두 존재 | YES (PoC 진행 가능) |
| settlement | rules.md + tests + ES specs 존재 | YES (production specific 패턴 多) |
| budget | rules.md 부재 + ES만 존재 | 보류 (PoC 자료 부족) |
| purchase | rules.md 부재 + ES만 존재 | 보류 |

→ **gift/settlement source 작성**은 detector 적용 + DIVERGENCE 검출 + provenance.yaml `divergenceMarkers` 발행으로 이어지므로 향후 가치 있음. 단, scope creep 우려로 별도 Sprint 결정 필요.

## 4. detector coverage 정량 시나리오

### 현재 (Sprint 261 종료 시점)
- Detector: 5종 (refund 도메인 specific)
- 적용 가능 BL: 11/38 (refund 11)
- 실 적용: 5/11 = 45.5%
- 전체 coverage: 5/38 = **13.2%**

### Sprint 263 시나리오 (보편 3종 도입)
- 신규 detector: 3종 (Threshold/Status transition/Atomic transaction)
- 추가 커버: 13 BL
- 전체 coverage: 18/38 = **47.4%**

### Sprint 264+ 시나리오 (보편 5종 추가)
- 신규 detector: 5종 (Timeout retry/External API/Batch trigger/Validation/Event emission)
- 추가 커버: 12 BL
- 전체 coverage: 30/38 = **78.9%**

### 한계 (도메인 specific 잔여)
- charge BL-001~003, payment BL-016~018, settlement BL-031/032/034/035
- 잔여 8 BL은 도메인별 hand-coded detector 필요
- cost/value 분석 후 선별 도입

## 5. Sprint 260 → Sprint 261 연속성

| 항목 | Sprint 260 (F427) | Sprint 261 (F428) |
|------|------------------|------------------|
| 도메인 | refund 단독 | 7 containers (5 active + 2 no-BL) |
| BL 수 | 11 | 38 |
| Detector 수 | 5 (refund specific) | 5 (변경 없음) |
| Detector coverage | 5/11 = 45.5% (refund 도메인 내) | 5/38 = 13.2% (전체) |
| Parser regex | `/^BL-\d{3}$/` | `/^BL-[A-Z]?\d{1,3}$/` |
| DOMAIN_MAP | 없음 (단일 도메인) | 7 entries (multi-domain) |
| CLI flag | `--rules` | `--all-domains` |
| 신규 코드 | ~400 lines | ~150 lines (재활용 효과) |
| 테스트 추가 | 16건 | 3건 |
| Master inline | 8회 연속 | 9회 연속 |

→ F427 인프라 재활용 효과 큼. 신규 코드 ~150 lines (parser regex 1줄 + DOMAIN_MAP + runMultiDomain).

## 6. R2 재패키징(Sprint 262) 우선순위 재평가

본 Sprint(261)에서 multi-domain parser 검증 완료. 다음 Phase 3b 작업 후보:

| 후보 | 가치 | risk | 시간 |
|------|------|------|------|
| **Sprint 262 R2 재패키징** | LPON 35 production 흐름 복구, TD-55 해소 | production 작업 (autopilot Production Smoke 14회차 변종 직후) | ~6-8h |
| **Sprint 262 신규 detector 3종** | coverage 13.2% → 47.4% (+34%p) | code-only 안전 | ~6h |
| **Sprint 262 gift source PoC** | 신규 도메인 detector 적용 가능성 입증 | scope creep 우려 | ~8-12h |

→ R2 재패키징은 production 작업이라 신뢰도 우려. 신규 detector 3종 도입이 Master inline + 가치/risk 모두 우수. **Sprint 262 권고 = 보편 detector 3종 도입**.

## 7. 학습 포인트

1. **Parser regex 보강의 비대칭 가치**: 1줄 regex 변경으로 6 BLs 추가 매칭. 보강 비용 ≪ 효과.

2. **Detector 옵션의 도메인 의존성**: BL-027 `targetFunctionNames`처럼 detector마다 도메인별 config 필요. DOMAIN_MAP에 detector-config 함께 보존하는 것이 자연.

3. **Detector coverage 한계의 명시**: 5/38 = 13.2% 자체는 낮지만 "refund 도메인 specific"이라는 의미 명시 + 후속 보편 detector 도입 경로 명확화. 한계도 자산.

4. **spec-only 도메인의 잠재 가치**: gift/settlement는 source 부재로 detector 적용 불가지만, source 작성 PoC 자체가 신규 작업 후보. 단 scope creep 우려.

5. **Sprint 260 → 261 인프라 재활용**: REGISTRY 패턴, parser, detector 모두 재활용 가능. 신규 코드 ~150 lines로 7배 도메인 확장. 인프라 패턴 design의 효과.
