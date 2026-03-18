import { describe, it, expect, vi } from "vitest";
import { runConsensusEval } from "./consensus.js";
import type { SkillPackage } from "@ai-foundry/types";
import type { ConsensusEvalEnv } from "./consensus.js";

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

function mockEnv(scoreA: number, scoreB: number): ConsensusEvalEnv {
  let callCount = 0;
  return {
    LLM_ROUTER: {
      fetch: vi.fn().mockImplementation(() => {
        callCount++;
        const score = callCount === 1 ? scoreA : scoreB;
        return Promise.resolve(
          new Response(
            JSON.stringify({ content: JSON.stringify({ score, reasoning: `Provider ${callCount} reasoning` }) }),
            { status: 200 },
          ),
        );
      }),
    } as unknown as Fetcher,
    INTERNAL_API_SECRET: "test-secret",
  };
}

function mockEnvWithFailure(workingScore: number): ConsensusEvalEnv {
  let callCount = 0;
  return {
    LLM_ROUTER: {
      fetch: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ content: JSON.stringify({ score: workingScore, reasoning: "ok" }) }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response("error", { status: 500 }));
      }),
    } as unknown as Fetcher,
    INTERNAL_API_SECRET: "test-secret",
  };
}

describe("runConsensusEval", () => {
  it("returns consensus_approve when scores agree closely (diff < 0.15)", async () => {
    const env = mockEnv(0.85, 0.80);
    const result = await runConsensusEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("consensus_approve");
    // avg of 0.85 and 0.80 = 0.825
    expect(result.score).toBeCloseTo(0.825, 2);
    expect(result.stage).toBe("consensus");
  });

  it("returns consensus_approve with min score when diff is 0.15-0.30", async () => {
    const env = mockEnv(0.90, 0.70);
    const result = await runConsensusEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("consensus_approve");
    // min of 0.90 and 0.70 = 0.70
    expect(result.score).toBeCloseTo(0.70, 2);
  });

  it("returns consensus_split when scores diverge >= 0.30", async () => {
    const env = mockEnv(0.90, 0.50);
    const result = await runConsensusEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("consensus_split");
    expect(result.issues.some((i) => i.code === "CONS_SPLIT")).toBe(true);
  });

  it("returns consensus_reject when both scores are low and close", async () => {
    const env = mockEnv(0.20, 0.25);
    const result = await runConsensusEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("consensus_reject");
  });

  it("handles single provider failure gracefully", async () => {
    const env = mockEnvWithFailure(0.80);
    const result = await runConsensusEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("consensus_approve");
    expect(result.issues.some((i) => i.code === "CONS_SINGLE_PROVIDER")).toBe(true);
  });

  it("returns consensus_reject when all providers fail", async () => {
    const env: ConsensusEvalEnv = {
      LLM_ROUTER: {
        fetch: vi.fn().mockResolvedValue(new Response("error", { status: 500 })),
      } as unknown as Fetcher,
      INTERNAL_API_SECRET: "test-secret",
    };
    const result = await runConsensusEval(makeSkillPackage(), env);
    expect(result.verdict).toBe("consensus_reject");
    expect(result.issues.some((i) => i.code === "CONS_ALL_FAILED")).toBe(true);
  });

  it("stores provider details in metadata", async () => {
    const env = mockEnv(0.85, 0.80);
    const result = await runConsensusEval(makeSkillPackage(), env);
    expect(result.metadata).toBeDefined();
    const meta = result.metadata as { providers: Array<{ provider: string }>; scoreDiff: number };
    expect(meta.providers).toHaveLength(2);
    expect(meta.scoreDiff).toBeDefined();
  });
});
