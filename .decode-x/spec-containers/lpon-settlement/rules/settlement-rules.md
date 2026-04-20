# Spec Container — POL-LPON-SETTLE-001 (온누리상품권 정산 규칙)

**Skill ID**: POL-LPON-SETTLE-001
**Domain**: LPON 정산 (Settlement Batch Processing)
**Source**: DOC_ONLY — `반제품-스펙/pilot-lpon-cancel/01-business-logic.md §시나리오6`
**Version**: 1.0.0
**Status**: draft

---

## 비즈니스 룰 (BL-031 ~ BL-036)

| ID | condition (When) | criteria (If) | outcome (Then) | exception (Else) | 원본 정책 코드 |
|----|-----------------|---------------|----------------|-----------------|--------------|
| BL-031 | 충전 또는 환불 거래 발생 시 | 충전 건수, 금액, 할인금액, 환불 건수, 금액, 수수료 집계 | 충전/환불 내역 집계하여 `settlement_summaries` 갱신 | 거래 0건 시 집계 생략 | POL-PENSION-CT-410 |
| BL-032 | 포인트 충전 또는 환불 거래 발생 시 | 포인트 충전 건수/금액, 환불 건수/금액 집계 | 포인트 충전/환불 현황을 `settlement_summaries`에 집계 | 거래 0건 시 집계 생략 | POL-PENSION-CT-412 |
| BL-033 | BATCH_004 실행 시 | 스케줄 또는 수동 실행 | `calculations`, `calculation_transactions` 조회 후 반복 갱신 | 배치 실패 시 알림 발송 (ES-SETTLE-001, 003) | POL-PENSION-CL-005 |
| BL-034 | 계산 데이터 처리 필요 시 | `calculations`, `calculation_transactions` 존재 | 거래 데이터 반복 처리 후 두 테이블 갱신 | 데이터 미존재 시 스킵 | POL-PENSION-CL-014 |
| BL-035 | 특정 기간 산정 점검 데이터 조회 요청 시 | 기간 파라미터 유효 | 해당 기간 산정 점검 데이터 반환 | 기간 파라미터 무효 → 에러 | POL-PENSION-CL-418 |
| BL-036 | 수수료 산출 시 | `fee_reflected IN ('Y', 'N')` **[Fill: ES-SETTLE-002]** | Y → 수수료 차감 후 정산 / N → 전액 정산 | NULL 또는 이외 값 → `INVALID_FEE_FLAG` 에러 | POL-PENSION-CL-192 |

---

## 데이터 영향

- **변경 테이블**: `calculations`, `calculation_transactions`, `settlement_summaries`
- **이벤트 발행**: `SettlementCalculated`, `BatchCompleted`, `BatchFailed`, `BatchSkipped`

## 엣지 케이스

- 배치 실행 중 장애 → 중단 지점부터 재시작 필요 (ES-SETTLE-001: 멱등성)
- 동일 기간 중복 배치 실행 → upsert (ES-SETTLE-001 제어)
- 정산수수료 반영 여부 변경 → 이미 산출된 건 재계산 필요 (ES-SETTLE-002)
- 부분 처리 후 배치 중단 → 미처리 건만 재처리 (ES-SETTLE-003)

## API / 배치

- 배치 실행: BATCH_004 (내부 스케줄러)
- 수동 조회: `GET /settlement/check?from=YYYY-MM-DD&to=YYYY-MM-DD`
- 배치 수동 실행: 관리자 API 또는 Cron 직접 트리거
