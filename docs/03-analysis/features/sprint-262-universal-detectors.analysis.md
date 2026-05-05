---
id: AIF-ANLS-060
title: "F429 — 보편 detector 3종 분석"
sprint: 262
f_items: [F429]
plan_ref: AIF-PLAN-060
design_ref: AIF-DSGN-060
status: DONE
created: "2026-05-05"
session: 274
author: "Master inline"
---

# F429 분석 — 보편 detector 3종 도입 효과

## 1. 사전 조사 vs 실측

| 항목 | 사전 조사 (예상) | 실측 결과 | 일치 |
|------|----------------|----------|:----:|
| Threshold (charge BL-005~008) | 4 BL PRESENCE | 4 BL RESOLVED | ✅ |
| Threshold (payment BL-015) | 1 BL PRESENCE | 1 BL RESOLVED | ✅ |
| Status transition (payment BL-014) | 1 BL PRESENCE | 1 BL RESOLVED | ✅ |
| Atomic transaction (refund BL-022) | 1 BL PRESENCE | 1 BL RESOLVED | ✅ |
| 합계 detector applications | 12 | 12 | ✅ |
| Coverage 정확도 | 31.6% | 31.6% | ✅ |
| Sprint 261 47.4% 추정의 정정 | spec-only 6 BL 차감 → 31.6% | 정확 | ✅ |

## 2. Sprint 261 47.4% 추정의 정정 의의

Sprint 261 분석에서 보편 3종 도입 시 47.4% 도달 가능성 제안. 본 Sprint 사전 조사로 **6 BL이 source 부재**(gift BL-G002~G006/settlement BL-036) → 실효 31.6%로 정정.

이 차이의 의미:
- "이론적 적용 가능" vs "실효 적용 가능"의 분리
- Detector 작성 비용은 같지만, 효과 측정은 source 존재 여부에 의존
- Sprint 263+ gift/settlement source 작성 PoC 가치 정량화 (+15.8%p coverage)

## 3. withRuleId 패턴의 효과

기존 단일 ruleId 매핑 → withRuleId helper 도입:

```typescript
// Sprint 260: 1 detector → 1 BL
"BL-024": detectTemporalCheck

// Sprint 262: 1 detector → N BL (도메인별 ruleId 부여)
"BL-005": (sf, fn) => withRuleId(detectThresholdCheck(sf, fn), "BL-005"),
"BL-006": (sf, fn) => withRuleId(detectThresholdCheck(sf, fn), "BL-006"),
...
```

이점:
- 코드 중복 회피 (1 detector = 1 구현)
- BL ID로 도메인 구분 유지 (cross-check 정확도 보존)
- 신규 BL 매핑 비용 = 1 줄 추가

## 4. Detector 신뢰도 분포 분석

| Sprint | 평균 신뢰도 | 신뢰도 ≥ 80% detector 수 |
|--------|------------:|-------------------------:|
| 259 (BL-027/028) | 82.5% | 1 (BL-028 95%) |
| 260 (BL-024/026/029) | 73.3% | 1 (BL-028 95%) |
| 262 (Threshold/Status/Atomic) | 76.7% | 2 (BL-028 + Atomic 85%) |

Sprint 262 평균 신뢰도 76.7% — Threshold 70% 때문에 약간 낮으나, Atomic transaction 85%로 보완. 후속 calibration으로 Threshold 75%+ 달성 가능.

## 5. Source-only 도메인의 가치 정량화

| Domain | BLs | source 작성 시 추가 coverage |
|--------|----:|--------------------------:|
| gift | 6 | +5 BLs (G002~G006 status transition + atomic) |
| settlement | 6 | +1 BL (BL-036 threshold) |
| budget | 0 | 0 |
| purchase | 0 | 0 |

→ gift source 작성 시 +5 BL = coverage 12 → 17 = **44.7%**.
→ settlement 추가 시 +1 BL = 17 → 18 = **47.4%** (Sprint 261 추정 도달).

→ gift source 작성이 **단일 가장 효과적인 후속 작업**. 8h 추정 vs +5 BL coverage.

## 6. False positive risk 평가

| Detector | False positive 시나리오 | 완화 방안 |
|----------|------------------------|----------|
| Threshold | `if (count > 0)` 일반 조건 | 함수 내 throw 동시 매칭 (Sprint 263+) |
| Status transition | `status` 변수명 일반 사용 | comparison + assignment 동시 매칭 (이미 적용) |
| Atomic transaction | `tx.transaction()` 명명 충돌 | TX_RECEIVER_PATTERN regex (db/database/tx) |

Threshold detector는 가장 높은 false positive risk. 본 Sprint MVP에서는 변수명 + literal/UPPERCASE_CONSTANT 매칭으로 1차 보호. Sprint 263+ calibration 시 함수 내 throw 동시 매칭 추가.

## 7. Sprint 260 → 261 → 262 누적 분석

| Sprint | F-item | Detector 수 | Coverage | 신규 코드 |
|--------|--------|-----------:|---------:|----------:|
| 260 | F427 | 5 | 5/11 = 45.5% (refund 도메인 내) | ~400 lines |
| 261 | F428 | 5 (변경 없음) | 5/38 = 13.2% (전체) | ~150 lines |
| 262 | F429 | 12 | 12/38 = 31.6% | ~250 lines |

→ Sprint 260 인프라 구축 (대규모) → Sprint 261 multi-domain 확장 (소규모) → Sprint 262 detector 추가 (중규모). 인프라 재활용 효과 누적.

## 8. 후속 작업 우선순위 (Sprint 263+)

### 옵션 A: gift/settlement source 작성 PoC
- 가치: +6 BL coverage (31.6% → 47.4%)
- risk: scope creep (PoC 자체 5-Stage 파이프라인 검증 영역)
- 시간: ~8-12h (gift만) / 12-16h (settlement 포함)

### 옵션 B: Domain-specific detector (Timeout retry/External API/Batch trigger)
- 가치: +3 BL coverage (31.6% → 39.5%)
- risk: 도메인별 specific 패턴이라 재사용성 낮음
- 시간: ~6-8h

### 옵션 C: F429 provenance.yaml auto-write
- 가치: 본 detector 권고를 yaml에 자동 반영 (운영 가치 큼)
- risk: 사용자 검토 없이 yaml 수정 우려 → safety check 필수
- 시간: ~4h

### 옵션 D: LPON 35 R2 재패키징 (원래 Sprint 262 원안)
- 가치: TD-55 해소 + production 흐름 복구
- risk: production 작업 (autopilot Production Smoke 14회차 직후 우려 잔존)
- 시간: ~6-8h

→ Master inline 신뢰 + 가치/risk 비율: **옵션 C (F429 yaml auto-write) 권고**. 4h, code-only, 운영 가치 큼.

## 9. 학습 포인트

1. **사전 조사로 추정치 정정의 가치**: Sprint 261 47.4% 추정 → Sprint 262 31.6% 실효. 추정치 신뢰 시 작업 후 기대 미달성 가능. 사전 조사 1h가 후속 작업 우선순위 재배치 결정.

2. **withRuleId 패턴의 확장성**: 1 detector → N BL 매핑이 향후 multi-domain 확장의 기반. Sprint 263+에서 동일 패턴 재사용 가능.

3. **Source-only 도메인의 잠재 가치**: gift 도메인은 spec 완비 + source만 부재. PoC 작성으로 +5 BL coverage 즉시 달성. scope 결정 필요.

4. **신뢰도 vs coverage trade-off**: Threshold 70% 신뢰도 도입으로 coverage +18.4%p. 신뢰도 향상은 후속 calibration 작업 — 우선순위 결정.
