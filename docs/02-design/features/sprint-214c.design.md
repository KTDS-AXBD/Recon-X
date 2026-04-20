---
sprint: 214c
title: Track A Fill — 선물 + 정산 (Design)
req: AIF-REQ-035
phase: 2-D3
created: 2026-04-20
status: in_progress
---

# Sprint 214c Design — Track A Fill: 선물 + 정산

## §1 방법론: Phase 1 충전 방법론 재활용

`lpon-charge` Phase 1에서 검증된 4계층 구조를 동일하게 적용한다.

```
[소스 원장 분석] → [Empty Slot 식별] → [BL condition/criteria/outcome 정의] → [테스트 계약 + 운영 가이드]
```

Source-First 3종 마커:
- `SOURCE_MISSING`: 소스에 존재하나 문서 없음 → 소스 추정 기반 Fill
- `DOC_ONLY`: 문서에 존재하나 소스 확인 불가 → 문서 기반 Fill + 경고 표시
- `DIVERGENCE`: 소스 ↔ 문서 충돌 → 소스 우선, 차이 기록

## §2 선물(Gift) 도메인 설계

### 2.1 도메인 특성

선물하기는 LPON 전자상품권의 P2P 이전 서비스:
- 발송자(Sender)가 잔액에서 선물 금액 차감 → 수신자(Recipient)가 수락 시 잔액 이전
- 미수락 선물은 TTL(Time-To-Live) 만료 후 발송자 환원
- 수락 전 발송자 취소 가능 (수락 후는 불가)
- Source 마커: `SOURCE_MISSING` (pilot-lpon-cancel 문서에 선물 시나리오 없음 — 42 정책은 db-policy에만 존재)

### 2.2 추정 데이터 모델

```sql
-- gift_transactions (선물 원장)
gift_id          VARCHAR PK
sender_user_id   VARCHAR NOT NULL
receiver_user_id VARCHAR NOT NULL
amount           DECIMAL(15,2) NOT NULL
status           ENUM('pending','accepted','rejected','expired','canceled')
created_at       TIMESTAMP
expires_at       TIMESTAMP   -- TTL: 생성 후 N일
accepted_at      TIMESTAMP
message          TEXT

-- gift_ledger_entries (잔액 이동 원장)
entry_id         VARCHAR PK
gift_id          VARCHAR FK
entry_type       ENUM('debit_sender','credit_receiver','refund_sender')
amount           DECIMAL(15,2)
executed_at      TIMESTAMP
```

### 2.3 Empty Slot 상세 설계

#### ES-GIFT-001: 선물 수락 만료 처리
- **유형**: E4 (Exception Handling)
- **트리거**: TTL 만료 스케줄러 또는 선물 조회 시 만료 감지
- **규칙**:
  - condition: `gift_transactions.expires_at < NOW()` AND `status = 'pending'`
  - criteria: 수신자 미수락 확인
  - outcome: `status → 'expired'` + `gift_ledger_entries` debit 취소 + 발송자 잔액 복원
  - 이벤트: `GiftExpired`

#### ES-GIFT-002: 선물 발송 취소 가능 시점
- **유형**: E5 (Tacit Rule)
- **규칙**:
  - condition: 발송자가 선물 취소 요청
  - criteria: `status = 'pending'` (수락 전) → 취소 가능 / `status = 'accepted'` → 취소 불가
  - outcome: 취소 가능 시 `status → 'canceled'` + 발송자 잔액 즉시 복원
  - exception: 수락 후 취소 요청 → HTTP 422 + `GIFT_ALREADY_ACCEPTED`

#### ES-GIFT-003: 선물 잔액 이전 원자성
- **유형**: E3 (Reconcile)
- **규칙**:
  - condition: 수신자 선물 수락
  - criteria: 발송자 잔액 차감 + 수신자 잔액 증가가 단일 트랜잭션
  - outcome: `gift_ledger_entries` 2행 원자 삽입 (debit_sender + credit_receiver)
  - exception: 수신자 잔액 증가 실패 시 발송자 차감 롤백 + `GiftTransferFailed` 이벤트

## §3 정산(Settlement) 도메인 설계

### 3.1 도메인 특성

BATCH_004 주도의 배치 정산 프로세스 (BL-031~036):
- 충전/환불/결제 거래 집계 → `settlement_summaries` 갱신
- 수수료 반영 여부(`feeReflected`: Y/N) 분기 미정의 → ES-SETTLE-002
- 배치 재시작 멱등성 미정의 → ES-SETTLE-001, ES-SETTLE-003
- Source 마커: `DOC_ONLY` (BL-031~036 문서 기반, 소스 직접 확인 불가)

### 3.2 데이터 모델 (BL 기반)

```sql
-- calculations (정산 계산 원장)
calc_id          VARCHAR PK
period_start     DATE NOT NULL
period_end       DATE NOT NULL
calc_status      ENUM('pending','running','completed','failed')
fee_reflected    CHAR(1)   -- 'Y' or 'N'
batch_run_id     VARCHAR   -- 배치 실행 ID (멱등성 키)
created_at       TIMESTAMP

-- calculation_transactions (정산 거래 내역)
calc_tx_id       VARCHAR PK
calc_id          VARCHAR FK
tx_type          ENUM('charge','refund','payment')
amount           DECIMAL(15,2)
processed        BOOLEAN DEFAULT false
```

### 3.3 Empty Slot 상세 설계

#### ES-SETTLE-001: 정산 배치 멱등성
- **유형**: E4 (Exception Handling)
- **규칙**:
  - condition: 동일 기간(`period_start`~`period_end`)으로 BATCH_004 재실행
  - criteria: `calculations`에 동일 기간 + `calc_status != 'failed'` 레코드 존재 여부
  - outcome: 기존 `completed` 존재 시 → 스킵 + `BatchSkipped` 이벤트
  - 신규 `batch_run_id` 생성 → 이전 failed 건만 재처리 (upsert)
  - exception: 실행 중(`running`) 배치 감지 시 → 대기 후 재확인 (10분 interval)

#### ES-SETTLE-002: 정산수수료 반영 여부 결정 기준
- **유형**: E5 (Tacit Rule)
- **규칙**:
  - condition: 수수료 산출 시 (BL-036)
  - criteria: `calculations.fee_reflected = 'Y'` → 수수료 금액 차감 후 정산 / `'N'` → 수수료 제외 전액 정산
  - outcome: 'Y' 시 `수수료율(feeRate) × 거래금액` 산출 후 `settlement_summaries.net_amount` 반영
  - exception: `fee_reflected`가 NULL or 이외 값 → `INVALID_FEE_FLAG` 에러, 배치 중단

#### ES-SETTLE-003: 배치 실패 후 부분 재처리 범위
- **유형**: E4 (Exception Handling)
- **규칙**:
  - condition: BATCH_004 실행 중 장애 발생 (DB 오류, 타임아웃 등)
  - criteria: `calculation_transactions.processed = false` 인 미처리 건만 재처리 대상
  - outcome: `batch_run_id` 재사용 불가 → 신규 run_id 생성, `processed=false` 건 순차 처리
  - exception: 모든 건이 `processed=true`이면 이미 완료 → ES-SETTLE-001 멱등성 경로로 이관

## §4 파일 매핑 (Worker 매핑)

단일 구현 (Worker 분리 없음 — 파일 시스템 레벨 YAML/MD 생성):

| 파일 | 역할 | 내용 |
|------|------|------|
| `lpon-gift/provenance.yaml` | 출처 추적 | SOURCE_MISSING 마커, 신뢰도 0.72 |
| `lpon-gift/rules/gift-rules.md` | BL 전체 표 | 추정 BL-G001~G008 |
| `lpon-gift/rules/ES-GIFT-{001~003}.md` | Empty Slot 규칙 | condition/criteria/outcome |
| `lpon-gift/tests/ES-GIFT-{001~003}.yaml` | 테스트 계약 | given/when/then 시나리오 |
| `lpon-gift/tests/contract/gift-contract.yaml` | 도메인 계약 | FX-SPEC-002 바인딩 |
| `lpon-gift/runbooks/ES-GIFT-{001~003}.md` | 운영 가이드 | 수동 조치 절차 |
| `lpon-settlement/provenance.yaml` | 출처 추적 | DOC_ONLY 마커, 신뢰도 0.85 |
| `lpon-settlement/rules/settlement-rules.md` | BL-031~036 표 | 원본 + 보완 |
| `lpon-settlement/rules/ES-SETTLE-{001~003}.md` | Empty Slot 규칙 | condition/criteria/outcome |
| `lpon-settlement/tests/ES-SETTLE-{001~003}.yaml` | 테스트 계약 | given/when/then 시나리오 |
| `lpon-settlement/tests/contract/settlement-contract.yaml` | 도메인 계약 | FX-SPEC-002 바인딩 |
| `lpon-settlement/runbooks/ES-SETTLE-{001~003}.md` | 운영 가이드 | 배치 운영 절차 |

## §5 AI-Ready 6기준 자기평가 (예상)

| 기준 | 선물(Gift) | 정산(Settlement) |
|------|:----------:|:----------------:|
| 1. 완결성 (condition/criteria/outcome 완비) | ✅ | ✅ |
| 2. 명확성 (모호한 표현 없음) | ✅ | ✅ |
| 3. 실행 가능성 (SQL/코드 힌트 포함) | ✅ | ✅ |
| 4. 테스트 가능성 (TC 3건 이상) | ✅ | ✅ |
| 5. 출처 추적성 (마커 명시) | ✅ SOURCE_MISSING | ✅ DOC_ONLY |
| 6. 운영 연속성 (runbook 존재) | ✅ | ✅ |

예상 통과: 6/6 (100%) — 목표 70% 초과
