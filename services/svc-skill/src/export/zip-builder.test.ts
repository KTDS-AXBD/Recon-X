import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { buildCcSkillZip } from "./zip-builder.js";
import type { SkillPackage } from "@ai-foundry/types";

function makePkg(overrides?: Partial<SkillPackage>): SkillPackage {
  return {
    $schema: "https://ai-foundry.ktds.com/schemas/skill/v1",
    skillId: "sk-test-001",
    metadata: {
      domain: "퇴직연금",
      language: "ko",
      version: "1.0.0",
      createdAt: "2026-02-28T00:00:00.000Z",
      updatedAt: "2026-02-28T00:00:00.000Z",
      author: "test",
      tags: [],
    },
    policies: [
      {
        code: "POL-PENSION-WD-001",
        title: "중도인출 조건",
        condition: "가입 후 5년 경과",
        criteria: "잔액 50% 이내",
        outcome: "중도인출 허용",
        source: { documentId: "doc-1" },
        trust: { level: "reviewed", score: 0.8 },
        tags: [],
      },
    ],
    trust: { level: "reviewed", score: 0.8 },
    ontologyRef: { graphId: "g-1", termUris: ["urn:1"] },
    provenance: {
      sourceDocumentIds: ["doc-1"],
      organizationId: "org-1",
      extractedAt: "2026-02-28T00:00:00.000Z",
      pipeline: { stages: ["s1"], models: { s1: "claude" } },
    },
    adapters: {},
    ...overrides,
  };
}

describe("buildCcSkillZip", () => {
  it("produces a valid ZIP with correct structure", () => {
    const pkg = makePkg();
    const skillMd = "# Test SKILL.md";
    const policyMds = new Map([["POL-PENSION-WD-001", "# Policy 1"]]);

    const zip = buildCcSkillZip(pkg, skillMd, policyMds);
    expect(zip).toBeInstanceOf(Uint8Array);
    expect(zip.byteLength).toBeGreaterThan(0);

    const unzipped = unzipSync(zip);
    const paths = Object.keys(unzipped);

    expect(paths).toContain(".claude/skills/퇴직연금/SKILL.md");
    expect(paths).toContain(".claude/skills/퇴직연금/rules/domain-overview.md");
    expect(paths).toContain(".claude/skills/퇴직연금/rules/policies/pol-pension-wd-001.md");
  });

  it("contains correct SKILL.md content", () => {
    const pkg = makePkg();
    const skillMd = "# Test content here";
    const policyMds = new Map([["POL-PENSION-WD-001", "# P1"]]);

    const zip = buildCcSkillZip(pkg, skillMd, policyMds);
    const unzipped = unzipSync(zip);
    const data = unzipped[".claude/skills/퇴직연금/SKILL.md"];
    expect(data).toBeDefined();
    expect(strFromU8(data!)).toBe("# Test content here");
  });

  it("contains correct policy file content", () => {
    const pkg = makePkg();
    const policyMds = new Map([["POL-PENSION-WD-001", "# Policy markdown"]]);

    const zip = buildCcSkillZip(pkg, "skill", policyMds);
    const unzipped = unzipSync(zip);
    const data = unzipped[".claude/skills/퇴직연금/rules/policies/pol-pension-wd-001.md"];
    expect(data).toBeDefined();
    expect(strFromU8(data!)).toBe("# Policy markdown");
  });

  it("uses subdomain in path when present", () => {
    const pkg = makePkg({
      metadata: { ...makePkg().metadata, subdomain: "중도인출" },
    });
    const policyMds = new Map([["POL-PENSION-WD-001", "# P1"]]);

    const zip = buildCcSkillZip(pkg, "skill", policyMds);
    const unzipped = unzipSync(zip);
    const paths = Object.keys(unzipped);

    expect(paths.some((p) => p.includes("퇴직연금-중도인출"))).toBe(true);
  });

  it("includes domain-overview.md with provenance info", () => {
    const pkg = makePkg();
    const policyMds = new Map([["POL-PENSION-WD-001", "# P1"]]);

    const zip = buildCcSkillZip(pkg, "skill", policyMds);
    const unzipped = unzipSync(zip);
    const data = unzipped[".claude/skills/퇴직연금/rules/domain-overview.md"];
    expect(data).toBeDefined();
    const content = strFromU8(data!);
    expect(content).toContain("도메인 개요");
    expect(content).toContain("doc-1");
  });

  it("handles multiple policies", () => {
    const pkg = makePkg({
      policies: [
        {
          code: "POL-PENSION-WD-001",
          title: "p1",
          condition: "c1",
          criteria: "cr1",
          outcome: "o1",
          source: { documentId: "d1" },
          trust: { level: "reviewed", score: 0.8 },
          tags: [],
        },
        {
          code: "POL-PENSION-EN-001",
          title: "p2",
          condition: "c2",
          criteria: "cr2",
          outcome: "o2",
          source: { documentId: "d2" },
          trust: { level: "validated", score: 0.95 },
          tags: [],
        },
      ],
    });
    const policyMds = new Map([
      ["POL-PENSION-WD-001", "# P1"],
      ["POL-PENSION-EN-001", "# P2"],
    ]);

    const zip = buildCcSkillZip(pkg, "skill", policyMds);
    const unzipped = unzipSync(zip);
    const paths = Object.keys(unzipped);

    expect(paths).toContain(".claude/skills/퇴직연금/rules/policies/pol-pension-wd-001.md");
    expect(paths).toContain(".claude/skills/퇴직연금/rules/policies/pol-pension-en-001.md");
  });
});
