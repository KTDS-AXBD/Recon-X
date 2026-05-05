// scripts/divergence/fixtures/refund-pre-f359.ts
//
// Synthetic fixture — represents refund.ts BEFORE Sprint 251 F359 fix.
// 본 파일은 F354 (Sprint 218) 시점 코드를 재현한 것이며 production 사용 X.
//
// Expected detector results:
//   BL-028: 1 marker (line `const exclusionAmount = 0;`)
//   BL-027: 1 marker (`approveRefund` body=2 lines, branchDepth=0)
//
// Real refund.ts (현재): exclusionAmount = Math.round(cashback * 1.1) + approveRefund 50+ lines.
// 이 fixture와 실 refund.ts 비교 시 detector가 정확히 양쪽 분류 가능해야 함.

interface Payment {
  voucher_id: string;
  amount: number;
}

export function processRefundRequest(payment: Payment, amount: number) {
  // BL-028: 제외금액 산정 (현 PoC에서는 0)
  const exclusionAmount = 0;
  const depositAmount = amount - exclusionAmount;
  return { paymentId: payment.voucher_id, depositAmount, exclusionAmount };
}

export async function approveRefund(refundId: string) {
  // BL-027: 부분 구현 — 자세한 로직 미구현
  return { status: "approved", refundId };
}
