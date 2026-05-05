import { describe, it, expect } from "vitest";
import type { BLDivergenceMarker } from "@ai-foundry/types";
import {
  renderDivergenceMarker,
  updateMarkerStatus,
  appendDivergenceMarker,
  parseExistingMarkers,
  recomputeDivergenceSummary,
} from "../src/divergence/provenance-writer.js";

const SAMPLE_WITH_SECTION = `# header
skillId: POL-LPON-REFUND-001

sources:
  - type: reverse-engineering
    path: "src/refund.ts"

inputCompleteness:
  sInput: 0.83

# -----------------------------------------------------------------------------
# Divergence Markers — Source-First Reconciliation
# -----------------------------------------------------------------------------
divergenceMarkers:
  - marker: DIVERGENCE
    ruleId: BL-024
    ruleName: "7일 윈도 체크"
    scope: business-rule
    severity: HIGH
    status: OPEN
    recommendation: "implement"

  - marker: DIVERGENCE
    ruleId: BL-028
    ruleName: "제외금액 공식"
    scope: business-rule
    severity: MEDIUM
    status: OPEN
    recommendation: "implement"

divergenceSummary:
  totalMarkers: 2
  bySeverity:
    HIGH: 1
    MEDIUM: 1
    LOW: 0
`;

const SAMPLE_NO_SECTION = `skillId: POL-LPON-CHARGE-001

sources:
  - type: reverse-engineering
    path: "src/charge.ts"

inputCompleteness:
  sInput: 0.7
`;

const AUTO_MARKER: BLDivergenceMarker = {
  ruleId: "BL-005",
  severity: "MEDIUM",
  pattern: "missing_threshold_check",
  sourceFile: "src/charge.ts",
  sourceLine: 42,
  detail: "BL-005 임계값 비교 패턴 부재",
  confidence: 0.7,
  autoDetected: true,
};

describe("provenance-writer / parseExistingMarkers", () => {
  it("parses 2 markers with severity + status", () => {
    const parsed = parseExistingMarkers(SAMPLE_WITH_SECTION);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ ruleId: "BL-024", severity: "HIGH", status: "OPEN" });
    expect(parsed[1]).toEqual({ ruleId: "BL-028", severity: "MEDIUM", status: "OPEN" });
  });

  it("returns empty for yaml without section", () => {
    expect(parseExistingMarkers(SAMPLE_NO_SECTION)).toEqual([]);
  });
});

describe("provenance-writer / updateMarkerStatus", () => {
  it("transitions OPEN → RESOLVED for matching ruleId", () => {
    const { text, changed } = updateMarkerStatus(SAMPLE_WITH_SECTION, "BL-024", "RESOLVED");
    expect(changed).toBe(true);
    expect(text).toContain(`ruleId: BL-024`);
    expect(text.match(/ruleId: BL-024[\s\S]*?status: RESOLVED/)).toBeTruthy();
    // BL-028은 변경 없음
    expect(text.match(/ruleId: BL-028[\s\S]*?status: OPEN/)).toBeTruthy();
  });

  it("idempotent — same status returns changed=false", () => {
    const { text, changed } = updateMarkerStatus(SAMPLE_WITH_SECTION, "BL-024", "OPEN");
    expect(changed).toBe(false);
    expect(text).toBe(SAMPLE_WITH_SECTION);
  });

  it("returns unchanged for missing ruleId", () => {
    const { text, changed } = updateMarkerStatus(SAMPLE_WITH_SECTION, "BL-999", "RESOLVED");
    expect(changed).toBe(false);
    expect(text).toBe(SAMPLE_WITH_SECTION);
  });

  it("preserves header comment block", () => {
    const { text } = updateMarkerStatus(SAMPLE_WITH_SECTION, "BL-024", "RESOLVED");
    expect(text).toContain("# Divergence Markers — Source-First Reconciliation");
    expect(text).toContain("# -----");
  });
});

describe("provenance-writer / renderDivergenceMarker", () => {
  it("includes ruleId, severity, pattern, sourceReference fields", () => {
    const block = renderDivergenceMarker(AUTO_MARKER);
    expect(block).toContain("- marker: DIVERGENCE");
    expect(block).toContain("ruleId: BL-005");
    expect(block).toContain("severity: MEDIUM");
    expect(block).toContain("pattern: missing_threshold_check");
    expect(block).toContain('file: "src/charge.ts"');
    expect(block).toContain("line: 42");
    expect(block).toContain("autoDetected: true");
    expect(block).toContain("status: OPEN");
  });

  it("uses TODO recommendation by default", () => {
    const block = renderDivergenceMarker(AUTO_MARKER);
    expect(block).toMatch(/recommendation: ".*TODO.*F430.*"/);
  });

  it("severity override applied", () => {
    const block = renderDivergenceMarker(AUTO_MARKER, { severityOverride: "HIGH" });
    expect(block).toContain("severity: HIGH");
  });
});

describe("provenance-writer / appendDivergenceMarker", () => {
  it("appends to existing section after last marker", () => {
    const { text, appended } = appendDivergenceMarker(SAMPLE_WITH_SECTION, AUTO_MARKER);
    expect(appended).toBe(true);
    const parsed = parseExistingMarkers(text);
    expect(parsed).toHaveLength(3);
    expect(parsed[2]?.ruleId).toBe("BL-005");
    // divergenceSummary 위치 보존
    expect(text).toContain("divergenceSummary:");
  });

  it("creates new section when absent (with header comment)", () => {
    const { text, appended } = appendDivergenceMarker(SAMPLE_NO_SECTION, AUTO_MARKER);
    expect(appended).toBe(true);
    expect(text).toContain("# Divergence Markers — Source-First Reconciliation");
    expect(text).toContain("divergenceMarkers:");
    expect(text).toContain("ruleId: BL-005");
    // 기존 키 보존
    expect(text).toContain("skillId: POL-LPON-CHARGE-001");
    expect(text).toContain("inputCompleteness:");
  });

  it("idempotent — duplicate ruleId not appended", () => {
    const first = appendDivergenceMarker(SAMPLE_NO_SECTION, AUTO_MARKER);
    const second = appendDivergenceMarker(first.text, AUTO_MARKER);
    expect(second.appended).toBe(false);
    expect(second.reason).toContain("already present");
    expect(second.text).toBe(first.text);
  });
});

describe("provenance-writer / recomputeDivergenceSummary", () => {
  it("updates totalMarkers + bySeverity after append", () => {
    const { text: appended } = appendDivergenceMarker(SAMPLE_WITH_SECTION, AUTO_MARKER);
    const { text, changed } = recomputeDivergenceSummary(appended);
    expect(changed).toBe(true);
    expect(text).toMatch(/totalMarkers: 3/);
    expect(text).toMatch(/HIGH: 1/);
    expect(text).toMatch(/MEDIUM: 2/);
    expect(text).toMatch(/LOW: 0/);
  });

  it("idempotent — no change when counts already match", () => {
    const { changed } = recomputeDivergenceSummary(SAMPLE_WITH_SECTION);
    expect(changed).toBe(false);
  });

  it("creates summary block when absent + markers exist", () => {
    const { text: appended } = appendDivergenceMarker(SAMPLE_NO_SECTION, AUTO_MARKER);
    const { text, changed } = recomputeDivergenceSummary(appended);
    expect(changed).toBe(true);
    expect(text).toContain("divergenceSummary:");
    expect(text).toContain("totalMarkers: 1");
  });

  it("no-op when section absent + 0 markers", () => {
    const { text, changed } = recomputeDivergenceSummary(SAMPLE_NO_SECTION);
    expect(changed).toBe(false);
    expect(text).toBe(SAMPLE_NO_SECTION);
  });
});

describe("provenance-writer / integration — append + summary recompute", () => {
  it("preserves 2-space indent of nested fields", () => {
    const { text } = appendDivergenceMarker(SAMPLE_WITH_SECTION, AUTO_MARKER);
    // nested under sourceReference must be 6-space indent
    expect(text).toMatch(/^      file: "src\/charge\.ts"$/m);
    expect(text).toMatch(/^      line: 42$/m);
  });

  it("multi-step roundtrip: status update + append + summary", () => {
    const step1 = updateMarkerStatus(SAMPLE_WITH_SECTION, "BL-028", "RESOLVED");
    const step2 = appendDivergenceMarker(step1.text, AUTO_MARKER);
    const step3 = recomputeDivergenceSummary(step2.text);
    const parsed = parseExistingMarkers(step3.text);
    expect(parsed).toHaveLength(3);
    const bl028 = parsed.find((p) => p.ruleId === "BL-028");
    expect(bl028?.status).toBe("RESOLVED");
    expect(step3.text).toMatch(/totalMarkers: 3/);
  });
});
