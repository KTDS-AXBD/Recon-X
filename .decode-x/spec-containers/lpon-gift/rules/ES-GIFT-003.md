# ES-GIFT-003: 선물 잔액 이전 시 원장 동시성 처리 (원자성 보장)

**Empty Slot ID**: ES-GIFT-003
**유형**: E3 (Reconcile)
**우선순위**: High
**Sprint**: 214c (Fill)
**Source 마커**: SOURCE_MISSING

---

## 빈 슬롯 설명

BL-G006("발송자 차감 + 수신자 증가 단일 원자 처리")은 결과를 정의하나,
- 중간 단계 실패(발송자 차감 성공 → 수신자 증가 실패) 시 롤백 범위
- `gift_ledger_entries` 2행 삽입과 `vouchers` 잔액 변경의 트랜잭션 경계
- 네트워크 단절 후 재시도 시 이중 삽입 방지

가 명시되지 않았다.

**위험**: 발송자 잔액만 차감되고 수신자 잔액 미증가 → 상품권 소실.

---

## 규칙 정의

### condition (When)
수신자가 선물 수락 시 (`POST /gift/{giftId}/accept`).

### criteria (If)
단일 DB 트랜잭션 내에서 아래 4개 연산 모두 성공 여부 확인:
1. `gift_transactions` status 업데이트 (`pending → accepted`)
2. `gift_ledger_entries` debit_sender 삽입
3. `gift_ledger_entries` credit_receiver 삽입
4. `vouchers.balance` 수신자 증가

### outcome (Then)
모두 성공 시: `COMMIT` + `GiftAccepted` 이벤트 발행.

### exception (Else)
어느 하나라도 실패 시: `ROLLBACK` — 발송자 잔액 자동 복원 (트랜잭션 롤백으로 보장).
`GiftTransferFailed` 이벤트 발행 → 알림 서비스가 수신자에게 "선물 수락 실패" 안내.

멱등성 처리:
- `gift_ledger_entries`에 `(gift_id, entry_type)` 유니크 인덱스 → 재시도 시 DUPLICATE KEY → 이미 처리됨 감지

---

## 구현 힌트

```sql
-- 단일 트랜잭션 (수락 처리)
BEGIN TRANSACTION;

UPDATE gift_transactions SET status = 'accepted', accepted_at = NOW()
WHERE gift_id = :id AND status = 'pending';
-- 영향 행 = 0 → ROLLBACK + "이미 처리된 선물" 에러

INSERT INTO gift_ledger_entries (gift_id, entry_type, amount, executed_at)
VALUES (:id, 'debit_sender', :amount, NOW());

INSERT INTO gift_ledger_entries (gift_id, entry_type, amount, executed_at)
VALUES (:id, 'credit_receiver', :amount, NOW());

UPDATE vouchers SET balance = balance + :amount WHERE user_id = :receiverId;
-- 음수 체크: balance >= 0 컨스트레인트는 발송자에게 적용 (수신자는 증가만)

COMMIT;
```

- 트랜잭션 격리 수준: `READ COMMITTED` 이상 권장 (D1은 serializable 기본)
- `gift_ledger_entries (gift_id, entry_type)` UNIQUE 인덱스 → 재시도 안전
- Cloudflare D1: 단일 Worker 요청 내 트랜잭션 → `batch()` API 활용 권장
