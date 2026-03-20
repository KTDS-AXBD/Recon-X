import { describe, it, expect } from "vitest";
import { generateApiSpec } from "../generators/api-spec.js";
import type { Env } from "../../env.js";
import type { GeneratedFile } from "@ai-foundry/types";

// skipLlm=true로 기계적 변환만 테스트 (LLM 의존 없음)
const mockEnv = {} as Env;

function makeFsFile(fnEntries: string[]): GeneratedFile {
  const lines = [
    "# 기능 정의서",
    "",
    ...fnEntries.map((entry) => `## ${entry}\n\n설명 내용\n`),
  ];
  return {
    path: "specs/03-functions.md",
    content: lines.join("\n"),
    type: "spec",
    generatedBy: "mechanical",
    sourceCount: fnEntries.length,
  };
}

describe("generateApiSpec (mechanical mode)", () => {
  it("FN → REST 엔드포인트 매핑", async () => {
    const fsFile = makeFsFile([
      "FN-001: 상품권 조회",
      "FN-002: 충전 등록",
    ]);

    const result = await generateApiSpec(mockEnv, fsFile, { skipLlm: true });

    expect(result.path).toBe("specs/05-api.md");
    expect(result.type).toBe("spec");
    expect(result.generatedBy).toBe("mechanical");
    expect(result.sourceCount).toBe(2);

    // 조회 → GET, 등록 → POST
    expect(result.content).toContain("GET");
    expect(result.content).toContain("POST");
    expect(result.content).toContain("/api/v1/");
  });

  it("JSON Schema 스켈레톤 포함", async () => {
    const fsFile = makeFsFile([
      "FN-001: 상품권 등록",
    ]);

    const result = await generateApiSpec(mockEnv, fsFile, { skipLlm: true });

    // POST 요청에 JSON Schema 포함
    expect(result.content).toContain("\"type\": \"object\"");
    expect(result.content).toContain("\"properties\"");
  });

  it("공통 에러 코드 테이블 포함", async () => {
    const fsFile = makeFsFile(["FN-001: 테스트"]);

    const result = await generateApiSpec(mockEnv, fsFile, { skipLlm: true });

    expect(result.content).toContain("## 3. 공통 에러 코드");
    expect(result.content).toContain("400");
    expect(result.content).toContain("401");
    expect(result.content).toContain("403");
    expect(result.content).toContain("404");
    expect(result.content).toContain("422");
    expect(result.content).toContain("500");
  });

  it("리소스별 그룹핑", async () => {
    const fsFile = makeFsFile([
      "FN-001: 상품권 조회",
      "FN-002: 상품권 등록",
      "FN-003: 환불 처리",
    ]);

    const result = await generateApiSpec(mockEnv, fsFile, { skipLlm: true });

    expect(result.content).toContain("## 2. 리소스별 상세");
    // 같은 리소스(상품권)는 하나의 섹션으로 그룹핑
    expect(result.content).toContain("### 상품권");
  });

  it("빈 FN → 빈 API 목록 + 기본 구조 유지", async () => {
    const fsFile = makeFsFile([]);

    const result = await generateApiSpec(mockEnv, fsFile, { skipLlm: true });

    expect(result.content).toContain("# API 명세");
    expect(result.content).toContain("총 엔드포인트: 0건");
    expect(result.content).toContain("리소스 그룹: 0개");
    expect(result.sourceCount).toBe(0);
  });
});
