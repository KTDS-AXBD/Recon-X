# Spec Container — POL-LPON-GIFT-001 (온누리상품권 선물 규칙)

**Skill ID**: POL-LPON-GIFT-001
**Domain**: LPON 선물하기 (P2P Gift Transfer)
**Source**: SOURCE_MISSING — db-policy 42건 확인, 문서 추정 기반 Fill
**Version**: 1.0.0
**Status**: draft

---

## 비즈니스 룰 (BL-G001 ~ BL-G006)

| ID | condition (When) | criteria (If) | outcome (Then) | exception (Else) |
|----|-----------------|---------------|----------------|-----------------|
| BL-G001 | 발송자가 선물 발송 요청 시 | 발송 금액 ≤ 발송자 잔액 AND 수신자 계정이 유효 | 발송자 잔액에서 선물 금액 차감 후 `gift_transactions` 생성, `status=pending` | 잔액 부족 또는 수신자 미존재 시 에러 반환 |
| BL-G002 | 수신자가 선물 수락 요청 시 | `gift_transactions.status = 'pending'` AND `expires_at > NOW()` | 수신자 잔액 증가 + `status → 'accepted'` + `GiftAccepted` 이벤트 | 이미 수락/거절/만료/취소된 경우 HTTP 422 |
| BL-G003 | 수신자가 선물 거절 요청 시 | `gift_transactions.status = 'pending'` | 발송자 잔액 복원 + `status → 'rejected'` + `GiftRejected` 이벤트 | 이미 처리된 선물 → HTTP 422 |
| BL-G004 | 선물 만료 시점 도달 시 | `expires_at < NOW()` AND `status = 'pending'` | 발송자 잔액 복원 + `status → 'expired'` + `GiftExpired` 이벤트 | 이미 수락된 경우 만료 처리 불가 (ES-GIFT-001) |
| BL-G005 | 발송자가 선물 취소 요청 시 | `status = 'pending'` (수락 전) | 발송자 잔액 즉시 복원 + `status → 'canceled'` + `GiftCanceled` 이벤트 | `status = 'accepted'` 이면 취소 불가 → HTTP 422 (ES-GIFT-002) |
| BL-G006 | 수신자 선물 수락으로 잔액 이전 시 | 발송자 차감 + 수신자 증가 단일 원자 처리 | `gift_ledger_entries` 2행 (debit_sender + credit_receiver) 원자 삽입 | 한쪽 실패 시 전체 롤백 + `GiftTransferFailed` (ES-GIFT-003) |

---

## 데이터 영향

- **변경 테이블**: `gift_transactions` (상태 전환), `gift_ledger_entries` (잔액 이동), `vouchers` (잔액 증감)
- **이벤트 발행**: `GiftSent`, `GiftAccepted`, `GiftRejected`, `GiftExpired`, `GiftCanceled`, `GiftTransferFailed`

## 엣지 케이스

- 동일 수신자에게 복수 선물 발송 → 각 `gift_id`로 독립 처리 (배치 만료 스케줄러 중복 조회 주의)
- 발송자 잔액 차감 후 네트워크 단절 → gift 레코드 없이 잔액만 차감 → ES-GIFT-003 롤백 보장 필요
- 수신자 탈퇴 후 선물 수락 → 탈퇴 계정 잔액 이전 불가 → `status → 'expired'` + 발송자 환원

## API 연동 (추정)

- 선물 발송: `POST /gift/send`
- 선물 수락: `POST /gift/{giftId}/accept`
- 선물 거절: `POST /gift/{giftId}/reject`
- 선물 취소: `DELETE /gift/{giftId}`
- 만료 배치: 스케줄러 직접 호출 (내부)
