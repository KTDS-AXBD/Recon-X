import { describe, it, expect } from "vitest";
import { generateScreenSpec } from "../generators/screen-spec.js";
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

function makeDmFile(tables: string[]): GeneratedFile {
  const sql = tables.map((t) => `CREATE TABLE ${t} (\n  id TEXT PRIMARY KEY\n);`).join("\n\n");
  return {
    path: "specs/02-data-model.md",
    content: `# 데이터 모델\n\n\`\`\`sql\n${sql}\n\`\`\``,
    type: "spec",
    generatedBy: "mechanical",
    sourceCount: tables.length,
  };
}

describe("generateScreenSpec (mechanical mode)", () => {
  it("FN이 있는 경우 화면 목록 생성", async () => {
    const fsFile = makeFsFile([
      "FN-001: 상품 목록 조회",
      "FN-002: 상품 등록",
      "FN-003: 상품 상세 보기",
    ]);
    const dmFile = makeDmFile(["products", "categories"]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result.path).toBe("specs/06-screens.md");
    expect(result.type).toBe("spec");
    expect(result.generatedBy).toBe("mechanical");
    expect(result.sourceCount).toBe(3);

    expect(result.content).toContain("# 화면 정의서");
    expect(result.content).toContain("SCR-001");
    expect(result.content).toContain("SCR-002");
    expect(result.content).toContain("SCR-003");
    expect(result.content).toContain("상품 목록 조회");
  });

  it("화면 유형 추론 — 목록→list, 등록→form, 상세→detail, 통계→dashboard, 승인→workflow", async () => {
    const fsFile = makeFsFile([
      "FN-001: 충전 목록 조회",
      "FN-002: 신규 등록",
      "FN-003: 상세 정보 보기",
      "FN-004: 통계 현황",
      "FN-005: 승인 검토",
    ]);
    const dmFile = makeDmFile([]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result.content).toContain("목록 화면");      // list
    expect(result.content).toContain("입력/수정 화면");  // form
    expect(result.content).toContain("상세 화면");       // detail
    expect(result.content).toContain("대시보드");        // dashboard
    expect(result.content).toContain("워크플로우 화면"); // workflow
  });

  it("빈 FN일 때 빈 화면 정의서 반환", async () => {
    const fsFile = makeFsFile([]);
    const dmFile = makeDmFile([]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result.content).toContain("# 화면 정의서");
    expect(result.content).toContain("총 화면: 0건");
    expect(result.content).toContain("FN 정의가 없어 화면을 생성할 수 없습니다.");
    expect(result.sourceCount).toBe(0);
  });

  it("DM 테이블명 추출 확인", async () => {
    const fsFile = makeFsFile(["FN-001: 주문 조회"]);
    const dmFile = makeDmFile(["orders", "order_items", "customers"]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result.content).toContain("orders");
    expect(result.content).toContain("order_items");
    expect(result.content).toContain("customers");
  });

  it("skipLlm=true일 때 mechanical 출력 — 사용자 흐름/에러 포함", async () => {
    const fsFile = makeFsFile(["FN-001: 계좌 목록 검색"]);
    const dmFile = makeDmFile(["accounts"]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result.generatedBy).toBe("mechanical");
    // list 유형 기본 필드
    expect(result.content).toContain("검색 조건");
    expect(result.content).toContain("페이지네이션");
    // 사용자 흐름
    expect(result.content).toContain("### 사용자 흐름");
    expect(result.content).toContain("목록 조회");
    // 에러 표시
    expect(result.content).toContain("### 에러 표시");
    expect(result.content).toContain("데이터 로딩 실패");
  });

  it("GeneratedFile 인터페이스 준수 — path, type, generatedBy", async () => {
    const fsFile = makeFsFile(["FN-001: 테스트"]);
    const dmFile = makeDmFile([]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result).toHaveProperty("path", "specs/06-screens.md");
    expect(result).toHaveProperty("type", "spec");
    expect(result).toHaveProperty("generatedBy", "mechanical");
    expect(result).toHaveProperty("sourceCount");
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("내비게이션 플로우 매트릭스 생성", async () => {
    const fsFile = makeFsFile([
      "FN-001: 상품 목록",
      "FN-002: 상품 상세",
    ]);
    const dmFile = makeDmFile([]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result.content).toContain("## 내비게이션 플로우 매트릭스");
    expect(result.content).toContain("From \\ To");
    expect(result.content).toContain("SCR-001");
    expect(result.content).toContain("SCR-002");
  });

  it("키워드 없는 FN title은 기본 form 유형", async () => {
    const fsFile = makeFsFile(["FN-001: 데이터 처리"]);
    const dmFile = makeDmFile([]);

    const result = await generateScreenSpec(mockEnv, makeCollectedData(), fsFile, dmFile, { skipLlm: true });

    expect(result.content).toContain("입력/수정 화면");
  });
});
