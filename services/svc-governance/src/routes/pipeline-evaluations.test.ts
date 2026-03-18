import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleListPipelineEvaluations,
  handlePipelineEvaluationsSummary,
} from "./pipeline-evaluations.js";
import type { Env } from "../env.js";

function mockDb(overrides?: { allResults?: Record<string, unknown>[] }) {
  const allFn = vi.fn().mockResolvedValue({ results: overrides?.allResults ?? [] });
  return {
    prepare: vi.fn().mockReturnValue({
      all: allFn,
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        all: allFn,
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    }),
  } as unknown as D1Database;
}

function mockEnv(dbOverrides?: Parameters<typeof mockDb>[0]): Env {
  return {
    DB_GOVERNANCE: mockDb(dbOverrides),
    KV_PROMPTS: { get: vi.fn(), put: vi.fn() } as unknown as KVNamespace,
    SECURITY: { fetch: vi.fn() } as unknown as Fetcher,
    LLM_ROUTER: { fetch: vi.fn() } as unknown as Fetcher,
    ENVIRONMENT: "development",
    SERVICE_NAME: "svc-governance",
    INTERNAL_API_SECRET: "test-secret",
    ANTHROPIC_API_KEY: "test-key",
    OPENAI_API_KEY: "test-openai-key",
    GOOGLE_API_KEY: "test-google-key",
    AI: { run: vi.fn() } as unknown as Ai,
    SVC_INGESTION: { fetch: vi.fn() } as unknown as Fetcher,
    SVC_EXTRACTION: { fetch: vi.fn() } as unknown as Fetcher,
    SVC_POLICY: { fetch: vi.fn() } as unknown as Fetcher,
    SVC_SKILL: { fetch: vi.fn() } as unknown as Fetcher,
    SVC_ONTOLOGY: { fetch: vi.fn() } as unknown as Fetcher,
    SVC_ANALYTICS: { fetch: vi.fn() } as unknown as Fetcher,
  };
}

describe("handleListPipelineEvaluations", () => {
  let env: Env;
  beforeEach(() => { env = mockEnv(); });

  it("returns empty list with no filters", async () => {
    const req = new Request("https://test.internal/pipeline-evaluations");
    const res = await handleListPipelineEvaluations(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("applies targetType filter", async () => {
    const req = new Request("https://test.internal/pipeline-evaluations?targetType=skill");
    await handleListPipelineEvaluations(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("target_type = ?");
  });

  it("applies organizationId filter", async () => {
    const req = new Request("https://test.internal/pipeline-evaluations?organizationId=LPON");
    await handleListPipelineEvaluations(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("organization_id = ?");
  });

  it("applies stage filter", async () => {
    const req = new Request("https://test.internal/pipeline-evaluations?stage=mechanical");
    await handleListPipelineEvaluations(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("stage = ?");
  });

  it("applies verdict filter", async () => {
    const req = new Request("https://test.internal/pipeline-evaluations?verdict=pass");
    await handleListPipelineEvaluations(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("verdict = ?");
  });

  it("applies limit and offset", async () => {
    const req = new Request("https://test.internal/pipeline-evaluations?limit=10&offset=5");
    await handleListPipelineEvaluations(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("LIMIT ? OFFSET ?");
  });

  it("returns data from DB results", async () => {
    const env = mockEnv({
      allResults: [
        { eval_id: "pe-001", stage: "mechanical", verdict: "pass", score: 1.0 },
      ],
    });
    const req = new Request("https://test.internal/pipeline-evaluations");
    const res = await handleListPipelineEvaluations(req, env);
    const body = (await res.json()) as { data: Array<{ eval_id: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.eval_id).toBe("pe-001");
  });
});

describe("handlePipelineEvaluationsSummary", () => {
  it("returns aggregated summary", async () => {
    const env = mockEnv({
      allResults: [
        { stage: "mechanical", verdict: "pass", count: 10, avg_score: 0.95, min_score: 0.8, max_score: 1.0 },
      ],
    });
    const req = new Request("https://test.internal/pipeline-evaluations/summary");
    const res = await handlePipelineEvaluationsSummary(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: Array<{ stage: string }> };
    expect(body.data).toHaveLength(1);
  });

  it("applies organizationId filter for summary", async () => {
    const env = mockEnv({ allResults: [] });
    const req = new Request("https://test.internal/pipeline-evaluations/summary?organizationId=LPON");
    await handlePipelineEvaluationsSummary(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("organization_id = ?");
  });

  it("applies stage filter for summary", async () => {
    const env = mockEnv({ allResults: [] });
    const req = new Request("https://test.internal/pipeline-evaluations/summary?stage=semantic");
    await handlePipelineEvaluationsSummary(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("stage = ?");
  });

  it("groups by stage and verdict", async () => {
    const env = mockEnv({ allResults: [] });
    const req = new Request("https://test.internal/pipeline-evaluations/summary");
    await handlePipelineEvaluationsSummary(req, env);
    const prepareMock = env.DB_GOVERNANCE.prepare as ReturnType<typeof vi.fn>;
    const sql = prepareMock.mock.calls[0]?.[0] as string;
    expect(sql).toContain("GROUP BY stage, verdict");
  });
});
