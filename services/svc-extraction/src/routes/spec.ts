/**
 * Classification Routes — relevance classification (core/non-core/unknown).
 *
 * POST /specs/classify     → Run classification for an organization
 * GET  /specs/classified   → Enriched spec items with classification + factCheck
 *
 * Part of v0.7.4 Phase 2-C.
 */

import { ok, badRequest } from "@ai-foundry/utils";
import type { Env } from "../env.js";
import type { FactCheckGap, MatchedItem } from "@ai-foundry/types";
import { aggregateSourceSpec } from "../factcheck/source-aggregator.js";
import { classifyAll } from "../export/relevance-scorer.js";
import { generateApiSpec } from "../export/spec-api.js";
import { generateTableSpec } from "../export/spec-table.js";
import type { MatchResult } from "../factcheck/matcher.js";


// ── Main route handler ──────────────────────────────────────────

export async function handleSpecRoutes(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  path: string,
  method: string,
  _url: URL,
): Promise<Response | null> {

  // POST /specs/classify
  if (method === "POST" && path === "/specs/classify") {
    return handleClassify(request, env);
  }

  // GET /specs/classified
  if (method === "GET" && path === "/specs/classified") {
    return handleGetClassified(request, env);
  }

  return null;
}

// ── POST /specs/classify ────────────────────────────────────────

interface ClassifyBody {
  organizationId: string;
}

async function handleClassify(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: ClassifyBody;
  try {
    body = (await request.json()) as ClassifyBody;
  } catch {
    return badRequest("Request body must be valid JSON");
  }

  const { organizationId } = body;
  if (!organizationId || typeof organizationId !== "string") {
    return badRequest("organizationId is required");
  }

  // Aggregate source spec
  const sourceSpec = await aggregateSourceSpec(env, organizationId);

  // Classify all items using actual transaction/query data from source
  const relevanceMap = classifyAll(
    sourceSpec,
    sourceSpec.transactions,
    sourceSpec.queries,
  );

  // Store classifications in D1
  const classifications: Array<{
    specType: "api" | "table";
    itemName: string;
    relevance: "core" | "non-core" | "unknown";
    criteria: {
      isExternalApi: boolean;
      isCoreEntity: boolean;
      isTransactionCore: boolean;
      score: number;
    };
  }> = [];

  let coreApis = 0;
  let nonCoreApis = 0;
  let unknownApis = 0;
  let coreTables = 0;
  let nonCoreTables = 0;
  let unknownTables = 0;

  for (const api of sourceSpec.apis) {
    const criteria = relevanceMap.get(api.path);
    if (!criteria) continue;

    classifications.push({
      specType: "api",
      itemName: api.path,
      relevance: criteria.relevance,
      criteria: {
        isExternalApi: criteria.isExternalApi,
        isCoreEntity: criteria.isCoreEntity,
        isTransactionCore: criteria.isTransactionCore,
        score: criteria.score,
      },
    });

    if (criteria.relevance === "core") coreApis++;
    else if (criteria.relevance === "non-core") nonCoreApis++;
    else unknownApis++;

    // Upsert to D1
    await env.DB_EXTRACTION.prepare(
      `INSERT OR REPLACE INTO spec_classifications
       (classification_id, organization_id, spec_type, item_name,
        is_external_api, is_core_entity, is_transaction_core,
        relevance_score, relevance, created_at)
       VALUES (?, ?, 'api', ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        organizationId,
        api.path,
        criteria.isExternalApi ? 1 : 0,
        criteria.isCoreEntity ? 1 : 0,
        criteria.isTransactionCore ? 1 : 0,
        criteria.score,
        criteria.relevance,
        new Date().toISOString(),
      )
      .run();
  }

  for (const table of sourceSpec.tables) {
    const criteria = relevanceMap.get(table.tableName);
    if (!criteria) continue;

    classifications.push({
      specType: "table",
      itemName: table.tableName,
      relevance: criteria.relevance,
      criteria: {
        isExternalApi: criteria.isExternalApi,
        isCoreEntity: criteria.isCoreEntity,
        isTransactionCore: criteria.isTransactionCore,
        score: criteria.score,
      },
    });

    if (criteria.relevance === "core") coreTables++;
    else if (criteria.relevance === "non-core") nonCoreTables++;
    else unknownTables++;

    // Upsert to D1
    await env.DB_EXTRACTION.prepare(
      `INSERT OR REPLACE INTO spec_classifications
       (classification_id, organization_id, spec_type, item_name,
        is_external_api, is_core_entity, is_transaction_core,
        relevance_score, relevance, created_at)
       VALUES (?, ?, 'table', ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        organizationId,
        table.tableName,
        criteria.isExternalApi ? 1 : 0,
        criteria.isCoreEntity ? 1 : 0,
        criteria.isTransactionCore ? 1 : 0,
        criteria.score,
        criteria.relevance,
        new Date().toISOString(),
      )
      .run();
  }

  return ok({
    totalApis: sourceSpec.apis.length,
    coreApis,
    nonCoreApis,
    unknownApis,
    totalTables: sourceSpec.tables.length,
    coreTables,
    nonCoreTables,
    unknownTables,
    classifications,
  });
}

// ── GET /specs/classified ───────────────────────────────────────

interface ResultRow {
  result_id: string;
  match_result_json: string | null;
}

interface GapRow {
  gap_id: string;
  result_id: string;
  organization_id: string;
  gap_type: string;
  severity: string;
  source_item: string;
  source_document_id: string | null;
  document_item: string | null;
  document_id: string | null;
  description: string;
  evidence: string | null;
  auto_resolved: number;
  review_status: string;
  reviewer_id: string | null;
  reviewer_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * Returns enriched spec items matching frontend ClassifiedSpecs shape:
 * { apiSpecs[], tableSpecs[], totalApiSpecs, totalTableSpecs, coreApiCount, coreTableCount }
 */
async function handleGetClassified(
  request: Request,
  env: Env,
): Promise<Response> {
  const organizationId = request.headers.get("X-Organization-Id");
  if (!organizationId) {
    return badRequest("X-Organization-Id header is required");
  }

  // 1. Aggregate source spec
  const sourceSpec = await aggregateSourceSpec(env, organizationId);

  // 2. Load latest completed fact check result
  const resultRow = await env.DB_EXTRACTION.prepare(
    `SELECT result_id, match_result_json FROM fact_check_results
     WHERE organization_id = ? AND status = 'completed'
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(organizationId)
    .first<ResultRow>();

  // 3. Build match result from cache
  const matchResult = buildMatchResult(resultRow?.match_result_json ?? null);

  // 4. Load gaps
  let gaps: FactCheckGap[] = [];
  if (resultRow) {
    const { results: gapRows } = await env.DB_EXTRACTION.prepare(
      `SELECT * FROM fact_check_gaps WHERE result_id = ?`,
    )
      .bind(resultRow.result_id)
      .all<GapRow>();

    gaps = gapRows.map((r) => ({
      gapId: r.gap_id,
      resultId: r.result_id,
      organizationId: r.organization_id,
      gapType: r.gap_type as FactCheckGap["gapType"],
      severity: r.severity as FactCheckGap["severity"],
      sourceItem: r.source_item,
      ...(r.document_item ? { documentItem: r.document_item } : {}),
      ...(r.document_id ? { documentId: r.document_id } : {}),
      description: r.description,
      autoResolved: r.auto_resolved === 1,
      reviewStatus: r.review_status as FactCheckGap["reviewStatus"],
      createdAt: r.created_at,
    }));
  }

  // 5. Classify relevance
  const relevanceMap = classifyAll(
    sourceSpec,
    sourceSpec.transactions,
    sourceSpec.queries,
  );

  // 6. Generate enriched specs
  const apiEntries = generateApiSpec({ sourceSpec, matchResult, gaps, relevanceMap });
  const tableEntries = generateTableSpec({ sourceSpec, matchResult, gaps, relevanceMap });

  // 7. Map to frontend shape
  const apiSpecs = apiEntries.map((e) => ({
    specId: e.specId,
    endpoint: e.endpoint,
    httpMethod: e.httpMethod,
    sourceLocation: e.sourceLocation,
    parameters: e.parameters.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required,
      source: p.source ?? "query",
    })),
    responseSchema: {},
    documentRef: e.documentRef ?? "",
    factCheck: e.factCheck,
    confidence: e.confidence,
    classification: e.relevance,
  }));

  const tableSpecs = tableEntries.map((e) => ({
    specId: e.specId,
    tableName: e.tableName,
    sourceLocation: e.sourceLocation,
    columns: e.columns.map((c) => ({
      name: c.name,
      type: c.dataType,
      nullable: c.nullable,
      pk: c.isPrimaryKey,
      fk: c.foreignKeyRef ?? null,
    })),
    documentRef: e.documentRef ?? "",
    factCheck: e.factCheck,
    confidence: e.confidence,
    classification: e.relevance,
  }));

  const coreApiCount = apiSpecs.filter((a) => a.classification === "core").length;
  const coreTableCount = tableSpecs.filter((t) => t.classification === "core").length;

  return ok({
    apiSpecs,
    tableSpecs,
    totalApiSpecs: apiSpecs.length,
    totalTableSpecs: tableSpecs.length,
    coreApiCount,
    coreTableCount,
  });
}

function buildMatchResult(json: string | null): MatchResult {
  const empty: MatchResult = {
    matchedItems: [],
    unmatchedSourceApis: [],
    unmatchedDocApis: [],
    unmatchedSourceTables: [],
    unmatchedDocTables: [],
  };
  if (!json) return empty;
  try {
    const cached = JSON.parse(json) as { matchedItems?: MatchedItem[] };
    return { ...empty, matchedItems: cached.matchedItems ?? [] };
  } catch {
    return empty;
  }
}
