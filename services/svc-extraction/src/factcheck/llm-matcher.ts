/**
 * LLM Semantic Matcher — unmatched source items를 LLM으로 문서와 대조하여
 * 명명 차이(naming diff)인지 실제 누락(real gap)인지 판별한다.
 *
 * Trigger: structural matching 후 unmatched 항목 중 잠재 후보가 있을 때.
 * Cost: unmatched 항목당 1회 LLM 호출 (Sonnet tier). 전체의 10~20% 예상.
 *
 * Part of v0.7.4 Pivot Phase 2-B Session 4.
 */

import { createLogger, type LlmClientEnv } from "@ai-foundry/utils";
import type { MatchedItem } from "@ai-foundry/types";
import type { SourceApi, SourceTable, DocSpec } from "./types.js";
import type { MatchResult } from "./matcher.js";
import { callLlm } from "../llm/caller.js";

const logger = createLogger("svc-extraction:llm-matcher");

// ── LLM response type ───────────────────────────────────────────

export interface LlmMatchVerdict {
  found: boolean;
  docRef: string | null;
  isNamingDiff: boolean;
  severity: string | null;
  reasoning: string;
}

// ── Result type ─────────────────────────────────────────────────

export interface LlmMatchResult {
  newMatches: MatchedItem[];
  confirmedGaps: Array<{
    sourceName: string;
    sourceType: "api" | "table";
    severity: string;
    reasoning: string;
  }>;
  stats: {
    processed: number;
    matched: number;
    confirmed: number;
    errors: number;
  };
}

// ── Main ────────────────────────────────────────────────────────

/**
 * Run LLM semantic matching on unmatched items from structural matching.
 * Updates matchResult with newly discovered matches.
 */
export async function llmSemanticMatch(
  matchResult: MatchResult,
  docSpec: DocSpec,
  env: LlmClientEnv,
): Promise<LlmMatchResult> {
  const newMatches: MatchedItem[] = [];
  const confirmedGaps: LlmMatchResult["confirmedGaps"] = [];
  let processed = 0;
  let errors = 0;

  // Build document context chunks for LLM
  const docContext = buildDocContext(docSpec);

  // Process unmatched APIs
  for (const api of matchResult.unmatchedSourceApis) {
    try {
      const verdict = await matchSourceItem(
        { type: "api", name: api.path, detail: formatApiDetail(api) },
        docContext,
        env,
      );
      processed++;

      if (verdict.found && verdict.docRef) {
        newMatches.push({
          sourceRef: {
            name: api.path,
            type: "api",
            documentId: api.documentId,
            location: `${api.controllerClass}.${api.methodName}`,
          },
          docRef: {
            name: verdict.docRef,
            type: "api",
            documentId: "",
            location: verdict.reasoning,
          },
          matchScore: verdict.isNamingDiff ? 0.7 : 0.5,
          matchMethod: "llm",
        });
      } else {
        confirmedGaps.push({
          sourceName: api.path,
          sourceType: "api",
          severity: verdict.severity ?? "MEDIUM",
          reasoning: verdict.reasoning,
        });
      }
    } catch (e) {
      errors++;
      logger.warn("LLM match failed for API", { path: api.path, error: String(e) });
    }
  }

  // Process unmatched tables
  for (const table of matchResult.unmatchedSourceTables) {
    try {
      const verdict = await matchSourceItem(
        { type: "table", name: table.tableName, detail: formatTableDetail(table) },
        docContext,
        env,
      );
      processed++;

      if (verdict.found && verdict.docRef) {
        newMatches.push({
          sourceRef: {
            name: table.tableName,
            type: "table",
            documentId: table.documentId,
            location: table.sourceFile,
          },
          docRef: {
            name: verdict.docRef,
            type: "table",
            documentId: "",
            location: verdict.reasoning,
          },
          matchScore: verdict.isNamingDiff ? 0.7 : 0.5,
          matchMethod: "llm",
        });
      } else {
        confirmedGaps.push({
          sourceName: table.tableName,
          sourceType: "table",
          severity: verdict.severity ?? "MEDIUM",
          reasoning: verdict.reasoning,
        });
      }
    } catch (e) {
      errors++;
      logger.warn("LLM match failed for table", { tableName: table.tableName, error: String(e) });
    }
  }

  logger.info("LLM semantic matching completed", {
    processed,
    matched: newMatches.length,
    confirmed: confirmedGaps.length,
    errors,
  });

  return {
    newMatches,
    confirmedGaps,
    stats: {
      processed,
      matched: newMatches.length,
      confirmed: confirmedGaps.length,
      errors,
    },
  };
}

// ── Prompt Builder ──────────────────────────────────────────────

interface SourceItemInfo {
  type: "api" | "table";
  name: string;
  detail: string;
}

function buildSemanticMatchPrompt(item: SourceItemInfo, docContext: string): string {
  return `당신은 SI 프로젝트 산출물 검수 전문가입니다.

[소스 코드 항목]
Type: ${item.type}
Name: ${item.name}
${item.detail}

[관련 문서 내용]
${docContext}

질문:
1. 위 소스 코드 항목이 문서에 기술되어 있습니까?
2. 기술되어 있다면, 어디에 어떤 이름으로 있습니까?
3. 명명 규칙 차이인지, 실제 누락인지 판단해 주세요.
4. 실제 누락이라면 severity를 판단해 주세요 (HIGH/MEDIUM/LOW).

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{ "found": boolean, "docRef": "문서에서의 이름 또는 null", "isNamingDiff": boolean, "severity": "HIGH|MEDIUM|LOW 또는 null", "reasoning": "판단 근거 1~2문장" }`;
}

async function matchSourceItem(
  item: SourceItemInfo,
  docContext: string,
  env: LlmClientEnv,
): Promise<LlmMatchVerdict> {
  const prompt = buildSemanticMatchPrompt(item, docContext);
  const rawContent = await callLlm(prompt, "sonnet", env, 1024);

  // Strip code fences
  const jsonContent = rawContent
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonContent) as LlmMatchVerdict;
    return {
      found: parsed.found ?? false,
      docRef: parsed.docRef ?? null,
      isNamingDiff: parsed.isNamingDiff ?? false,
      severity: parsed.severity ?? null,
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    logger.warn("Failed to parse LLM verdict JSON", {
      item: item.name,
      rawLength: jsonContent.length,
      preview: jsonContent.slice(0, 200),
    });
    // Default to "not found" on parse failure
    return {
      found: false,
      docRef: null,
      isNamingDiff: false,
      severity: "MEDIUM",
      reasoning: "LLM 응답 파싱 실패 — 수동 확인 필요",
    };
  }
}

// ── Context Builders ────────────────────────────────────────────

const MAX_DOC_CONTEXT_LENGTH = 6000;

function buildDocContext(docSpec: DocSpec): string {
  const parts: string[] = [];

  if (docSpec.apis.length > 0) {
    parts.push("## 문서 API 목록");
    for (const api of docSpec.apis) {
      const method = api.httpMethod ?? "?";
      const desc = api.description ?? "";
      parts.push(`- ${method} ${api.path} ${desc} (${api.location})`);
    }
  }

  if (docSpec.tables.length > 0) {
    parts.push("\n## 문서 테이블 목록");
    for (const table of docSpec.tables) {
      const cols = table.columns.map((c) => c.name).join(", ");
      parts.push(`- ${table.tableName}: [${cols}] (${table.location})`);
    }
  }

  const fullContext = parts.join("\n");

  // Truncate to prevent excessive token usage
  if (fullContext.length > MAX_DOC_CONTEXT_LENGTH) {
    return fullContext.slice(0, MAX_DOC_CONTEXT_LENGTH) + "\n... (truncated)";
  }

  return fullContext;
}

function formatApiDetail(api: SourceApi): string {
  const params = api.parameters
    .map((p) => `${p.name}: ${p.type}${p.required ? " (required)" : ""}`)
    .join(", ");
  return [
    `Controller: ${api.controllerClass}`,
    `Method: ${api.methodName}`,
    `HTTP: ${api.httpMethods.join(", ")}`,
    `Path: ${api.path}`,
    params ? `Parameters: ${params}` : null,
    `Return: ${api.returnType}`,
    api.swaggerSummary ? `Swagger: ${api.swaggerSummary}` : null,
  ].filter(Boolean).join("\n");
}

function formatTableDetail(table: SourceTable): string {
  const cols = table.columns
    .map((c) => {
      const type = c.javaType ?? c.sqlType ?? "?";
      const pk = c.isPrimaryKey ? " PK" : "";
      return `${c.name}(${type}${pk})`;
    })
    .join(", ");
  return [
    `Table: ${table.tableName}`,
    `Source: ${table.source}`,
    table.voClassName ? `VO: ${table.voClassName}` : null,
    `Columns: ${cols}`,
  ].filter(Boolean).join("\n");
}
