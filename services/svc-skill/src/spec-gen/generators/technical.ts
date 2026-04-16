/**
 * Technical Spec Generator — technicalSpec + adapters → 기술 명세서
 *
 * 섹션: 아키텍처 개요, API 명세, 데이터 모델, 데이터 흐름, 에러 명세, 어댑터 현황
 */
import type { SkillSpecData, SpecSection } from "../types.js";

// ── 섹션 생성기 ─────────────────────────────────

function genOverview(data: SkillSpecData): SpecSection {
  const ts = data.technicalSpec;
  const apiCount = ts?.apis.length ?? 0;
  const tableCount = ts?.tables.length ?? 0;
  const flowCount = ts?.dataFlows.length ?? 0;
  const errorCount = ts?.errors.length ?? 0;
  const hasMcp = Boolean(data.adapters.mcp);
  const hasOpenApi = Boolean(data.adapters.openapi);

  const lines = [
    `# Technical Spec — ${data.domain}${data.subdomain ? ` > ${data.subdomain}` : ""}`,
    "",
    "| 항목 | 값 |",
    "|------|-----|",
    `| API 엔드포인트 | ${apiCount}건 |`,
    `| 데이터 테이블 | ${tableCount}건 |`,
    `| 데이터 흐름 | ${flowCount}건 |`,
    `| 에러 정의 | ${errorCount}건 |`,
    `| MCP 어댑터 | ${hasMcp ? "✅" : "❌"} |`,
    `| OpenAPI 어댑터 | ${hasOpenApi ? "✅" : "❌"} |`,
    `| 파이프라인 단계 | ${data.provenance.pipeline.stages.join(" → ")} |`,
    "",
  ];

  return { id: "tech-overview", title: "기술 개요", content: lines.join("\n"), order: 1 };
}

function genApiSpec(data: SkillSpecData): SpecSection {
  const apis = data.technicalSpec?.apis ?? [];

  if (apis.length === 0) {
    return {
      id: "tech-api",
      title: "API 명세",
      content: "## API 명세\n\n> 추출된 API 정보가 없습니다. Technical 프롬프트 강화 또는 API 명세서 문서를 추가로 투입해 주세요.",
      order: 2,
    };
  }

  const parts: string[] = ["## API 명세", ""];
  parts.push(`총 ${apis.length}개 엔드포인트가 추출됨.`);
  parts.push("");

  for (const api of apis) {
    parts.push(`### \`${api.method} ${api.endpoint}\``);
    parts.push("");
    if (api.description) parts.push(api.description);
    parts.push("");

    if (api.requestSchema) {
      parts.push("**Request Schema:**");
      parts.push("```");
      parts.push(api.requestSchema);
      parts.push("```");
      parts.push("");
    }

    if (api.responseSchema) {
      parts.push("**Response Schema:**");
      parts.push("```");
      parts.push(api.responseSchema);
      parts.push("```");
      parts.push("");
    }
  }

  return { id: "tech-api", title: "API 명세", content: parts.join("\n"), order: 2 };
}

function genDataModel(data: SkillSpecData): SpecSection {
  const tables = data.technicalSpec?.tables ?? [];

  if (tables.length === 0) {
    return {
      id: "tech-data-model",
      title: "데이터 모델",
      content: "## 데이터 모델 (ERD)\n\n> 추출된 테이블 정보가 없습니다. ERD 또는 테이블 정의서를 추가로 투입해 주세요.",
      order: 3,
    };
  }

  const parts: string[] = ["## 데이터 모델 (ERD)", ""];
  parts.push(`총 ${tables.length}개 테이블이 추출됨.`);
  parts.push("");

  for (const table of tables) {
    parts.push(`### ${table.name}`);
    parts.push("");
    if (table.description) {
      parts.push(table.description);
      parts.push("");
    }

    parts.push("| 컬럼 | 타입 | Nullable | FK |");
    parts.push("|------|------|----------|-----|");

    for (const col of table.columns) {
      const nullable = col.nullable ? "Yes" : "No";
      const fk = col.foreignKey ?? "—";
      parts.push(`| ${col.name} | ${col.type} | ${nullable} | ${fk} |`);
    }
    parts.push("");
  }

  return { id: "tech-data-model", title: "데이터 모델", content: parts.join("\n"), order: 3 };
}

function genDataFlow(data: SkillSpecData): SpecSection {
  const flows = data.technicalSpec?.dataFlows ?? [];

  if (flows.length === 0) {
    return {
      id: "tech-data-flow",
      title: "데이터 흐름",
      content: "## 데이터 흐름\n\n> 추출된 데이터 흐름 정보가 없습니다.",
      order: 4,
    };
  }

  const parts: string[] = ["## 데이터 흐름", ""];
  parts.push("| Source | → | Target | 유형 | 설명 |");
  parts.push("|--------|---|--------|------|------|");

  for (const f of flows) {
    const desc = f.description ? f.description.replace(/\|/g, "\\|").slice(0, 60) : "—";
    parts.push(`| ${f.source} | → | ${f.target} | ${f.type} | ${desc} |`);
  }
  parts.push("");

  return { id: "tech-data-flow", title: "데이터 흐름", content: parts.join("\n"), order: 4 };
}

function genErrorSpec(data: SkillSpecData): SpecSection {
  const errors = data.technicalSpec?.errors ?? [];

  if (errors.length === 0) {
    return {
      id: "tech-errors",
      title: "에러 명세",
      content: "## 에러 명세\n\n> 추출된 에러 정보가 없습니다.",
      order: 5,
    };
  }

  const parts: string[] = ["## 에러 명세", ""];
  parts.push("| 코드 | 예외 | 경로 | 처리 방식 | 심각도 |");
  parts.push("|------|------|------|-----------|--------|");

  for (const e of errors) {
    parts.push(
      `| ${e.code ?? "—"} | ${e.exception ?? "—"} | ${e.path ?? "—"} | ${e.handling ?? "—"} | ${e.severity ?? "—"} |`,
    );
  }
  parts.push("");

  return { id: "tech-errors", title: "에러 명세", content: parts.join("\n"), order: 5 };
}

function genAdapterStatus(data: SkillSpecData): SpecSection {
  const parts: string[] = ["## 어댑터 현황", ""];
  parts.push("| 어댑터 | 상태 | R2 키 |");
  parts.push("|--------|------|-------|");
  parts.push(`| MCP (Model Context Protocol) | ${data.adapters.mcp ? "✅ 생성됨" : "❌ 미생성"} | ${data.adapters.mcp ?? "—"} |`);
  parts.push(`| OpenAPI 3.0 | ${data.adapters.openapi ? "✅ 생성됨" : "❌ 미생성"} | ${data.adapters.openapi ?? "—"} |`);
  parts.push("");

  if (!data.adapters.mcp && !data.adapters.openapi) {
    parts.push("> ⚠️ 어댑터가 미생성 상태입니다. `/admin/backfill-adapters`를 실행하여 생성하세요.");
    parts.push("");
  }

  return { id: "tech-adapters", title: "어댑터 현황", content: parts.join("\n"), order: 6 };
}

// ── 메인 ────────────────────────────────────────

export function generateTechnicalSpec(data: SkillSpecData): SpecSection[] {
  return [
    genOverview(data),
    genApiSpec(data),
    genDataModel(data),
    genDataFlow(data),
    genErrorSpec(data),
    genAdapterStatus(data),
  ];
}
