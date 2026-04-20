# ES-GIFT-002: 선물 발송 취소 가능 시점 기준

**Empty Slot ID**: ES-GIFT-002
**유형**: E5 (Tacit Rule)
**우선순위**: High
**Sprint**: 214c (Fill)
**Source 마커**: SOURCE_MISSING

---

## 빈 슬롯 설명

BL-G005("수락 전 취소 가능")는 상태 분기를 정의하나,
취소 요청 시각과 수락 처리 시각이 경쟁하는 경우(동시 수락+취소)의 처리 기준,
그리고 취소 후 발송자 잔액 복원 즉시성 여부가 명시되지 않았다.

**위험**: 수신자가 수락 버튼을 누르는 동시에 발송자가 취소 → 이중 잔액 이동.

---

## 규칙 정의

### condition (When)
발송자가 `DELETE /gift/{giftId}` 취소 요청 시.

### criteria (If)
DB 락: `gift_transactions.status = 'pending'` (SELECT-FOR-UPDATE) 재확인.
- `status = 'pending'` → 취소 가능
- `status ≠ 'pending'` (accepted/rejected/expired/canceled) → 취소 불가

### outcome (Then)
취소 가능 경우:
1. `status → 'canceled'`
2. `gift_ledger_entries`에 `entry_type='refund_sender'` 삽입
3. 발송자 `vouchers.balance += amount` (즉시 복원)
4. `GiftCanceled` 이벤트 발행
5. 수신자 미수락이므로 알림 없음

### exception (Else)
- `status = 'accepted'`: HTTP 422 + `GIFT_ALREADY_ACCEPTED` — 취소 불가, 고객센터 수기 처리 안내
- `status = 'expired'`: HTTP 422 + `GIFT_ALREADY_EXPIRED` — 이미 환원 완료
- `status = 'canceled'`: HTTP 422 + `GIFT_ALREADY_CANCELED` — 멱등성 응답 (200 처리 허용)

---

## 구현 힌트

```sql
-- 원자적 취소 (트랜잭션 내)
UPDATE gift_transactions
SET status = 'canceled'
WHERE gift_id = :id
  AND status = 'pending';   -- 낙관적 잠금: 0행이면 이미 상태 변경됨

-- 영향 행 = 1 → 잔액 복원 진행
-- 영향 행 = 0 → 현재 status 조회 후 에러 코드 결정
```

- 취소 API 멱등성: `status = 'canceled'` 상태에서 재취소 요청 시 HTTP 200 반환 허용
- 수신자 알림 취소: 취소 시점 기준으로 발송된 선물 알림 취소 처리 (알림 서비스 위임)
