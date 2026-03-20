import { describe, it, expect } from "vitest";
import { generateFeatureSpec, extractBlReferences, extractTableNames } from "../generators/feature-spec.js";
import type { Env } from "../../env.js";
import type { GeneratedFile } from "@ai-foundry/types";
import type { CollectedData, SkillRow, PolicyRow } from "../collector.js";

// skipLlm=true로 기계적 변환만 테스트 (LLM 의존 없음)
const mockEnv = {} as Env;

function makeSkill(overrides?: Partial<SkillRow>): SkillRow {
  return {
    skill_id: "sk-001",
    domain: "GIFTVOUCHER",
    subdomain: "CHARGE",
    version: "1.0.0",
    r2_key: "skill-packages/sk-001.json",
    policy_count: 5,
    trust_level: "reviewed",
    trust_score: 0.85,
    tags: "[]",
    status: "bundled",
    ...overrides,
  };
}

function makePolicy(overrides?: Partial<PolicyRow>): PolicyRow {
  return {
    policy_id: "pol-001",
    policy_code: "POL-GIFTVOUCHER-CHARGE-001",
    title: "충전 한도",
    condition: "월 충전 요청",
    criteria: "50만원 이하",
    outcome: "즉시 충전",
    source_document_id: "doc-1",
    source_page_ref: "p.3",
    source_excerpt: null,
    status: "approved",
    trust_level: "reviewed",
    trust_score: 0.85,
    tags: "[]",
    ...overrides,
  };
}

function makeCollectedData(overrides?: Partial<CollectedData>): CollectedData {
  return {
    policies: [],
    terms: [],
    skills: [],
    documents: [],
    extractions: [],
    ...overrides,
  };
}

function makeBlFile(content?: string): GeneratedFile {
  return {
    path: "specs/01-business-logic.md",
    content: content ?? "# 비즈니스 로직\n\nBL-001: 충전 한도 검증\nBL-002: 환불 처리\n",
    type: "spec",
    generatedBy: "mechanical",
    sourceCount: 2,
  };
}

function makeDmFile(content?: string): GeneratedFile {
  return {
    path: "specs/02-data-model.md",
    content: content ?? "# 데이터 모델\n\nCREATE TABLE users (\n  id TEXT\n);\n\nCREATE TABLE vouchers (\n  id TEXT\n);\n",
    type: "spec",
    generatedBy: "mechanical",
    sourceCount: 3,
  };
}

describe("extractBlReferences", () => {
  it("BL-NNN 패턴 추출", () => {
    const refs = extractBlReferences("BL-001: 충전\nBL-002: 환불\nBL-001 중복");
    expect(refs).toEqual(["BL-001", "BL-002"]);
  });
});

describe("extractTableNames", () => {
  it("CREATE TABLE 테이블명 추출", () => {
    const names = extractTableNames("CREATE TABLE users (\n  id TEXT\n);\nCREATE TABLE orders (\n  id TEXT\n);");
    expect(names).toEqual(["users", "orders"]);
  });
});

describe("generateFeatureSpec (mechanical mode)", () => {
  it("skill → FN 변환 + 구조 생성", async () => {
    const data = makeCollectedData({
      skills: [
        makeSkill({ skill_id: "sk-001", subdomain: "CHARGE" }),
        makeSkill({ skill_id: "sk-002", subdomain: "CANCEL" }),
      ],
    });

    const result = await generateFeatureSpec(mockEnv, data, makeBlFile(), makeDmFile(), { skipLlm: true });

    expect(result.path).toBe("specs/03-functions.md");
    expect(result.type).toBe("spec");
    expect(result.generatedBy).toBe("mechanical");
    expect(result.sourceCount).toBe(2);

    expect(result.content).toContain("# 기능 정의서");
    expect(result.content).toContain("FN-001");
    expect(result.content).toContain("FN-002");
    expect(result.content).toContain("CANCEL");
    expect(result.content).toContain("CHARGE");
  });

  it("BL 참조가 크로스 레퍼런스에 포함", async () => {
    const data = makeCollectedData({
      skills: [makeSkill()],
    });

    const result = await generateFeatureSpec(
      mockEnv,
      data,
      makeBlFile("내용에 BL-001과 BL-003이 있음"),
      makeDmFile(),
      { skipLlm: true },
    );

    expect(result.content).toContain("크로스 레퍼런스");
    expect(result.content).toContain("BL-001");
    expect(result.content).toContain("BL-003");
  });

  it("테이블 참조가 크로스 레퍼런스에 포함", async () => {
    const data = makeCollectedData({
      skills: [makeSkill()],
    });

    const result = await generateFeatureSpec(
      mockEnv,
      data,
      makeBlFile(),
      makeDmFile("CREATE TABLE users (\n  id TEXT\n);\nCREATE TABLE accounts (\n  id TEXT\n);"),
      { skipLlm: true },
    );

    expect(result.content).toContain("크로스 레퍼런스");
    expect(result.content).toContain("users");
    expect(result.content).toContain("accounts");
  });

  it("관련 정책 매핑 → 처리 플로우에 표시", async () => {
    const data = makeCollectedData({
      skills: [makeSkill({ domain: "GIFTVOUCHER", subdomain: "CHARGE" })],
      policies: [
        makePolicy({ policy_code: "POL-GIFTVOUCHER-CHARGE-001", condition: "월 충전 요청" }),
        makePolicy({ policy_id: "p2", policy_code: "POL-GIFTVOUCHER-CHARGE-002", condition: "일 한도 초과" }),
      ],
    });

    const result = await generateFeatureSpec(mockEnv, data, makeBlFile(), makeDmFile(), { skipLlm: true });

    expect(result.content).toContain("처리 플로우");
    expect(result.content).toContain("POL-GIFTVOUCHER-CHARGE-001");
    expect(result.content).toContain("월 충전 요청");
  });

  it("에러 케이스 포함", async () => {
    const data = makeCollectedData({
      skills: [makeSkill()],
    });

    const result = await generateFeatureSpec(mockEnv, data, makeBlFile(), makeDmFile(), { skipLlm: true });

    expect(result.content).toContain("에러 케이스");
    expect(result.content).toContain("INVALID_INPUT");
    expect(result.content).toContain("NOT_FOUND");
    expect(result.content).toContain("400");
    expect(result.content).toContain("404");
  });

  it("skipLlm=true → generatedBy=mechanical", async () => {
    const data = makeCollectedData({
      skills: [makeSkill()],
    });

    const result = await generateFeatureSpec(mockEnv, data, makeBlFile(), makeDmFile(), { skipLlm: true });

    expect(result.generatedBy).toBe("mechanical");
  });
});
