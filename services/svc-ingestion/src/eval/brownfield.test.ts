import { describe, it, expect } from "vitest";
import { BrownfieldExplorer } from "./brownfield.js";

// ── D1 Mock Helper ──────────────────────────────────────────────────

type MockRow = Record<string, unknown>;

function createMockD1(
  handler: (sql: string, bindings: unknown[]) => MockRow[],
): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        all: async () => ({ results: handler(sql, args) }),
      }),
    }),
  } as unknown as D1Database;
}

function createSimpleMockD1(results: MockRow[]): D1Database {
  return createMockD1(() => results);
}

// ── Tests ───────────────────────────────────────────────────────────

describe("BrownfieldExplorer", () => {
  const explorer = new BrownfieldExplorer();

  it("returns existing policy codes and terms", async () => {
    const policyDb = createMockD1((sql) => {
      if (sql.includes("policies")) {
        return [
          { policy_code: "POL-PENSION-WD-001", title: "퇴직연금 인출", domain: "pension" },
          { policy_code: "POL-PENSION-WD-002", title: "긴급 인출", domain: "pension" },
        ];
      }
      return [];
    });

    const ontologyDb = createMockD1((sql) => {
      if (sql.includes("terms")) {
        return [
          { name: "퇴직연금", definition: "Retirement pension" },
          { name: "DB형", definition: "Defined Benefit" },
        ];
      }
      return [];
    });

    const result = await explorer.explore("org-test", policyDb, ontologyDb);

    expect(result.existingPolicyCodes).toEqual([
      "POL-PENSION-WD-001",
      "POL-PENSION-WD-002",
    ]);
    expect(result.existingTerms).toHaveLength(2);
    expect(result.existingTerms[0]?.label).toBe("퇴직연금");
    expect(result.totalPolicies).toBe(2);
    expect(result.totalTerms).toBe(2);
    expect(result.scannedAt).toBeDefined();
  });

  it("returns empty arrays for org with no data", async () => {
    const emptyDb = createSimpleMockD1([]);

    const result = await explorer.explore("org-empty", emptyDb, emptyDb);

    expect(result.existingPolicyCodes).toEqual([]);
    expect(result.existingTerms).toEqual([]);
    expect(result.domainDistribution).toEqual({});
    expect(result.totalPolicies).toBe(0);
    expect(result.totalTerms).toBe(0);
  });

  it("correctly counts domain distribution", async () => {
    const policyDb = createMockD1((sql) => {
      if (sql.includes("policies")) {
        return [
          { policy_code: "POL-PENSION-WD-001", title: "A", domain: "pension" },
          { policy_code: "POL-PENSION-WD-002", title: "B", domain: "pension" },
          { policy_code: "POL-PENSION-WD-003", title: "C", domain: "pension" },
          { policy_code: "POL-GIFT-TR-001", title: "D", domain: "giftvoucher" },
          { policy_code: "POL-GIFT-TR-002", title: "E", domain: "giftvoucher" },
        ];
      }
      return [];
    });
    const ontologyDb = createSimpleMockD1([]);

    const result = await explorer.explore("org-test", policyDb, ontologyDb);

    expect(result.domainDistribution).toEqual({
      pension: 3,
      giftvoucher: 2,
    });
    expect(result.totalPolicies).toBe(5);
  });

  it("respects LIMIT 200 (mock returns up to 200)", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({
      policy_code: `POL-TEST-${String(i).padStart(3, "0")}`,
      title: `Policy ${i}`,
      domain: "test",
    }));
    const policyDb = createSimpleMockD1(rows);
    const ontologyDb = createSimpleMockD1([]);

    const result = await explorer.explore("org-test", policyDb, ontologyDb);

    expect(result.existingPolicyCodes).toHaveLength(200);
    expect(result.totalPolicies).toBe(200);
    expect(result.domainDistribution["test"]).toBe(200);
  });

  it("handles null/undefined fields gracefully", async () => {
    const policyDb = createMockD1((sql) => {
      if (sql.includes("policies")) {
        return [
          { policy_code: null, title: null, domain: null },
          { policy_code: "POL-OK-001", title: "Good", domain: null },
        ];
      }
      return [];
    });
    const ontologyDb = createMockD1((sql) => {
      if (sql.includes("terms")) {
        return [{ name: null, definition: null }];
      }
      return [];
    });

    const result = await explorer.explore("org-nulls", policyDb, ontologyDb);

    // null policy_code should be filtered
    expect(result.existingPolicyCodes).toEqual(["POL-OK-001"]);
    // null term name → empty string label
    expect(result.existingTerms).toHaveLength(1);
    expect(result.existingTerms[0]?.label).toBe("");
    // null domain → "unknown"
    expect(result.domainDistribution["unknown"]).toBe(2);
    expect(result.totalPolicies).toBe(2);
  });

  it("returns proper BrownfieldContext shape", async () => {
    const policyDb = createSimpleMockD1([
      { policy_code: "POL-A-001", title: "T", domain: "d" },
    ]);
    const ontologyDb = createSimpleMockD1([
      { name: "Term1", definition: "Def1" },
    ]);

    const result = await explorer.explore("org-shape", policyDb, ontologyDb);

    expect(result).toHaveProperty("existingPolicyCodes");
    expect(result).toHaveProperty("existingTerms");
    expect(result).toHaveProperty("domainDistribution");
    expect(result).toHaveProperty("totalPolicies");
    expect(result).toHaveProperty("totalTerms");
    expect(result).toHaveProperty("scannedAt");

    // Validate scannedAt is ISO string
    expect(() => new Date(result.scannedAt)).not.toThrow();
    expect(new Date(result.scannedAt).toISOString()).toBe(result.scannedAt);
  });
});
