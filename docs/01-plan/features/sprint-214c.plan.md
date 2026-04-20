---
sprint: 214c
title: Track A Fill — 선물 + 정산
req: AIF-REQ-035
phase: 2-D3
created: 2026-04-20
status: in_progress
---

# Sprint 214c Plan — Track A Fill: 선물 + 정산

## 목표

Phase 2 Track A (양적 커버리지) 세 번째 분할.
LPON 전자온누리상품권 **선물(Gift)** 서비스와 **정산(Settlement)** 서비스의
Empty Slot을 소스 원장 기반으로 Fill하여 Handoff-ready 스펙 컨테이너를 완성한다.

병렬 실행: `sprint-214a`(예산+구매) ∥ `sprint-214b`(결제+환불) ∥ `sprint-214c`(선물+정산)

## 스코프

| 도메인 | 컨테이너 경로 | 목표 ES 수 |
|--------|-------------|:----------:|
| LPON 선물 | `.decode-x/spec-containers/lpon-gift/` | 3건 |
| LPON 정산 | `.decode-x/spec-containers/lpon-settlement/` | 3건 |

## 선물(Gift) 도메인 분석

### 소스 현황
- SPEC.md §2: `/gift/*` API 엔드포인트군 42개 정책, "미문서화" 마커
- `반제품-스펙/pilot-lpon-cancel/`: 선물 시나리오 **미포함** (충전/결제/환불/정산만 존재)
- Source-First 마커: `SOURCE_MISSING` (문서 부재, 소스 추정 기반 Fill)

### 핵심 비즈니스 흐름 (추정)
```
선물 발송 → 수신자 수락/거절 → 잔액 이전 → 만료/취소 처리
```

### Fill 대상 Empty Slot (3건)
| ID | 제목 | 유형 | 근거 |
|----|------|:----:|------|
| ES-GIFT-001 | 선물 수락 만료 처리 (미수락 선물 반환) | E4 | 수신자가 일정 기간 내 미수락 시 발송자 환원 규칙 없음 |
| ES-GIFT-002 | 선물 발송 취소 가능 시점 기준 | E5 | 수신자 수락 전/후 취소 분기 규칙 미정의 |
| ES-GIFT-003 | 선물 잔액 이전 시 원장 동시성 처리 | E3 | 발송자 잔액 차감 + 수신자 잔액 증가 원자성 규칙 없음 |

## 정산(Settlement) 도메인 분석

### 소스 현황
- `반제품-스펙/pilot-lpon-cancel/01-business-logic.md` 시나리오 6: BL-031~036 존재
- 빈 슬롯: BL-033(배치 재시작), BL-036([미정의] 수수료 기준)
- Source-First 마커: `DOC_ONLY` (비즈니스 로직 문서 존재, 소스 직접 확인 불가)

### Fill 대상 Empty Slot (3건)
| ID | 제목 | 유형 | 근거 |
|----|------|:----:|------|
| ES-SETTLE-001 | 정산 배치 멱등성 (중복 실행 방지) | E4 | BL-033: "배치 실패 시 알림" 있으나 중복 실행 방지 규칙 없음 |
| ES-SETTLE-002 | 정산수수료 반영 여부 결정 기준 | E5 | BL-036: "[미정의]" — condition 없는 판단 기준 공백 |
| ES-SETTLE-003 | 배치 실패 후 부분 재처리 범위 | E4 | BL-033: 재시작 가능 언급 있으나 재시작 지점 결정 로직 없음 |

## KPI

| 지표 | 목표값 |
|------|:------:|
| 완결성 (B/T/Q Spec) | ≥ 95% |
| AI-Ready 6기준 통과율 | ≥ 70% |
| 소스 출처 추적성 | 100% |
| Empty Slot Fill 수 | 6건 (선물 3 + 정산 3) |

## 의존성

- Sprint 214a, 214b와 병렬 — D1 migration 충돌 없음
- 결제 Fill(214b) 완료가 Sprint 215 E2E 선행 조건 (214c는 해당 없음)
- `lpon-charge` 패턴 재사용 (Phase 1 "충전 방법론")

## 산출물

```
.decode-x/spec-containers/
├── lpon-gift/
│   ├── provenance.yaml
│   ├── rules/
│   │   ├── gift-rules.md         # 선물 도메인 전체 BL 표
│   │   ├── ES-GIFT-001.md
│   │   ├── ES-GIFT-002.md
│   │   └── ES-GIFT-003.md
│   ├── tests/
│   │   ├── ES-GIFT-001.yaml
│   │   ├── ES-GIFT-002.yaml
│   │   ├── ES-GIFT-003.yaml
│   │   └── contract/gift-contract.yaml
│   └── runbooks/
│       ├── ES-GIFT-001.md
│       ├── ES-GIFT-002.md
│       └── ES-GIFT-003.md
└── lpon-settlement/
    ├── provenance.yaml
    ├── rules/
    │   ├── settlement-rules.md   # 정산 도메인 전체 BL 표
    │   ├── ES-SETTLE-001.md
    │   ├── ES-SETTLE-002.md
    │   └── ES-SETTLE-003.md
    ├── tests/
    │   ├── ES-SETTLE-001.yaml
    │   ├── ES-SETTLE-002.yaml
    │   ├── ES-SETTLE-003.yaml
    │   └── contract/settlement-contract.yaml
    └── runbooks/
        ├── ES-SETTLE-001.md
        ├── ES-SETTLE-002.md
        └── ES-SETTLE-003.md
```
