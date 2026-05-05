// scripts/divergence/fixtures/refund-pre-f359.ts
//
// Synthetic fixture — represents refund.ts BEFORE Sprint 251 F359 fix.
// 본 파일은 F354 (Sprint 218) 시점 코드를 재현한 것이며 production 사용 X.
//
// Expected detector results (5/5 ABSENCE markers, F354 자동화 완성 입증):
//   BL-024: 1 marker — no `daysSincePurchase > 7` (temporal check 부재)
//   BL-026: 1 marker — cashback_amount 사용은 있으나 reject ALT 분기 부재
//   BL-027: 1 marker — `approveRefund` 짧은 stub (body=2 lines, branchDepth=0)
//   BL-028: 1 marker — `const exclusionAmount = 0` hardcoded
//   BL-029: 1 marker — `expires_at < now()` 비교 부재
//
// Real refund.ts (현재, Sprint 251 F359 이후): 위 5종 패턴 모두 RESOLVED.
// Detector가 이 fixture와 실 refund.ts를 정확히 양면(positive/negative) 분류 가능해야 함.

interface Payment {
  voucher_id: string;
  amount: number;
  user_id: string;
}

interface Voucher {
  cashback_amount: number;
  expires_at: string;
  balance: number;
  purchased_at: string;
}

export function processRefundRequest(
  payment: Payment,
  voucher: Voucher,
  amount: number,
  refundType: string,
) {
  // BL-029 누락: expires_at 만료 체크 없음 (current Sprint 251 F359에서는 line 93-96에 추가됨)
  // BL-024 누락: refundType === 'UNUSED_FULL' 분기는 있으나 7일 윈도 체크 없음
  if (refundType === "UNUSED_FULL") {
    // No daysSincePurchase calculation, no `> 7` check
    // → BL-024 DIVERGENCE marker 발행 기대
  }

  // BL-028 누락: exclusion 하드코딩 0 (current에서는 cashback * 1.1 계산)
  const exclusionAmount = 0;
  const depositAmount = amount - exclusionAmount;

  // BL-026 누락: cashback_amount 식별자는 사용하지만 reject ALT 분기 없음
  // current에서도 BL-026은 미구현 상태이지만 fixture에서도 동일하게 ABSENCE 입증
  const adjustedDeposit = depositAmount + voucher.cashback_amount * 0.1;
  void voucher.balance;

  return {
    paymentId: payment.voucher_id,
    depositAmount: adjustedDeposit,
    exclusionAmount,
  };
}

export async function approveRefund(refundId: string) {
  // BL-027: 부분 구현 — 자세한 로직 미구현 (body=2 lines, branchDepth=0)
  return { status: "approved", refundId };
}
