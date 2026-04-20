# ES-GIFT-001: 선물 수락 만료 처리 (미수락 선물 발송자 자동 환원)

**Empty Slot ID**: ES-GIFT-001
**유형**: E4 (Exception Handling)
**우선순위**: High
**Sprint**: 214c (Fill)
**Source 마커**: SOURCE_MISSING

---

## 빈 슬롯 설명

BL-G004("선물 만료 시점 도달 시 발송자 잔액 복원")는 발동 조건을 명시하나,
만료 감지 메커니즘(배치 vs 요청 시 lazy 체크)과
만료 처리 중 `status`가 동시에 변경될 때의 경쟁 조건 방지 규칙이 없다.

**위험**: 만료 배치와 수락 요청 동시 발생 시 → 이중 잔액 환원 가능성.

---

## 규칙 정의

### condition (When)
`gift_transactions.expires_at < NOW()` 이면서 `status = 'pending'` 인 선물 감지 시.
(배치 스케줄러 주기 실행 또는 수락 API 호출 시 lazy 체크)

### criteria (If)
SELECT-FOR-UPDATE로 `status = 'pending'` 행을 잠근 후 `expires_at < NOW()` 재확인.

### outcome (Then)
1. `status → 'expired'` (잠금 상태에서 UPDATE)
2. `gift_ledger_entries`에 `entry_type='refund_sender'` 삽입
3. 발송자 `vouchers.balance += gift_transactions.amount`
4. `GiftExpired` 이벤트 발행

### exception (Else)
- SELECT-FOR-UPDATE 중 다른 트랜잭션이 `status`를 이미 변경했다면 → 처리 스킵 (낙관적 잠금 실패)
- 발송자 잔액 복원 실패(DB 오류) → `status`를 `expired`로 유지 + `ManualRefundRequired` 이벤트 발행

---

## 구현 힌트

```sql
-- 만료 후보 조회 (배치용)
SELECT gift_id, sender_user_id, amount
FROM gift_transactions
WHERE status = 'pending'
  AND expires_at < NOW()
FOR UPDATE SKIP LOCKED;

-- 만료 처리 (트랜잭션 내)
UPDATE gift_transactions SET status = 'expired' WHERE gift_id = :id AND status = 'pending';
-- 영향 행 = 0이면 다른 트랜잭션이 먼저 처리 → SKIP
INSERT INTO gift_ledger_entries (gift_id, entry_type, amount) VALUES (:id, 'refund_sender', :amount);
UPDATE vouchers SET balance = balance + :amount WHERE user_id = :senderId;
```

- 배치 주기: 1시간 권장 (사용자 체감 만료 허용 오차 내)
- `SKIP LOCKED`로 병렬 배치 실행 시 중복 처리 방지
- TTL 기본값: 생성 후 7일 (운영팀 설정 가능)
