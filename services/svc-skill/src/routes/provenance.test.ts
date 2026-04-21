import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProvenanceResolve } from "./provenance.js";
import type { Env } from "../env.js";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://test.example/skills/SK-001/provenance/resolve", {
    headers: { "X-Organization-Id": "org-test", ...headers },
  });
}

function makeSkillJson(overrides: object = {}): string {
  return JSON.stringify({
    provenance: {
      sourceDocumentIds: ["doc-1", "doc-2"],
      extractedAt: "2026-04-01T00:00:00Z",
      pipeline: { stages: ["ingestion", "extraction", "policy"] },
    },
    policies: [
      {
        code: "POL-PENSION-WD-001",
        title: "조기 중도인출 조건",
        condition: "퇴직 전 인출 요청",
        criteria: "무주택자 + 6개월 이상 가입",
        outcome: "중도인출 허용",
        confidence: 0.9,
        source: {
          type: "reverse-engineering",
          path: "src/pension.java",
          section: "validateEarlyWithdrawal",
          confidence: 0.85,
        },
      },
    ],
    ontologyRef: { termUris: ["https://ontology.example/pension/early-withdrawal"] },
    ...overrides,
  });
}

function makeEnv(opts: { found?: boolean; r2Content?: string | null } = {}): Env {
  const { found = true, r2Content = makeSkillJson() } = opts;

  const dbRow = found
    ? { skill_id: "SK-001", domain: "pension", r2_key: "skill-packages/SK-001.skill.json", created_at: "2026-04-01T00:00:00Z" }
    : null;

  const r2Object = r2Content !== null
    ? { text: async () => r2Content }
    : null;

  return {
    DB_SKILL: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(dbRow) }),
      }),
    },
    R2_SKILL_PACKAGES: {
      get: vi.fn().mockResolvedValue(r2Object),
    },
  } as unknown as Env;
}

describe("handleProvenanceResolve", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns full provenance on D1 + R2 hit", async () => {
    const res = await handleProvenanceResolve(makeRequest(), makeEnv(), "SK-001");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Record<string, unknown> };
    const data = body.data;
    expect(data["skillId"]).toBe("SK-001");
    expect(data["domain"]).toBe("pension");
    expect((data["policies"] as unknown[]).length).toBe(1);
    expect((data["sources"] as unknown[]).length).toBe(1);
    expect((data["documentIds"] as unknown[]).length).toBe(2);
    expect((data["pipelineStages"] as unknown[]).length).toBe(3);
  });

  it("returns 404 when skill not found in D1", async () => {
    const res = await handleProvenanceResolve(makeRequest(), makeEnv({ found: false }), "SK-NONE");
    expect(res.status).toBe(404);
  });

  it("returns 200 with empty provenance when R2 object missing", async () => {
    const res = await handleProvenanceResolve(makeRequest(), makeEnv({ r2Content: null }), "SK-001");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Record<string, unknown> };
    expect((body.data["policies"] as unknown[]).length).toBe(0);
    expect((body.data["sources"] as unknown[]).length).toBe(0);
  });

  it("deduplicates sources with same path+section", async () => {
    const json = makeSkillJson({
      policies: [
        { code: "POL-001", title: "A", condition: "", criteria: "", outcome: "", confidence: 0.8, source: { type: "inference", path: "a.java", section: "method1" } },
        { code: "POL-002", title: "B", condition: "", criteria: "", outcome: "", confidence: 0.8, source: { type: "inference", path: "a.java", section: "method1" } },
        { code: "POL-003", title: "C", condition: "", criteria: "", outcome: "", confidence: 0.8, source: { type: "inference", path: "b.java", section: "method2" } },
      ],
    });
    const res = await handleProvenanceResolve(makeRequest(), makeEnv({ r2Content: json }), "SK-001");
    const body = await res.json() as { data: Record<string, unknown> };
    expect((body.data["sources"] as unknown[]).length).toBe(2);
    expect((body.data["policies"] as unknown[]).length).toBe(3);
  });
});
