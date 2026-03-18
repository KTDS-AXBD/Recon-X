import { describe, it, expect } from "vitest";
import { generateSkillMd } from "./skill-md-generator.js";
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
        tags: ["중도인출"],
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

describe("generateSkillMd", () => {
  it("includes frontmatter with name and description", () => {
    const md = generateSkillMd(makePkg());
    expect(md).toContain("---");
    expect(md).toContain("name:");
    expect(md).toContain("user-invocable: true");
    expect(md).toContain("allowed-tools:");
  });

  it("includes domain in frontmatter description", () => {
    const md = generateSkillMd(makePkg());
    expect(md).toContain("퇴직연금");
    expect(md).toContain("1개 정책 기반");
  });

  it("includes trust info in frontmatter", () => {
    const md = generateSkillMd(makePkg());
    expect(md).toContain("Trust: reviewed (0.8)");
  });

  it("generates policy table with correct headers", () => {
    const md = generateSkillMd(makePkg());
    expect(md).toContain("| 코드 | 제목 | 신뢰도 |");
    expect(md).toContain("POL-PENSION-WD-001");
    expect(md).toContain("중도인출 조건");
  });

  it("handles subdomain in name", () => {
    const pkg = makePkg({
      metadata: {
        ...makePkg().metadata,
        subdomain: "중도인출",
      },
    });
    const md = generateSkillMd(pkg);
    expect(md).toContain("name: 퇴직연금-중도인출");
    expect(md).toContain("# 퇴직연금 / 중도인출 Skill");
  });

  it("includes usage section", () => {
    const md = generateSkillMd(makePkg());
    expect(md).toContain("## 사용법");
    expect(md).toContain("rules/policies/");
  });

  it("handles multiple policies in table", () => {
    const pkg = makePkg({
      policies: [
        {
          code: "POL-PENSION-WD-001",
          title: "정책 A",
          condition: "c1",
          criteria: "cr1",
          outcome: "o1",
          source: { documentId: "d1" },
          trust: { level: "reviewed", score: 0.8 },
          tags: [],
        },
        {
          code: "POL-PENSION-EN-001",
          title: "정책 B",
          condition: "c2",
          criteria: "cr2",
          outcome: "o2",
          source: { documentId: "d2" },
          trust: { level: "validated", score: 0.95 },
          tags: [],
        },
      ],
    });
    const md = generateSkillMd(pkg);
    expect(md).toContain("POL-PENSION-WD-001");
    expect(md).toContain("POL-PENSION-EN-001");
    expect(md).toContain("2개 정책 기반");
  });
});
