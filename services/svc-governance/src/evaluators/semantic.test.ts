import { describe, it, expect, vi } from "vitest";
import { runSemanticEval } from "./semantic.js";
import type { SkillPackage } from "@ai-foundry/types";
import type { SemanticEvalEnv } from "./semantic.js";

function makeSkillPackage(): SkillPackage {
  return {
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
        condition: "가입자가 무주택자이며 주택구입 목적으로 중도인출을 신청한 경우",
        criteria: "무주택 확인서, 매매계약서 제출",
        outcome: "적립금의 50% 이내 중도인출 승인",
        source: { documentId: "doc-001" },
        trust: { level: "reviewed", score: 0.85 },
        tags: [],
      },
    ],
    trust: { level: "reviewed", score: 0.85 },
    ontologyRef: { graphId: "g-1", termUris: [] },
    provenance: {
      sourceDocumentIds: ["doc-001"],
      organizationId: "Miraeasset",
      extractedAt: "2026-01-01T00:00:00Z",
      pipeline: { stages: ["ingestion"], models: {} },
    },
    adapters: {},
  };
}

function mockEnv(llmResponse: { content: string } | null, status = 200): SemanticEvalEnv {
  return {
    LLM_ROUTER: {
      fetch: vi.fn().mockResolvedValue(
        llmResponse
          ? new Response(JSON.stringify(llmResponse), { status })
          : new Response("error", { status: 500 }),
      ),
    } as unknown as Fetcher,
    INTERNAL_API_SECRET: "test-secret",
  };
}

describe("runSemanticEval", () => {
  it("returns pass for high scores", async () => {
    const env = mockEnv({
      content: JSON.stringify({
        logicConsistency: 0.9,
        interPolicyCoherence: 0.85,
        terminologyAppropriateness: 0.88,
        issues: [],
      }),
    });

    const result = await runSemanticEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("pass");
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.stage).toBe("semantic");
    expect(result.evaluator).toBe("semantic-haiku-v1");
  });

  it("returns needs_review for medium scores", async () => {
    const env = mockEnv({
      content: JSON.stringify({
        logicConsistency: 0.6,
        interPolicyCoherence: 0.55,
        terminologyAppropriateness: 0.65,
        issues: [],
      }),
    });

    const result = await runSemanticEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("needs_review");
  });

  it("returns fail for low scores", async () => {
    const env = mockEnv({
      content: JSON.stringify({
        logicConsistency: 0.2,
        interPolicyCoherence: 0.3,
        terminologyAppropriateness: 0.4,
        issues: [{ dimension: "logic", message: "Contradictions found", severity: "error" }],
      }),
    });

    const result = await runSemanticEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("fail");
    expect(result.issues.some((i) => i.code === "SEM_LLM_FINDING")).toBe(true);
  });

  it("handles LLM call failure", async () => {
    const env = mockEnv(null, 500);

    const result = await runSemanticEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("fail");
    expect(result.issues.some((i) => i.code === "SEM_LLM_ERROR")).toBe(true);
  });

  it("handles unparseable LLM response", async () => {
    const env = mockEnv({ content: "This is not JSON at all" });

    const result = await runSemanticEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("fail");
    expect(result.issues.some((i) => i.code === "SEM_PARSE_ERROR")).toBe(true);
  });

  it("stores dimension scores in metadata", async () => {
    const env = mockEnv({
      content: JSON.stringify({
        logicConsistency: 0.9,
        interPolicyCoherence: 0.85,
        terminologyAppropriateness: 0.88,
        issues: [],
      }),
    });

    const result = await runSemanticEval(makeSkillPackage(), env);
    expect(result.metadata).toBeDefined();
    const meta = result.metadata as Record<string, number>;
    expect(meta["logicConsistency"]).toBe(0.9);
  });
});
