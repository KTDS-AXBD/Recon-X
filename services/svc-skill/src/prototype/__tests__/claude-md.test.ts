import { describe, it, expect } from "vitest";
import { generateClaudeMd, type GeneratorOutputs } from "../generators/claude-md.js";
import type { GeneratedFile } from "@ai-foundry/types";
import type { CollectedData } from "../collector.js";

function mockCollectedData(overrides?: Partial<CollectedData>): CollectedData {
  return {
    policies: [{ policy_id: "p1", policy_code: "POL-GIFT-PAY-001", title: "t", condition: "c", criteria: "cr", outcome: "o", source_document_id: "d1", source_page_ref: null, source_excerpt: null, status: "approved", trust_level: "reviewed", trust_score: 0.9, tags: "[]" }],
    terms: [{ term_id: "t1", ontology_id: "o1", label: "결제", definition: "payment", skos_uri: null, broader_term_id: null, term_type: "entity" }],
    skills: [{ skill_id: "s1", domain: "온누리상품권", subdomain: "결제", version: "1.0.0", r2_key: "k", policy_count: 5, trust_level: "reviewed", trust_score: 0.8, status: "bundled", tags: "[]" }],
    documents: [{ document_id: "d1", filename: "test.pdf", content_type: "application/pdf", status: "parsed", organization_id: "LPON" }],
    extractions: [],
    ...overrides,
  };
}

function mockFile(path: string, content: string): GeneratedFile {
  return { path, content, type: "spec", generatedBy: "mechanical", sourceCount: 1 };
}

const mockOutputs: GeneratorOutputs = {
  bl: mockFile("specs/01-business-logic.md", "## BL-001: Test\n## BL-002: Test2"),
  dm: mockFile("specs/02-data-model.md", "CREATE TABLE payments (\n);\nCREATE TABLE vouchers (\n);"),
  fs: mockFile("specs/03-functions.md", "## FN-001: 충전\n## FN-002: 결제\n## FN-003: 취소"),
  arch: mockFile("specs/04-architecture.md", "| Payment | 결제 처리 |\n| Refund | 환불 처리 |"),
  api: mockFile("specs/05-api.md", "| API-001 | POST | /charges |\n| API-002 | POST | /payments |"),
};

describe("G8: generateClaudeMd", () => {
  it("파일 경로가 CLAUDE.md", () => {
    const result = generateClaudeMd("LPON", mockCollectedData(), mockOutputs);
    expect(result.path).toBe("CLAUDE.md");
    expect(result.type).toBe("meta");
    expect(result.generatedBy).toBe("template");
  });

  it("스펙 파일 참조가 포함됨", () => {
    const result = generateClaudeMd("LPON", mockCollectedData(), mockOutputs);
    expect(result.content).toContain("specs/01-business-logic.md");
    expect(result.content).toContain("specs/02-data-model.md");
    expect(result.content).toContain("specs/03-functions.md");
    expect(result.content).toContain("specs/04-architecture.md");
    expect(result.content).toContain("specs/05-api.md");
  });

  it("데이터 수치가 반영됨", () => {
    const data = mockCollectedData({
      policies: Array.from({ length: 50 }, (_, i) => ({
        policy_id: `p${i}`, policy_code: `POL-X-${i}`, title: "t", condition: "c",
        criteria: "cr", outcome: "o", source_document_id: "d1", source_page_ref: null,
        source_excerpt: null, status: "approved", trust_level: "reviewed", trust_score: 0.9, tags: "[]",
      })),
    });
    const result = generateClaudeMd("LPON", data, mockOutputs);
    expect(result.content).toContain("| 정책 (approved) | 50 |");
  });

  it("도메인이 skills에서 추론됨", () => {
    const result = generateClaudeMd("LPON", mockCollectedData(), mockOutputs);
    expect(result.content).toContain("온누리상품권");
  });

  it("테이블/기능/API 수가 카운트됨", () => {
    const result = generateClaudeMd("LPON", mockCollectedData(), mockOutputs);
    expect(result.content).toContain("2개 테이블");
    expect(result.content).toContain("3개 기능");
    expect(result.content).toContain("2개 API");
  });

  it("구현 스택 정보가 포함됨", () => {
    const result = generateClaudeMd("LPON", mockCollectedData(), mockOutputs);
    expect(result.content).toContain("Hono");
    expect(result.content).toContain("Vitest");
    expect(result.content).toContain("better-sqlite3");
  });
});
