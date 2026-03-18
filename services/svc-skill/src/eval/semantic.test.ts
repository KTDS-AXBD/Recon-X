import { describe, it, expect } from "vitest";
import { SkillSemanticEvaluator } from "./semantic.js";
import type { SkillSemanticEnv } from "./semantic.js";
import type { SkillPackage, Policy } from "@ai-foundry/types";

function makePolicy(overrides?: Partial<Policy>): Policy {
  return {
    code: "POL-PENSION-WD-001",
    title: "테스트 정책",
    condition: "가입자가 주택 구입을 위해 중도인출을 신청한 경우에 해당한다",
    criteria: "주택 구입 계약서와 본인 명의 확인 서류가 제출되어야 한다",
    outcome: "퇴직연금 적립금의 50% 이내에서 중도인출을 승인한다",
    source: { documentId: "doc-1" },
    trust: { level: "reviewed", score: 0.8 },
    tags: ["테스트"],
    ...overrides,
  };
}

function makeSkillPackage(overrides?: Partial<SkillPackage>): SkillPackage {
  const now = new Date().toISOString();
  return {
    $schema: "https://ai-foundry.ktds.com/schemas/skill/v1",
    skillId: "550e8400-e29b-41d4-a716-446655440000",
    metadata: {
      domain: "퇴직연금",
      language: "ko",
      version: "1.0.0",
      createdAt: now,
      updatedAt: now,
      author: "test-author",
      tags: [],
    },
    policies: [makePolicy()],
    trust: { level: "reviewed", score: 0.8 },
    ontologyRef: {
      graphId: "graph-1",
      termUris: ["urn:pension:term:1"],
    },
    provenance: {
      sourceDocumentIds: ["doc-1"],
      organizationId: "org-1",
      extractedAt: now,
      pipeline: {
        stages: ["ingestion", "extraction", "policy"],
        models: { policy: "claude-opus" },
      },
    },
    adapters: {},
    ...overrides,
  };
}

function makeLlmResponse(dimensions: Record<string, number>): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: { content: JSON.stringify(dimensions) },
    }),
    { status: 200 },
  );
}

function makeEnv(fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>): SkillSemanticEnv {
  return {
    LLM_ROUTER: { fetch: fetchFn } as unknown as Fetcher,
    INTERNAL_API_SECRET: "test-secret",
  };
}

describe("SkillSemanticEvaluator", () => {
  const evaluator = new SkillSemanticEvaluator();

  it("high-quality skill passes (score > 0.7)", async () => {
    const env = makeEnv(async () => makeLlmResponse({
      coverage: 0.85,
      coherence: 0.9,
      granularity: 0.8,
    }));

    const result = await evaluator.evaluate(makeSkillPackage(), env);
    expect(result.verdict).toBe("pass");
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.stage).toBe("semantic");
    expect(result.evaluator).toBe("sonnet-semantic-skill");
  });

  it("low-quality skill fails (score < 0.5)", async () => {
    const env = makeEnv(async () => makeLlmResponse({
      coverage: 0.2,
      coherence: 0.3,
      granularity: 0.1,
    }));

    const result = await evaluator.evaluate(makeSkillPackage(), env);
    expect(result.verdict).toBe("fail");
    expect(result.score).toBeLessThan(0.5);
  });

  it("all 3 dimensions present in result metadata", async () => {
    const env = makeEnv(async () => makeLlmResponse({
      coverage: 0.7,
      coherence: 0.8,
      granularity: 0.6,
    }));

    const result = await evaluator.evaluate(makeSkillPackage(), env);
    const dimensions = result.metadata?.["dimensions"] as Record<string, number> | undefined;
    expect(dimensions).toBeDefined();
    expect(dimensions).toHaveProperty("coverage");
    expect(dimensions).toHaveProperty("coherence");
    expect(dimensions).toHaveProperty("granularity");
  });

  it("LLM error returns needs_review with SKILL_SEM_LLM_ERROR", async () => {
    const env = makeEnv(async () => new Response("Service Unavailable", { status: 503 }));

    const result = await evaluator.evaluate(makeSkillPackage(), env);
    expect(result.verdict).toBe("needs_review");
    expect(result.score).toBe(0);
    const issue = result.issues.find((i) => i.code === "SKILL_SEM_LLM_ERROR");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
  });

  it("correct stage 'semantic' and evaluator name", async () => {
    const env = makeEnv(async () => makeLlmResponse({
      coverage: 0.9,
      coherence: 0.9,
      granularity: 0.9,
    }));

    const result = await evaluator.evaluate(makeSkillPackage(), env);
    expect(result.stage).toBe("semantic");
    expect(result.evaluator).toBe("sonnet-semantic-skill");
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("weighted average calculation is correct", async () => {
    const scores = { coverage: 0.8, coherence: 0.6, granularity: 0.7 };
    const expectedScore = 0.8 * 0.40 + 0.6 * 0.35 + 0.7 * 0.25;

    const env = makeEnv(async () => makeLlmResponse(scores));

    const result = await evaluator.evaluate(makeSkillPackage(), env);
    expect(result.score).toBe(Math.round(expectedScore * 1000) / 1000);
  });

  it("low dimension scores generate warning issues", async () => {
    const env = makeEnv(async () => makeLlmResponse({
      coverage: 0.3,
      coherence: 0.2,
      granularity: 0.4,
    }));

    const result = await evaluator.evaluate(makeSkillPackage(), env);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("SKILL_SEM_LOW_COVERAGE");
    expect(codes).toContain("SKILL_SEM_INCOHERENT");
    expect(codes).toContain("SKILL_SEM_BAD_GRANULARITY");
  });

  it("policies summary is truncated to 50 max in prompt", async () => {
    const manyPolicies = Array.from({ length: 60 }, (_, i) =>
      makePolicy({ code: `POL-PENSION-WD-${String(i + 1).padStart(3, "0")}` }),
    );
    let capturedBody: string | undefined;
    const env = makeEnv(async (_url, init) => {
      capturedBody = init?.body as string | undefined;
      return makeLlmResponse({ coverage: 0.8, coherence: 0.8, granularity: 0.8 });
    });

    await evaluator.evaluate(makeSkillPackage({ policies: manyPolicies }), env);

    expect(capturedBody).toBeDefined();
    const parsed = JSON.parse(capturedBody!) as { messages: Array<{ content: string }> };
    const userContent = parsed.messages[0]?.content ?? "";
    // Should contain policy #50 but not #51
    expect(userContent).toContain("50.");
    expect(userContent).not.toContain("51.");
  });
});
