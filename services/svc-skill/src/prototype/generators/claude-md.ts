/**
 * CLAUDE.md Generator — 전체 스펙 요약 → Claude Code 프로젝트 설정 파일
 *
 * Template 기반 (LLM 불필요) — 다른 생성기 출력을 참조하여 조립
 */
import type { GeneratedFile } from "@ai-foundry/types";
import type { CollectedData } from "../collector.js";

export interface GeneratorOutputs {
  bl: GeneratedFile;
  dm: GeneratedFile;
  fs: GeneratedFile;
  arch: GeneratedFile;
  api: GeneratedFile;
}

function inferDomain(data: CollectedData): string {
  if (data.skills.length > 0) {
    return data.skills[0]?.domain ?? "unknown";
  }
  return "unknown";
}

function extractModuleList(archContent: string): string[] {
  const modules: string[] = [];
  for (const line of archContent.split("\n")) {
    const tableMatch = /^\|\s*(\w[\w\s/]+?)\s*\|/.exec(line);
    if (tableMatch && !line.includes("---") && !line.includes("모듈")) {
      const name = tableMatch[1]?.trim();
      if (name && name.length < 30) modules.push(name);
    }
  }
  return [...new Set(modules)].slice(0, 10);
}

function countPattern(content: string, pattern: RegExp): number {
  return (content.match(pattern) ?? []).length;
}

export function generateClaudeMd(
  orgName: string,
  data: CollectedData,
  outputs: GeneratorOutputs,
): GeneratedFile {
  const domain = inferDomain(data);
  const modules = extractModuleList(outputs.arch.content);
  const fnCount = countPattern(outputs.fs.content, /^## FN-\d+/gm);
  const apiCount = countPattern(outputs.api.content, /^## API-\d+|^\| API-\d+/gm);
  const tableCount = countPattern(outputs.dm.content, /CREATE TABLE/gi);

  const moduleLine = modules.length > 0
    ? `- 모듈: ${modules.join(", ")}\n`
    : "";

  const content = [
    `# ${orgName} Working Prototype`,
    "",
    "> AI Foundry 역공학 파이프라인에서 자동 생성된 반제품 스펙",
    "",
    "## 도메인",
    `${domain}. 역공학 결과물 기반 자동 생성.`,
    "",
    "## 아키텍처",
    "- 레이어: Presentation / Application / Domain / Infrastructure",
    moduleLine + "- 상세: `specs/04-architecture.md` 참조",
    "",
    "## 비즈니스 룰",
    "`specs/01-business-logic.md` 참조. 모든 BL-NNN을 코드에 반영해야 함.",
    "",
    "## 데이터 모델",
    `\`specs/02-data-model.md\` 참조. CREATE TABLE SQL 그대로 사용. (${tableCount}개 테이블)`,
    "",
    "## 기능 목록",
    `\`specs/03-functions.md\` 참조. FN-001부터 순서대로 구현. (${fnCount}개 기능)`,
    "",
    "## API 명세",
    `\`specs/05-api.md\` 참조. 엔드포인트/요청/응답 스키마 준수. (${apiCount}개 API)`,
    "",
    "## 구현 스택",
    "- Runtime: Node.js (Bun)",
    "- Framework: Hono",
    "- DB: better-sqlite3 (SQLite, D1 호환)",
    "- Auth: jose (JWT)",
    "- Test: Vitest",
    "- TypeScript strict mode",
    "",
    "## 응답 포맷",
    "- 성공: `{ success: true, data: { ... } }`",
    "- 실패: `{ success: false, error: { code: string, message: string } }`",
    "",
    "## 구현 순서",
    "1. DB 스키마 적용 (`specs/02-data-model.md`의 SQL)",
    "2. Domain 레이어: BL-NNN 비즈니스 로직 구현",
    "3. Application 레이어: FN-NNN 서비스 함수",
    "4. API 레이어: 엔드포인트 핸들러 (`specs/05-api.md`)",
    "5. 테스트: BL 시나리오별 단위 테스트",
    "",
    "## 데이터 소스",
    "| 항목 | 건수 |",
    "|------|------|",
    `| 정책 (approved) | ${data.policies.length} |`,
    `| 용어 (terms) | ${data.terms.length} |`,
    `| 스킬 (bundled) | ${data.skills.length} |`,
    `| 문서 (parsed) | ${data.documents.length} |`,
    "",
    "---",
    "",
    "*AI Foundry 반제품 생성 엔진에서 자동 생성됨*",
    "",
  ].join("\n");

  return {
    path: "CLAUDE.md",
    content,
    type: "meta",
    generatedBy: "template",
    sourceCount: Object.keys(outputs).length,
  };
}
