import { describe, it, expect } from "vitest";
import type { Policy, SkillPackage } from "@ai-foundry/types";
import {
  scoreCompleteness,
  scoreHumanReviewable,
  scoreMachineReadable,
  scoreSemanticConsistency,
  scoreSkill,
  scoreTestable,
  scoreTraceable,
} from "./ai-ready.js";

// ── Fixtures ─────────────────────────────────────────────────────────

function makePolicy(overrides?: Partial<Policy>): Policy {
  return {
    code: "POL-GV-CHARGE-001",
    title: "충전 한도 판정",
    description: "월 충전 한도를 초과하지 않는지 판정",
    condition: "사용자의 월 누적 충전액이 존재하고 충전 요청이 들어온 경우",
    criteria: "월 누적 충전액 + 요청 금액이 50만원 이하일 것 (한도 초과 여부 판정)",
    outcome: "충전을 승인하고 chargeLimit 필드를 갱신하거나 한도 초과로 거절 응답 반환",
    source: {
      documentId: "doc-1",
      pageRef: "p.3",
      excerpt: "월 충전 한도는 50만원을 초과할 수 없다 (API /charge/limit 참조, fieldName: chargeLimit)",
    },
    trust: { level: "reviewed", score: 0.85 },
    tags: ["충전", "한도"],
    ...overrides,
  };
}

function makeSkill(overrides?: Partial<SkillPackage>): SkillPackage {
  const policy = makePolicy();
  return {
    $schema: "https://ai-foundry.ktds.com/schemas/skill/v1",
    skillId: "11111111-2222-3333-4444-555555555555",
    metadata: {
      domain: "온누리상품권",
      subdomain: "결제",
      language: "ko",
      version: "1.0.0",
      createdAt: "2026-04-16T00:00:00.000Z",
      updatedAt: "2026-04-16T00:00:00.000Z",
      author: "poc-tester",
      tags: ["충전"],
    },
    policies: [policy, { ...policy, code: "POL-GV-CHARGE-002" }, { ...policy, code: "POL-GV-CHARGE-003" }],
    trust: { level: "reviewed", score: 0.85 },
    ontologyRef: {
      graphId: "graph-1",
      termUris: ["urn:onnuri:term:charging", "urn:onnuri:term:limit"],
      skosConceptScheme: "urn:onnuri:skos:charge",
    },
    provenance: {
      sourceDocumentIds: ["doc-1"],
      organizationId: "lpon",
      extractedAt: "2026-04-16T00:00:00.000Z",
      pipeline: {
        stages: ["ingestion", "extraction", "policy"],
        models: { policy: "claude-opus" },
      },
    },
    adapters: {},
    ...overrides,
  };
}

// ── 1. Machine-readable ─────────────────────────────────────────────

describe("scoreMachineReadable", () => {
  it("passes for valid package with schema URL + Zod OK + regex match", () => {
    const r = scoreMachineReadable(makeSkill());
    expect(r.score).toBeGreaterThanOrEqual(0.9);
    expect(r.pass).toBe(true);
    expect(r.signals["schemaOk"]).toBe(true);
    expect(r.signals["zodOk"]).toBe(true);
    expect(r.signals["codeMatchRate"]).toBe(1);
  });

  it("fails when $schema missing", () => {
    const pkg = makeSkill({ $schema: "" });
    const r = scoreMachineReadable(pkg);
    expect(r.pass).toBe(false);
    expect(r.signals["schemaOk"]).toBe(false);
  });
});

// ── 2. Semantic Consistency ──────────────────────────────────────────

describe("scoreSemanticConsistency", () => {
  it("passes when termUris + skos + single domain", () => {
    const r = scoreSemanticConsistency(makeSkill());
    expect(r.pass).toBe(true);
    expect(r.signals["domainConsistent"]).toBe(true);
  });

  it("fails when termUris empty and skos missing", () => {
    const pkg = makeSkill({
      ontologyRef: { graphId: "g", termUris: [] },
    });
    const r = scoreSemanticConsistency(pkg);
    expect(r.pass).toBe(false);
    expect(r.signals["termUriCount"]).toBe(0);
  });

  it("detects mixed domain in policy codes", () => {
    const pkg = makeSkill({
      policies: [makePolicy({ code: "POL-GV-CHARGE-001" }), makePolicy({ code: "POL-PENSION-WD-001" })],
    });
    const r = scoreSemanticConsistency(pkg);
    expect(r.signals["distinctPolicyDomains"]).toBe(2);
    expect(r.signals["domainConsistent"]).toBe(false);
  });
});

// ── 3. Testable ──────────────────────────────────────────────────────

describe("scoreTestable", () => {
  it("passes for 3+ long policies with excerpts", () => {
    const r = scoreTestable(makeSkill());
    expect(r.pass).toBe(true);
    expect(r.signals["longRatio"]).toBe(1);
    expect(r.signals["excerptRatio"]).toBe(1);
  });

  it("fails for short policies without excerpts", () => {
    const shortPolicy = makePolicy({
      condition: "짧음",
      criteria: "짧음",
      outcome: "짧음",
      source: { documentId: "d1" },
    });
    const r = scoreTestable(makeSkill({ policies: [shortPolicy] }));
    expect(r.pass).toBe(false);
    expect(r.signals["longRatio"]).toBe(0);
    expect(r.signals["excerptRatio"]).toBe(0);
  });
});

// ── 4. Traceable ─────────────────────────────────────────────────────

describe("scoreTraceable", () => {
  it("passes when sourceDocs set covers all policies + 3+ stages", () => {
    const r = scoreTraceable(makeSkill());
    expect(r.pass).toBe(true);
    expect(r.signals["coveredRatio"]).toBe(1);
  });

  it("fails when provenance has no source docs", () => {
    const pkg = makeSkill({
      provenance: {
        sourceDocumentIds: [],
        organizationId: "lpon",
        extractedAt: "2026-04-16T00:00:00.000Z",
        pipeline: { stages: ["ingestion"], models: {} },
      },
    });
    const r = scoreTraceable(pkg);
    expect(r.pass).toBe(false);
    expect(r.signals["sourceDocCount"]).toBe(0);
    expect(r.signals["stageCount"]).toBe(1);
  });
});

// ── 5. Completeness (B + T + Q) ──────────────────────────────────────

describe("scoreCompleteness", () => {
  it("passes with high business + technical + quality signals", () => {
    const r = scoreCompleteness(makeSkill());
    expect(r.pass).toBe(true);
    expect(r.btq.business).toBeGreaterThan(0.5);
    // Technical signals in fixture: API /charge/limit + camelCase fieldName "chargeLimit" → should pass
    expect(r.btq.technical).toBeGreaterThan(0);
    expect(r.btq.quality).toBeGreaterThan(0);
  });

  it("business near 1 even without adapters", () => {
    const r = scoreCompleteness(makeSkill());
    expect(r.btq.business).toBeCloseTo(1.0, 2);
  });

  it("low technical when no API/fields mentioned", () => {
    const plain = makePolicy({
      title: "단순 정책",
      description: "업무 규칙만 있고 시스템 용어는 없다",
      condition: "특정 조건이 성립할 경우를 가정한다",
      criteria: "월 30만원 이상일 것이라는 기준",
      outcome: "정책을 적용하거나 예외 처리한다",
      source: { documentId: "doc-1", excerpt: "업무 설명 외 기술 용어 없음" },
      tags: ["충전"],
    });
    const r = scoreCompleteness(makeSkill({ policies: [plain, plain, plain] }));
    expect(r.btq.technical).toBeLessThan(0.5);
  });
});

// ── 6. Human-reviewable ──────────────────────────────────────────────

describe("scoreHumanReviewable", () => {
  it("passes when reviewed + titles + author present", () => {
    const r = scoreHumanReviewable(makeSkill());
    expect(r.pass).toBe(true);
  });

  it("fails when trust.level unreviewed and author missing", () => {
    const pkg = makeSkill({
      trust: { level: "unreviewed", score: 0.3 },
      metadata: { ...makeSkill().metadata, author: "" },
    });
    const r = scoreHumanReviewable(pkg);
    expect(r.pass).toBe(false);
    expect(r.signals["trustLevel"]).toBe("unreviewed");
    expect(r.signals["authorOk"]).toBe(false);
  });
});

// ── Aggregate scoreSkill ─────────────────────────────────────────────

describe("scoreSkill", () => {
  it("returns AI-Ready for a well-formed LPON skill", () => {
    const r = scoreSkill(makeSkill());
    expect(r.passAiReady).toBe(true);
    expect(r.overall).toBeGreaterThanOrEqual(0.8);
    expect(r.failedCriteria).not.toContain("overall");
  });

  it("reports failed criteria when traceability broken", () => {
    const pkg = makeSkill({
      provenance: {
        sourceDocumentIds: [],
        organizationId: "lpon",
        extractedAt: "2026-04-16T00:00:00.000Z",
        pipeline: { stages: ["ingestion"], models: {} },
      },
    });
    const r = scoreSkill(pkg);
    expect(r.failedCriteria).toContain("traceable");
  });

  it("overall drops when multiple criteria fail", () => {
    const weakPolicy = makePolicy({
      condition: "짧",
      criteria: "짧",
      outcome: "짧",
      source: { documentId: "x" },
    });
    const pkg = makeSkill({
      $schema: "",
      policies: [weakPolicy],
      ontologyRef: { graphId: "g", termUris: [] },
      trust: { level: "unreviewed", score: 0 },
      adapters: {},
    });
    const r = scoreSkill(pkg);
    expect(r.passAiReady).toBe(false);
    expect(r.failedCriteria.length).toBeGreaterThan(2);
  });
});
