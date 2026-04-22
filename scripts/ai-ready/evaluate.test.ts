import { describe, it, expect } from "vitest";

// evaluate.ts의 내부 로직을 격리 테스트 (top-level main() 실행 방지를 위해 인라인 복제)

function checkCostGuard(cumulative: number, dailyBase: number): "ok" | "warn" | "stop" {
  const WARN_THRESHOLD_USD = 25;
  const HARD_LIMIT_USD = 30;
  const total = cumulative + dailyBase;
  if (total >= HARD_LIMIT_USD) return "stop";
  if (total >= WARN_THRESHOLD_USD) return "warn";
  return "ok";
}

function estimateCostUsd(tier: string, inputTokens: number, outputTokens: number): number {
  const rates: Record<string, [number, number]> = {
    haiku: [0.25 / 1_000_000, 1.25 / 1_000_000],
    sonnet: [3 / 1_000_000, 15 / 1_000_000],
    opus: [15 / 1_000_000, 75 / 1_000_000],
  };
  const [inputRate, outputRate] = rates[tier] ?? [0, 0];
  return inputTokens * (inputRate ?? 0) + outputTokens * (outputRate ?? 0);
}

// ── 비용 가드 3 case ──────────────────────────────────────────────────

describe("checkCostGuard", () => {
  it("$25 미만 — ok 반환", () => {
    expect(checkCostGuard(0, 10)).toBe("ok");
    expect(checkCostGuard(5, 15)).toBe("ok");
    expect(checkCostGuard(0, 24.99)).toBe("ok");
  });

  it("$25 이상 $30 미만 — warn 반환", () => {
    expect(checkCostGuard(0, 25)).toBe("warn");
    expect(checkCostGuard(10, 15)).toBe("warn");
    expect(checkCostGuard(0, 29.99)).toBe("warn");
  });

  it("$30 이상 — stop 반환", () => {
    expect(checkCostGuard(0, 30)).toBe("stop");
    expect(checkCostGuard(15, 15)).toBe("stop");
    expect(checkCostGuard(50, 0)).toBe("stop");
  });
});

// ── 비용 추정 (Haiku 기준) ────────────────────────────────────────────

describe("estimateCostUsd", () => {
  it("Haiku 2000 input + 300 output ≈ $0.000875", () => {
    const cost = estimateCostUsd("haiku", 2000, 300);
    // Haiku: $0.25/1M input + $1.25/1M output
    // = 2000 * 0.25/1M + 300 * 1.25/1M = 0.0005 + 0.000375 = 0.000875
    expect(cost).toBeCloseTo(0.000875, 6);
  });

  it("7 spec-container × 6기준 × Haiku 비용 < $0.05 (가드 여유 충분)", () => {
    const perCall = estimateCostUsd("haiku", 2000, 300);
    const total = 7 * 6 * perCall;
    expect(total).toBeLessThan(0.05);
  });

  it("Opus는 Haiku 대비 약 50배 비용 (Opus 교차 주의)", () => {
    const haikuCost = estimateCostUsd("haiku", 2000, 300);
    const opusCost = estimateCostUsd("opus", 2000, 300);
    expect(opusCost / haikuCost).toBeGreaterThan(30);
  });
});
