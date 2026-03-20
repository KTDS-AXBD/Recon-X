import { describe, it, expect } from "vitest";
import { generateDataModel } from "../generators/data-model.js";
import type { Env } from "../../env.js";
import type { TermRow } from "../collector.js";

// skipLlm=true로 기계적 변환만 테스트 (LLM 의존 없음)
const mockEnv = {} as Env;

function makeTerm(overrides?: Partial<TermRow>): TermRow {
  return {
    term_id: "t-001",
    ontology_id: "ont-001",
    label: "사용자",
    definition: "서비스 이용자",
    skos_uri: null,
    broader_term_id: null,
    term_type: "entity",
    ...overrides,
  };
}

describe("generateDataModel (mechanical mode)", () => {
  it("entity → CREATE TABLE 생성", async () => {
    const terms = [
      makeTerm({ term_id: "t-001", label: "사용자", term_type: "entity" }),
    ];

    const result = await generateDataModel(mockEnv, terms, { skipLlm: true });

    expect(result.path).toBe("specs/02-data-model.md");
    expect(result.type).toBe("spec");
    expect(result.generatedBy).toBe("mechanical");
    expect(result.sourceCount).toBe(1);

    expect(result.content).toContain("# 데이터 모델 명세");
    expect(result.content).toContain("CREATE TABLE 사용자");
    expect(result.content).toContain("id TEXT PRIMARY KEY");
  });

  it("attribute → entity 하위 COLUMN 매핑 (broader_term_id)", async () => {
    const terms = [
      makeTerm({ term_id: "t-001", label: "사용자", term_type: "entity" }),
      makeTerm({
        term_id: "t-002",
        label: "이름",
        definition: "사용자 이름",
        term_type: "attribute",
        broader_term_id: "t-001",
      }),
      makeTerm({
        term_id: "t-003",
        label: "충전 금액",
        definition: "충전 금액",
        term_type: "attribute",
        broader_term_id: "t-001",
      }),
    ];

    const result = await generateDataModel(mockEnv, terms, { skipLlm: true });

    expect(result.content).toContain("CREATE TABLE 사용자");
    expect(result.content).toContain("이름 TEXT");
    expect(result.content).toContain("충전_금액 INTEGER");
  });

  it("relation → ERD에 관계 기록", async () => {
    const terms = [
      makeTerm({ term_id: "t-001", label: "사용자", term_type: "entity" }),
      makeTerm({ term_id: "t-002", label: "상품권", term_type: "entity" }),
      makeTerm({
        term_id: "t-003",
        label: "소유",
        definition: "사용자가 상품권을 소유",
        term_type: "relation",
      }),
    ];

    const result = await generateDataModel(mockEnv, terms, { skipLlm: true });

    expect(result.content).toContain("erDiagram");
    expect(result.content).toContain("소유");
    expect(result.content).toContain("사용자");
    expect(result.content).toContain("상품권");
  });

  it("Mermaid ERD에 entity 컬럼 포함", async () => {
    const terms = [
      makeTerm({ term_id: "t-001", label: "사용자", term_type: "entity" }),
      makeTerm({
        term_id: "t-002",
        label: "이메일",
        term_type: "attribute",
        broader_term_id: "t-001",
      }),
    ];

    const result = await generateDataModel(mockEnv, terms, { skipLlm: true });

    expect(result.content).toContain("erDiagram");
    expect(result.content).toContain("text id PK");
    expect(result.content).toContain("text 이메일");
  });

  it("빈 terms → 헤더 + 빈 테이블 메시지", async () => {
    const result = await generateDataModel(mockEnv, [], { skipLlm: true });

    expect(result.content).toContain("# 데이터 모델 명세");
    expect(result.content).toContain("총 용어: 0건");
    expect(result.content).toContain("테이블: 0개");
    expect(result.content).toContain("entity 타입 용어가 없어");
    expect(result.sourceCount).toBe(0);
  });

  it("broader_term_id 미매칭 attribute → 미할당 섹션", async () => {
    const terms = [
      makeTerm({ term_id: "t-001", label: "사용자", term_type: "entity" }),
      makeTerm({
        term_id: "t-010",
        label: "기타속성",
        definition: "orphan attribute",
        term_type: "attribute",
        broader_term_id: "t-999", // 존재하지 않는 entity
      }),
    ];

    const result = await generateDataModel(mockEnv, terms, { skipLlm: true });

    expect(result.content).toContain("미할당 속성");
    expect(result.content).toContain("기타속성");
  });
});
