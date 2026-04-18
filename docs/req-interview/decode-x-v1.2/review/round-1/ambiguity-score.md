# Ambiguity Score — Round 1 (Brownfield, v1.2 PRD)

**채점 일시**: 2026-04-18
**PRD**: docs/req-interview/decode-x-v1.2/prd-v1.md
**프로젝트 유형**: Brownfield (기존 Decode-X 프로토타입 Sprint 208, AIF-REQ-034 진행 중)

## 4차원 Clarity 채점

| Dimension | Clarity | Weight | Score | 근거 |
|-----------|:-------:|:------:|:-----:|------|
| **Goal** | 0.95 | 0.35 | 0.3325 | §1.5 Mission Pivot 명확 선언, §1.3 목적 1문장 정의. "Copy Machine 폐기 → AI-Centric 체질 전환"으로 단일 목표축 정립. 단 "체질 전환" 자체는 조직·프로세스 지표로 환산 필요 |
| **Constraint** | 0.75 | 0.25 | 0.1875 | §2.3 Out-of-scope 명시, §7 리스크 14종, §12 마이그레이션 계획 Phase 0~4 존재. 단 (a) LLM 비용 예산 상한, (b) 프라이빗 모델 옵션 구체성, (c) 규제 준수(금융권) 요건이 상대적으로 모호 |
| **Success** | 0.85 | 0.25 | 0.2125 | §2.2 KPI 13종 정량화 (Tier-A 95%, Empty Slot Fill 70%, Input Completeness 0.75 등). 단 (a) Empty Slot 정량 측정 공식(§2.5) 추상, (b) Reviewer Efficiency ≤2분이 공격적이며 검증 미흡 |
| **Context** | 0.80 | 0.15 | 0.1200 | §12 Decode-X 프로토타입 Sprint 208 현황 언급, §13 Foundry-X Phase 46 Sprint 308 통합 분석 상세. 단 (a) AIF-REQ-034/026과 본 v1.2의 범위 중첩·분리 정의 미흡, (b) prototype → v1.1 Harness 전환의 호환성 영향 구체성 부족 |
| **Total** | | | **0.8525** | |

**Ambiguity = 1 − 0.8525 = 0.1475** → **≤ 0.2 (Ready)**

## 해석

PRD 자체의 모호성은 낮음(0.15). 주요 불명확 포인트는 **구체적 구현 접근**이 아니라 **조직/경영 의사결정**(예산/MoU/규제) 영역. 이는 PRD 개선만으로 해소되지 않으며, Phase 0 준비 단계의 실제 액션 아이템에 해당.

## 통합 판정 (Phase 4-C)

| 항목 | 값 | 기준 | 상태 |
|------|------|------|------|
| Scorecard | 76 / 100 | ≥ 80 | ❌ 미달 |
| Ambiguity | 0.15 | ≤ 0.2 | ✅ 통과 |

**종합 판정**: **❌ 미달 — 추가 인터뷰/개선 라운드 필요**

스코어카드 미달 원인:
- 항목 3 (핵심 요소 커버리지 19/30): 사용자/이해관계자, 핵심 기능 범위, Out-of-scope, KPI/성공 기준, MVP 기준이 "최소" 판정
- 항목 4 (다관점 반영 17/20): 사용자 관점 최소

→ 사용자/MVP 정의가 더 필요. 단 Ambiguity가 낮다는 것은 **"근본적 재인터뷰"는 불필요**하고, **타겟 보강(Phase 3 apply)만으로도 80점 돌파 가능**함을 시사.
