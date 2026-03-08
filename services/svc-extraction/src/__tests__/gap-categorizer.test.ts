import { describe, it, expect } from "vitest";
import {
  isNoiseTable,
  isNoiseApi,
  categorizeGapDomain,
  buildDomainSummary,
} from "../factcheck/gap-categorizer.js";
import type { FactCheckGap } from "@ai-foundry/types";
import type { SourceApi, SourceTable } from "../factcheck/types.js";

// ── Helper builders ─────────────────────────────────────────────

function makeSourceTable(tableName: string, columnCount: number, source: "ddl" | "mybatis" = "mybatis"): SourceTable {
  const columns = Array.from({ length: columnCount }, (_, i) => ({
    name: `col_${i}`,
    nullable: true,
    isPrimaryKey: i === 0,
  }));
  return { tableName, columns, source, documentId: "doc-1", sourceFile: "test.xml" };
}

function makeSourceApi(path: string, controllerClass: string, methodName: string): SourceApi {
  return {
    path,
    httpMethods: ["GET"],
    methodName,
    controllerClass,
    parameters: [],
    returnType: "Object",
    documentId: "doc-1",
    sourceFile: "Test.java",
  };
}

function makeGap(overrides: Partial<FactCheckGap> = {}): FactCheckGap {
  return {
    gapId: crypto.randomUUID(),
    resultId: "result-1",
    organizationId: "LPON",
    gapType: "MID",
    severity: "HIGH",
    sourceItem: "{}",
    description: "test gap",
    autoResolved: false,
    reviewStatus: "pending",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── isNoiseTable ────────────────────────────────────────────────

describe("isNoiseTable", () => {
  it("dual is system_table noise", () => {
    expect(isNoiseTable(makeSourceTable("dual", 18))).toBe("system_table");
  });

  it("DUAL is system_table noise", () => {
    expect(isNoiseTable(makeSourceTable("DUAL", 47))).toBe("system_table");
  });

  it("A is sql_alias noise", () => {
    expect(isNoiseTable(makeSourceTable("A", 0))).toBe("sql_alias");
  });

  it("SET is sql_keyword noise", () => {
    expect(isNoiseTable(makeSourceTable("SET", 0))).toBe("sql_keyword");
  });

  it("walletNo (camelCase, 0 cols) is variable_name noise", () => {
    expect(isNoiseTable(makeSourceTable("walletNo", 0))).toBe("variable_name");
  });

  it("ACCOUNT with columns is NOT noise", () => {
    expect(isNoiseTable(makeSourceTable("ACCOUNT", 22))).toBeNull();
  });

  it("DEAL_DETAIL with columns is NOT noise", () => {
    expect(isNoiseTable(makeSourceTable("DEAL_DETAIL", 29))).toBeNull();
  });

  it("DEAL_DEL with 0 columns is NOT noise (uppercase with underscores)", () => {
    // This is a real archive table, just extracted from SELECT without DDL
    expect(isNoiseTable(makeSourceTable("DEAL_DEL", 0))).toBeNull();
  });
});

// ── isNoiseApi ──────────────────────────────────────────────────

describe("isNoiseApi", () => {
  it("/auth/test is test_endpoint noise", () => {
    expect(isNoiseApi(makeSourceApi("/onnuripay/v1.0/auth/test", "AuthController", "test"))).toBe("test_endpoint");
  });

  it("ExceptionHandlingController is noise_controller", () => {
    expect(isNoiseApi(makeSourceApi("/error", "ExceptionHandlingController", "handleError"))).toBe("noise_controller");
  });

  it("SandBoxController is noise_controller", () => {
    expect(isNoiseApi(makeSourceApi("/sendResult", "SandBoxController", "sendResult"))).toBe("noise_controller");
  });

  it("HealthCheckController is noise_controller", () => {
    expect(isNoiseApi(makeSourceApi("/virtualaccount", "HealthCheckController", "getapi"))).toBe("noise_controller");
  });

  it("/v1/example/* with ExampleController is noise_controller", () => {
    expect(isNoiseApi(makeSourceApi("/v1/example/get", "ExampleController", "hello"))).toBe("noise_controller");
  });

  it("/v1/example/* with unknown controller is example_endpoint", () => {
    expect(isNoiseApi(makeSourceApi("/v1/example/get", "SomeController", "hello"))).toBe("example_endpoint");
  });

  it("/getCSRFToken is utility_endpoint noise", () => {
    expect(isNoiseApi(makeSourceApi("/getCSRFToken", "LoginController", "getCSRFToken"))).toBe("utility_endpoint");
  });

  it("duplicate path /utils/getNow/utils/getNow is noise", () => {
    expect(isNoiseApi(makeSourceApi("/utils/getNow/utils/getNow", "CommonController", "getNow"))).toBe("duplicate_path");
  });

  it("/onnuripay/v1.0/deal/dealDetail is NOT noise", () => {
    expect(isNoiseApi(makeSourceApi("/onnuripay/v1.0/deal/dealDetail", "DealController", "dealDetail"))).toBeNull();
  });

  it("/chargeDealing/confirmCharge is NOT noise", () => {
    expect(isNoiseApi(makeSourceApi("/chargeDealing/confirmCharge", "ChargeController", "charge"))).toBeNull();
  });
});

// ── categorizeGapDomain ─────────────────────────────────────────

describe("categorizeGapDomain", () => {
  it("charge domain from path", () => {
    const gap = makeGap({
      sourceItem: JSON.stringify({ path: "/chargeDealing/confirmCharge", controller: "ChargeController" }),
      description: "소스 API '/chargeDealing/confirmCharge' (ChargeController.charge)가 문서에 존재하지 않습니다",
    });
    expect(categorizeGapDomain(gap)).toBe("charge");
  });

  it("gift domain from path", () => {
    const gap = makeGap({
      sourceItem: JSON.stringify({ path: "/gift/giftAccept", controller: "GiftController" }),
      description: "소스 API '/gift/giftAccept' (GiftController.giftAccept)가 문서에 존재하지 않습니다",
    });
    expect(categorizeGapDomain(gap)).toBe("gift");
  });

  it("message domain from path", () => {
    const gap = makeGap({
      sourceItem: JSON.stringify({ path: "/v2/messages/batch", controller: "ProducerMulticastRestControllerV2" }),
      description: "소스 API '/v2/messages/batch'가 문서에 존재하지 않습니다",
    });
    expect(categorizeGapDomain(gap)).toBe("message");
  });

  it("data domain from table", () => {
    const gap = makeGap({
      sourceItem: JSON.stringify({ tableName: "ACCOUNT", columns: 22 }),
      description: "소스 테이블 'ACCOUNT' (컬럼 22개)이 문서에 존재하지 않습니다",
    });
    expect(categorizeGapDomain(gap)).toBe("data");
  });

  it("batch domain from controller", () => {
    const gap = makeGap({
      sourceItem: JSON.stringify({ path: "/extBatch/batchRetry", controller: "ExtBatchController" }),
      description: "소스 API '/extBatch/batchRetry' (ExtBatchController.retryBatch)가 문서에 존재하지 않습니다",
    });
    expect(categorizeGapDomain(gap)).toBe("batch");
  });

  it("unknown domain for unrecognized patterns", () => {
    const gap = makeGap({
      sourceItem: JSON.stringify({ path: "/xyz/zzz" }),
      description: "소스 API '/xyz/zzz'가 문서에 존재하지 않습니다",
    });
    expect(categorizeGapDomain(gap)).toBe("unknown");
  });
});

// ── buildDomainSummary ──────────────────────────────────────────

describe("buildDomainSummary", () => {
  it("groups gaps by domain and counts severities", () => {
    const gaps = [
      makeGap({ gapId: "g1", severity: "HIGH", sourceItem: JSON.stringify({ path: "/chargeDealing/x", controller: "ChargeController" }), description: "API charge" }),
      makeGap({ gapId: "g2", severity: "MEDIUM", sourceItem: JSON.stringify({ path: "/gift/y", controller: "GiftController" }), description: "API gift" }),
      makeGap({ gapId: "g3", severity: "HIGH", sourceItem: JSON.stringify({ path: "/chargeDealing/z", controller: "ChargeController" }), description: "API charge 2" }),
    ];

    const result = buildDomainSummary(gaps, new Set());

    const chargeSummary = result.find((s) => s.domain === "charge");
    expect(chargeSummary).toBeDefined();
    expect(chargeSummary?.totalGaps).toBe(2);
    expect(chargeSummary?.highGaps).toBe(2);

    const giftSummary = result.find((s) => s.domain === "gift");
    expect(giftSummary).toBeDefined();
    expect(giftSummary?.totalGaps).toBe(1);
    expect(giftSummary?.mediumGaps).toBe(1);
  });

  it("excludes noise gaps from severity counts", () => {
    const gaps = [
      makeGap({ gapId: "g1", severity: "HIGH", sourceItem: JSON.stringify({ path: "/chargeDealing/x" }), description: "charge" }),
      makeGap({ gapId: "g2", severity: "LOW", sourceItem: JSON.stringify({ path: "/chargeDealing/y" }), description: "charge noise" }),
    ];

    const result = buildDomainSummary(gaps, new Set(["g2"]));
    const chargeSummary = result.find((s) => s.domain === "charge");
    expect(chargeSummary?.highGaps).toBe(1);
    expect(chargeSummary?.noiseGaps).toBe(1);
  });

  it("returns sorted by totalGaps descending", () => {
    const gaps = [
      makeGap({ sourceItem: JSON.stringify({ path: "/gift/a" }), description: "gift 1" }),
      makeGap({ sourceItem: JSON.stringify({ path: "/gift/b" }), description: "gift 2" }),
      makeGap({ sourceItem: JSON.stringify({ path: "/gift/c" }), description: "gift 3" }),
      makeGap({ sourceItem: JSON.stringify({ path: "/chargeDealing/x" }), description: "charge 1" }),
    ];

    const result = buildDomainSummary(gaps, new Set());
    expect(result[0]?.domain).toBe("gift");
    expect(result[0]?.totalGaps).toBe(3);
  });
});
