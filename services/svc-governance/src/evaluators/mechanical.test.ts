import { describe, it, expect } from "vitest";
import { runMechanicalEval } from "./mechanical.js";

const VALID_SKILL_PACKAGE = {
  $schema: "https://ai-foundry.ktds.com/schemas/skill/v1",
  skillId: "550e8400-e29b-41d4-a716-446655440000",
  metadata: {
    domain: "퇴직연금",
    language: "ko",
    version: "1.0.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    author: "system",
    tags: [],
  },
  policies: [
    {
      code: "POL-PENSION-WD-HOUSING-001",
      title: "주택구입 중도인출",
      description: "주택구입 목적 중도인출 조건",
      condition: "가입자가 무주택자이며 주택구입 목적으로 중도인출을 신청한 경우",
      criteria: "무주택 확인서, 매매계약서 제출",
      outcome: "적립금의 50% 이내 중도인출 승인",
      source: { documentId: "doc-001", pageRef: "p.15" },
      trust: { level: "reviewed" as const, score: 0.85 },
      tags: ["withdrawal"],
    },
  ],
  trust: { level: "reviewed" as const, score: 0.85 },
  ontologyRef: {
    graphId: "graph-001",
    termUris: ["urn:term:001"],
  },
  provenance: {
    sourceDocumentIds: ["doc-001"],
    organizationId: "Miraeasset",
    extractedAt: "2026-01-01T00:00:00Z",
    pipeline: { stages: ["ingestion", "extraction"], models: { extraction: "claude-sonnet" } },
  },
  adapters: {},
};

describe("runMechanicalEval", () => {
  it("passes for a valid skill package", () => {
    const result = runMechanicalEval(VALID_SKILL_PACKAGE);
    expect(result.verdict).toBe("pass");
    expect(result.score).toBe(1.0);
    expect(result.stage).toBe("mechanical");
    expect(result.issues).toHaveLength(0);
  });

  it("fails for completely invalid input", () => {
    const result = runMechanicalEval({ random: "data" });
    expect(result.verdict).toBe("fail");
    expect(result.score).toBeLessThan(1);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]!.code).toBe("MECH_SCHEMA_INVALID");
  });

  it("fails for empty policies array", () => {
    const pkg = { ...VALID_SKILL_PACKAGE, policies: [] };
    const result = runMechanicalEval(pkg);
    // Zod .min(1) catches this
    expect(result.verdict).toBe("fail");
  });

  it("detects invalid policy code format", () => {
    const pkg = {
      ...VALID_SKILL_PACKAGE,
      policies: [
        {
          ...VALID_SKILL_PACKAGE.policies[0]!,
          code: "INVALID-CODE",
        },
      ],
    };
    const result = runMechanicalEval(pkg);
    expect(result.verdict).toBe("fail");
    // Schema-level code validation catches it
    expect(result.issues.some((i) => i.code === "MECH_SCHEMA_INVALID")).toBe(true);
  });

  it("fails for missing metadata.domain", () => {
    const pkg = {
      ...VALID_SKILL_PACKAGE,
      metadata: { ...VALID_SKILL_PACKAGE.metadata, domain: "" },
    };
    const result = runMechanicalEval(pkg);
    expect(result.verdict).toBe("fail");
    expect(result.issues.some((i) => i.code === "MECH_MISSING_DOMAIN")).toBe(true);
  });

  it("returns correct evaluator name", () => {
    const result = runMechanicalEval(VALID_SKILL_PACKAGE);
    expect(result.evaluator).toBe("mechanical-v1");
  });

  it("has a valid timestamp", () => {
    const result = runMechanicalEval(VALID_SKILL_PACKAGE);
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
  });

  it("has non-negative durationMs", () => {
    const result = runMechanicalEval(VALID_SKILL_PACKAGE);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
