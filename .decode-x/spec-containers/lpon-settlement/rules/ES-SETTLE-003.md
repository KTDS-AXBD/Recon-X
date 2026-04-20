# ES-SETTLE-003: 배치 실패 후 부분 재처리 범위

**Empty Slot ID**: ES-SETTLE-003
**유형**: E4 (Exception Handling)
**우선순위**: High
**Sprint**: 214c (Fill)
**Source 마커**: DOC_ONLY

---

## 빈 슬롯 설명

BL-033 엣지케이스("배치 실행 중 장애 → 중단 지점부터 재시작 가능")는 재시작 가능성을 언급하나,
- **재시작 지점 결정 기준** (`processed = false` 행 기준인지, 건별 체크포인트인지)
- **부분 처리 후 중단된 배치의 `calc_status` 값** (failed vs. 부분 completed)
- **재처리 시 이미 처리된 건 보호** (이중 집계 방지)

가 명시되지 않았다.

---

## 규칙 정의

### condition (When)
BATCH_004 실행 중 장애(DB 오류, 타임아웃, Worker 충돌) 발생 시.

### criteria (If)
`calculation_transactions.processed` 필드로 처리 완료 여부 판정:
- `processed = false` → 미처리 건 (재처리 대상)
- `processed = true` → 처리 완료 건 (재처리 제외)

`calculations.calc_status` 상태 전이:
- 장애 발생 → `calc_status = 'failed'` + `batch_run_id` 유지

### outcome (Then)
배치 재실행 시:
1. ES-SETTLE-001: `calc_status = 'failed'` 확인 → 실행 가능
2. 신규 `batch_run_id` 생성 (이전 실행 인스턴스와 구분)
3. `calculation_transactions WHERE processed = false AND calc_id = :calcId` 만 처리
4. 처리 완료 건: `processed → true` (배치 항목 단위 즉시 커밋)
5. 전체 완료 시: `calc_status → 'completed'`

### exception (Else)
`processed` 컬럼 없거나 모든 건이 `processed = true`이면:
→ ES-SETTLE-001 `completed` 분기 → `BatchSkipped` 이벤트
→ 재계산 필요 시 관리자 수동 `calc_status = 'failed'` + `processed = false` 리셋

---

## 구현 힌트

```sql
-- 미처리 건 조회 (재처리용)
SELECT calc_tx_id, tx_type, amount
FROM calculation_transactions
WHERE calc_id = :calcId
  AND processed = false
ORDER BY calc_tx_id;   -- 결정론적 순서 보장

-- 건별 처리 후 즉시 커밋 (중단 시 손실 최소화)
UPDATE calculation_transactions
SET processed = true
WHERE calc_tx_id = :txId;
COMMIT;  -- 건별 커밋으로 체크포인트 역할

-- 전체 완료 확인
SELECT COUNT(*) FROM calculation_transactions
WHERE calc_id = :calcId AND processed = false;
-- 결과 = 0 → calc_status = 'completed'
```

- 건별 커밋: 배치 재시작 시 손실 최소화 (Cloudflare Workers `batch()` 활용)
- `processed` 필드: `BOOLEAN DEFAULT false`, NOT NULL
- 장애 감지 시 `calc_status = 'failed'` 즉시 마킹 (재시작 가능 신호)
