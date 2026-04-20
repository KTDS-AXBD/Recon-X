# ES-SETTLE-002: 정산수수료 반영 여부 결정 기준

**Empty Slot ID**: ES-SETTLE-002
**유형**: E5 (Tacit Rule)
**우선순위**: High
**Sprint**: 214c (Fill)
**Source 마커**: DOC_ONLY (BL-036 "[미정의]" 직접 Fill)

---

## 빈 슬롯 설명

BL-036("수수료 산출 시 fee_reflected Y/N으로 결정")은 판단 결과만 정의하며,
- **무엇이 `fee_reflected` 값을 결정하는가** (설정 주체, 변경 권한, 변경 시점)
- **Y/N 외 값(NULL, 공백)** 처리 방법
- **기존 `completed` 건에 수수료 기준 변경 시 재계산 범위**

가 모두 "[미정의]"로 공백이다.

---

## 규칙 정의

### condition (When)
BATCH_004 수수료 산출 단계 실행 시 (BL-036).

### criteria (If)
`calculations.fee_reflected` 필드 값 판정:
- `'Y'` → 수수료 반영
- `'N'` → 수수료 미반영
- `NULL` / `''` / 이외 값 → 에러 처리

### outcome (Then)
**`fee_reflected = 'Y'`**:
```
net_amount = gross_amount - (gross_amount × fee_rate)
fee_amount = gross_amount × fee_rate
```
`settlement_summaries.net_amount`, `fee_amount` 갱신.

**`fee_reflected = 'N'`**:
```
net_amount = gross_amount
fee_amount = 0
```

`fee_rate` 출처: `calculations.fee_rate` 컬럼 (배치 실행 시 파라미터로 주입 또는 시스템 설정 기본값).

### exception (Else)
`fee_reflected = NULL` 또는 이외 값:
→ `INVALID_FEE_FLAG` 에러 + 해당 배치 건 스킵 + `BatchItemFailed` 이벤트
→ 전체 배치 중단 아님 (건별 스킵 후 계속)

**기존 completed 건 재계산** (운영팀 요청 시):
- `fee_reflected` 변경 후 해당 기간 배치 재실행
- ES-SETTLE-001 멱등성 규칙: `calc_status = 'completed'` → SKIP
- 재계산을 위해서는 `calc_status → 'failed'` 수동 리셋 후 재실행 (관리자 권한)

---

## 구현 힌트

```sql
-- 수수료 산출
SELECT fee_reflected, fee_rate FROM calculations WHERE calc_id = :calcId;

-- fee_reflected 유효성 체크
IF fee_reflected NOT IN ('Y', 'N') THEN
  -- INVALID_FEE_FLAG 에러 기록, 건 스킵
  INSERT INTO batch_errors (calc_id, error_code, detail) VALUES (:id, 'INVALID_FEE_FLAG', :feeReflected);
END IF;

-- 수수료 계산
net_amount = CASE
  WHEN fee_reflected = 'Y' THEN gross_amount * (1 - fee_rate)
  ELSE gross_amount
END;

UPDATE settlement_summaries
SET net_amount = :netAmount, fee_amount = :feeAmount
WHERE calc_id = :calcId;
```

- `fee_rate`: Decimal(5,4) — 예: 0.0150 = 1.5%
- 기본값: 시스템 설정 `SETTLEMENT_FEE_RATE` (운영팀 관리)
- 변경 권한: 운영팀 관리자 (감사 로그 필수)
