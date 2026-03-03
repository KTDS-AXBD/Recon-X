import { describe, it, expect } from "vitest";
import { parseClassificationResponse } from "../llm/classify-terms.js";

const TERMS = [
  { label: "퇴직연금", definition: "test" },
  { label: "가입", definition: "test" },
  { label: "적립비율", definition: "test" },
];

describe("parseClassificationResponse", () => {
  it("정상 JSON 응답을 파싱한다", () => {
    const content = JSON.stringify([
      { label: "퇴직연금", type: "entity" },
      { label: "가입", type: "relation" },
      { label: "적립비율", type: "attribute" },
    ]);

    const result = parseClassificationResponse(content, TERMS);
    expect(result).toHaveLength(3);
    expect(result[0]?.type).toBe("entity");
    expect(result[1]?.type).toBe("relation");
    expect(result[2]?.type).toBe("attribute");
  });

  it("마크다운 코드블록 내 JSON을 추출한다", () => {
    const content = '```json\n[{"label":"퇴직연금","type":"entity"},{"label":"가입","type":"relation"},{"label":"적립비율","type":"attribute"}]\n```';
    const result = parseClassificationResponse(content, TERMS);
    expect(result[0]?.type).toBe("entity");
    expect(result[1]?.type).toBe("relation");
  });

  it("배열 길이가 입력보다 적으면 나머지를 entity로 처리한다", () => {
    const content = JSON.stringify([
      { label: "퇴직연금", type: "entity" },
    ]);
    const result = parseClassificationResponse(content, TERMS);
    expect(result).toHaveLength(3);
    expect(result[0]?.type).toBe("entity");
    expect(result[1]?.type).toBe("entity"); // fallback
    expect(result[2]?.type).toBe("entity"); // fallback
  });

  it("유효하지 않은 type 값은 entity로 대체한다", () => {
    const content = JSON.stringify([
      { label: "퇴직연금", type: "invalid_type" },
      { label: "가입", type: "relation" },
      { label: "적립비율", type: 123 },
    ]);
    const result = parseClassificationResponse(content, TERMS);
    expect(result[0]?.type).toBe("entity"); // invalid → fallback
    expect(result[1]?.type).toBe("relation"); // valid
    expect(result[2]?.type).toBe("entity"); // non-string → fallback
  });

  it("JSON이 아닌 응답이면 전부 entity로 반환한다", () => {
    const content = "죄송합니다. 분류할 수 없습니다.";
    const result = parseClassificationResponse(content, TERMS);
    expect(result).toHaveLength(3);
    expect(result.every((t) => t.type === "entity")).toBe(true);
  });

  it("빈 배열 응답이면 원본 길이만큼 entity로 반환한다", () => {
    const content = "[]";
    const result = parseClassificationResponse(content, TERMS);
    expect(result).toHaveLength(3);
    expect(result.every((t) => t.type === "entity")).toBe(true);
  });

  it("잘못된 JSON이면 전부 entity로 반환한다", () => {
    const content = "[{broken json";
    const result = parseClassificationResponse(content, TERMS);
    expect(result).toHaveLength(3);
    expect(result.every((t) => t.type === "entity")).toBe(true);
  });

  it("원본 용어의 label과 definition을 유지한다", () => {
    const content = JSON.stringify([
      { label: "퇴직연금", type: "entity" },
      { label: "가입", type: "relation" },
      { label: "적립비율", type: "attribute" },
    ]);
    const result = parseClassificationResponse(content, TERMS);
    expect(result[0]?.label).toBe("퇴직연금");
    expect(result[0]?.definition).toBe("test");
  });
});
