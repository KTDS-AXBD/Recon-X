import { describe, it, expect } from "vitest";
import {
  detectHardCodedExclusion,
  detectUnderImplementation,
  parseTypeScriptSource,
} from "../src/divergence/bl-detector.js";
import { crossCheck, parseProvenanceMarkers } from "../src/divergence/provenance-cross-check.js";

describe("BL-028 — detectHardCodedExclusion", () => {
  it("detects const exclusionAmount = 0", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `function f() {
  const exclusionAmount = 0;
  return exclusionAmount;
}`,
    );
    const markers = detectHardCodedExclusion(src, "test.ts");
    expect(markers).toHaveLength(1);
    expect(markers[0]?.ruleId).toBe("BL-028");
    expect(markers[0]?.confidence).toBe(0.95);
    expect(markers[0]?.matchedText).toContain("exclusionAmount");
  });

  it("detects let excl_amount = 0 (assignment via initializer)", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `let excl_amount = 0;`,
    );
    const markers = detectHardCodedExclusion(src, "test.ts");
    expect(markers).toHaveLength(1);
    expect(markers[0]?.matchedText).toContain("excl_amount");
  });

  it("does NOT detect computed exclusionAmount", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `function f(voucher: { cashback: number }) {
  const exclusionAmount = Math.round(voucher.cashback * 1.1);
  return exclusionAmount;
}`,
    );
    const markers = detectHardCodedExclusion(src, "test.ts");
    expect(markers).toHaveLength(0);
  });

  it("does NOT detect unrelated value = 0", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `const counter = 0;
const value = 0;
const total = 0;`,
    );
    const markers = detectHardCodedExclusion(src, "test.ts");
    expect(markers).toHaveLength(0);
  });

  it("detects assignment expression exclusionAmount = 0", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `function f() {
  let exclusionAmount: number;
  exclusionAmount = 0;
  return exclusionAmount;
}`,
    );
    const markers = detectHardCodedExclusion(src, "test.ts");
    expect(markers.length).toBeGreaterThanOrEqual(1);
    expect(markers.some((m) => m.matchedText?.includes("exclusionAmount"))).toBe(true);
  });
});

describe("BL-027 — detectUnderImplementation", () => {
  it("detects stub function (3 line body, 0 branch)", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `function approveRefund() {
  return { status: "approved" };
}`,
    );
    const markers = detectUnderImplementation(src, "test.ts", {
      targetFunctionNames: ["approveRefund"],
    });
    expect(markers).toHaveLength(1);
    expect(markers[0]?.ruleId).toBe("BL-027");
    expect(markers[0]?.confidence).toBe(0.7);
  });

  it("does NOT detect implemented function (large body + branches)", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `async function approveRefund(refundId: string) {
  if (!refundId) {
    throw new Error("invalid");
  }
  try {
    if (Math.random() > 0.5) {
      const result = await fetch("https://example.com");
      return result;
    }
    if (Math.random() < 0.1) {
      return null;
    }
    return { status: "approved" };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("unknown");
  }
}`,
    );
    const markers = detectUnderImplementation(src, "test.ts", {
      targetFunctionNames: ["approveRefund"],
    });
    expect(markers).toHaveLength(0);
  });

  it("respects target function name filter", () => {
    const src = parseTypeScriptSource(
      "test.ts",
      `function shortStub() {
  return 1;
}
function alsoShort() {
  return 2;
}`,
    );
    const filtered = detectUnderImplementation(src, "test.ts", {
      targetFunctionNames: ["shortStub"],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.matchedText).toBe("shortStub");

    const all = detectUnderImplementation(src, "test.ts");
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});

describe("provenance cross-check", () => {
  const yamlSample = `
divergenceMarkers:
  - marker: DIVERGENCE
    ruleId: BL-024
    status: OPEN
    severity: HIGH

  - marker: DIVERGENCE
    ruleId: BL-028
    status: OPEN
    severity: MEDIUM

  - marker: DIVERGENCE
    ruleId: BL-026
    status: OPEN
    severity: MEDIUM
`;

  it("parses 3 manual markers", () => {
    const parsed = parseProvenanceMarkers(yamlSample);
    expect(parsed).toHaveLength(3);
    expect(parsed.map((m) => m.ruleId).sort()).toEqual(["BL-024", "BL-026", "BL-028"]);
  });

  it("recommends RESOLVED for manual=OPEN + auto=0 (BL-028 already fixed)", () => {
    const recs = crossCheck(yamlSample, []);
    expect(recs).toHaveLength(3);
    const bl028 = recs.find((r) => r.ruleId === "BL-028");
    expect(bl028?.recommendedStatus).toBe("RESOLVED");
    expect(bl028?.reason).toContain("RESOLVED");
  });

  it("keeps OPEN for manual=OPEN + auto≥1 (BL-028 still hardcoded)", () => {
    const autoMarkers = [
      {
        ruleId: "BL-028",
        severity: "MEDIUM" as const,
        pattern: "hardcoded_exclusion" as const,
        sourceFile: "refund.ts",
        sourceLine: 80,
        detail: "test",
        confidence: 0.95,
        autoDetected: true as const,
      },
    ];
    const recs = crossCheck(yamlSample, autoMarkers);
    const bl028 = recs.find((r) => r.ruleId === "BL-028");
    expect(bl028?.recommendedStatus).toBe("OPEN");
    expect(bl028?.autoDetectionCount).toBe(1);
  });
});
