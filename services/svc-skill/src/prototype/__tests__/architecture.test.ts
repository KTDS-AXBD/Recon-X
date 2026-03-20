import { describe, it, expect } from "vitest";
import { generateArchitecture } from "../generators/architecture.js";
import type { Env } from "../../env.js";
import type { GeneratedFile } from "@ai-foundry/types";
import type { CollectedData } from "../collector.js";

// skipLlm=true로 기계적 변환만 테스트 (LLM 의존 없음)
const mockEnv = {} as Env;

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

describe("generateArchitecture (mechanical mode)", () => {
  it("FN 목록에서 모듈 추출 + 구조 생성", async () => {
    const fsFile = makeFsFile([
      "FN-001: 충전 요청 처리",
      "FN-002: 충전 한도 조회",
      "FN-003: 환불 처리",
    ]);

    const result = await generateArchitecture(mockEnv, makeCollectedData(), fsFile, { skipLlm: true });

    expect(result.path).toBe("specs/04-architecture.md");
    expect(result.type).toBe("spec");
    expect(result.generatedBy).toBe("mechanical");
    expect(result.sourceCount).toBe(3);

    expect(result.content).toContain("# 아키텍처 명세");
    expect(result.content).toContain("## 1. 모듈 구성");
    expect(result.content).toContain("FN-001");
    expect(result.content).toContain("FN-002");
    expect(result.content).toContain("FN-003");
  });

  it("RBAC 매트릭스 포함", async () => {
    const fsFile = makeFsFile([
      "FN-001: 충전 요청",
      "FN-002: 환불 처리",
    ]);

    const result = await generateArchitecture(mockEnv, makeCollectedData(), fsFile, { skipLlm: true });

    expect(result.content).toContain("## 3. RBAC 매트릭스");
    expect(result.content).toContain("USER");
    expect(result.content).toContain("ADMIN");
    expect(result.content).toContain("SYSTEM");
    // 기본 권한: USER=R, ADMIN=RW, SYSTEM=RW
    expect(result.content).toContain("| R | RW | RW |");
  });

  it("비기능 요구사항 포함", async () => {
    const fsFile = makeFsFile(["FN-001: 테스트 기능"]);

    const result = await generateArchitecture(mockEnv, makeCollectedData(), fsFile, { skipLlm: true });

    expect(result.content).toContain("## 4. 비기능 요구사항");
    expect(result.content).toContain("100명");
    expect(result.content).toContain("< 500ms");
    expect(result.content).toContain("99.5%");
  });

  it("빈 FN → 빈 모듈 + 기본 구조 유지", async () => {
    const fsFile = makeFsFile([]);

    const result = await generateArchitecture(mockEnv, makeCollectedData(), fsFile, { skipLlm: true });

    expect(result.content).toContain("# 아키텍처 명세");
    expect(result.content).toContain("기능: 0건 | 모듈: 0개");
    expect(result.content).toContain("## 2. 레이어 아키텍처");
    expect(result.content).toContain("Presentation");
    expect(result.content).toContain("Infrastructure");
    expect(result.sourceCount).toBe(0);
  });
});
