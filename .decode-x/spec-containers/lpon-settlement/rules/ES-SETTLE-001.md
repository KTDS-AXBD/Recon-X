# ES-SETTLE-001: 정산 배치 멱등성 (중복 실행 방지)

**Empty Slot ID**: ES-SETTLE-001
**유형**: E4 (Exception Handling)
**우선순위**: High
**Sprint**: 214c (Fill)
**Source 마커**: DOC_ONLY

---

## 빈 슬롯 설명

BL-033("BATCH_004 실행 → 데이터 반복 갱신")은 정상 실행 흐름만 정의하며,
동일 기간(`period_start`~`period_end`)으로 BATCH_004를 재실행할 때의
**중복 방지 규칙**과 **실행 중인 배치 감지 로직**이 없다.

**위험**: 정산 배치 중복 실행 → `settlement_summaries` 이중 집계 → 정산 금액 오류.

---

## 규칙 정의

### condition (When)
BATCH_004가 동일 `period_start`~`period_end` 기간으로 실행 요청 시.

### criteria (If)
`calculations` 테이블에서 동일 기간 레코드 존재 여부 및 상태 확인:
- `calc_status = 'running'` 존재 → 이미 실행 중
- `calc_status = 'completed'` 존재 → 이미 완료됨
- `calc_status = 'failed'` 또는 없음 → 실행 가능

### outcome (Then)
- `calc_status = 'running'`: 10분 대기 후 재확인, 3회 초과 시 알림 + 중단
- `calc_status = 'completed'`: `BatchSkipped` 이벤트 발행 후 정상 종료
- `calc_status = 'failed'` / 없음: 신규 `batch_run_id` 생성 후 실행 진행

### exception (Else)
- `calc_status = NULL` 또는 예상 외 값 → `INVALID_BATCH_STATE` 에러, 배치 중단 + 알림

---

## 구현 힌트

```sql
-- 배치 시작 시 중복 체크
SELECT calc_id, calc_status, batch_run_id
FROM calculations
WHERE period_start = :periodStart
  AND period_end = :periodEnd
FOR UPDATE;

-- 결과에 따른 분기:
-- calc_status = 'running'  → WAIT 10분 후 재조회 (최대 3회)
-- calc_status = 'completed' → SKIP (BatchSkipped 이벤트)
-- calc_status = 'failed' or 없음 → 신규 batch_run_id UUID 생성 후 실행

-- 배치 시작 마킹 (신규 실행)
INSERT INTO calculations (period_start, period_end, calc_status, batch_run_id, created_at)
VALUES (:start, :end, 'running', :newRunId, NOW())
ON CONFLICT (period_start, period_end) DO UPDATE
SET calc_status = 'running', batch_run_id = :newRunId;
```

- `batch_run_id`: UUID v4, 배치 실행 인스턴스 식별
- `(period_start, period_end)` UNIQUE 인덱스 필수
- 완료 시: `UPDATE calculations SET calc_status = 'completed' WHERE batch_run_id = :runId`
