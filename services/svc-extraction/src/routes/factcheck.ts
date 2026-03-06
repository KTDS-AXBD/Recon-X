/**
 * Fact Check API Routes — svc-extraction (SVC-02) extension.
 *
 * POST /factcheck                          → Trigger fact check
 * GET  /factcheck/results                  → List results for org
 * GET  /factcheck/results/:resultId        → Single result detail
 * GET  /factcheck/results/:resultId/gaps   → Gaps with filters
 * GET  /factcheck/results/:resultId/report → Markdown report
 * POST /factcheck/gaps/:gapId/review       → Review a gap
 * POST /factcheck/results/:resultId/llm-match → LLM matching (placeholder)
 * GET  /factcheck/summary                  → Org-level coverage KPI
 *
 * Part of v0.7.4 Pivot Phase 2-B Session 3.
 */

import { ok, badRequest, notFound } from "@ai-foundry/utils";
import type { Env } from "../env.js";
import { generateFactCheckReport } from "../factcheck/report.js";
import { llmSemanticMatch } from "../factcheck/llm-matcher.js";
import { aggregateSourceSpec } from "../factcheck/source-aggregator.js";
import { extractDocSpec } from "../factcheck/doc-spec-extractor.js";
import { structuralMatch } from "../factcheck/matcher.js";
import type { FactCheckGap } from "@ai-foundry/types";

// ── D1 row types ──────────────────────────────────────────────────

interface ResultRow {
  result_id: string;
  organization_id: string;
  spec_type: string;
  source_document_ids: string | null;
  doc_document_ids: string | null;
  total_source_items: number;
  total_doc_items: number;
  matched_items: number;
  gap_count: number;
  coverage_pct: number;
  gaps_by_type: string | null;
  gaps_by_severity: string | null;
  status: string;
  match_result_json: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
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

// ── Row → API object converters ───────────────────────────────────

function resultRowToApi(row: ResultRow) {
  return {
    resultId: row.result_id,
    organizationId: row.organization_id,
    specType: row.spec_type,
    sourceDocumentIds: safeParseJsonArray(row.source_document_ids),
    docDocumentIds: safeParseJsonArray(row.doc_document_ids),
    totalSourceItems: row.total_source_items,
    totalDocItems: row.total_doc_items,
    matchedItems: row.matched_items,
    gapCount: row.gap_count,
    coveragePct: row.coverage_pct,
    gapsByType: safeParseJsonRecord(row.gaps_by_type),
    gapsBySeverity: safeParseJsonRecord(row.gaps_by_severity),
    status: row.status,
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
    createdAt: row.created_at,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
  };
}

function gapRowToApi(row: GapRow): FactCheckGap {
  return {
    gapId: row.gap_id,
    resultId: row.result_id,
    organizationId: row.organization_id,
    gapType: row.gap_type as FactCheckGap["gapType"],
    severity: row.severity as FactCheckGap["severity"],
    sourceItem: row.source_item,
    ...(row.source_document_id ? { sourceDocumentId: row.source_document_id } : {}),
    ...(row.document_item ? { documentItem: row.document_item } : {}),
    ...(row.document_id ? { documentId: row.document_id } : {}),
    description: row.description,
    ...(row.evidence ? { evidence: row.evidence } : {}),
    autoResolved: row.auto_resolved === 1,
    reviewStatus: row.review_status as FactCheckGap["reviewStatus"],
    ...(row.reviewer_id ? { reviewerId: row.reviewer_id } : {}),
    ...(row.reviewer_comment ? { reviewerComment: row.reviewer_comment } : {}),
    ...(row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
    createdAt: row.created_at,
  };
}

// ── JSON helpers ──────────────────────────────────────────────────

function safeParseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val) as string[];
  } catch {
    return [];
  }
}

function safeParseJsonRecord(val: string | null): Record<string, number> {
  if (!val) return {};
  try {
    return JSON.parse(val) as Record<string, number>;
  } catch {
    return {};
  }
}

// ── Main route handler ────────────────────────────────────────────

export async function handleFactcheckRoutes(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  path: string,
  method: string,
  url: URL,
): Promise<Response | null> {

  // POST /factcheck — trigger fact check
  if (method === "POST" && path === "/factcheck") {
    return handleTriggerFactCheck(request, env);
  }

  // GET /factcheck/summary — org-level KPI
  if (method === "GET" && path === "/factcheck/summary") {
    return handleGetSummary(request, env);
  }

  // GET /factcheck/results — list results
  if (method === "GET" && path === "/factcheck/results") {
    return handleListResults(request, env);
  }

  // GET /factcheck/results/:resultId/gaps
  const gapsMatch = path.match(/^\/factcheck\/results\/([^/]+)\/gaps$/);
  if (method === "GET" && gapsMatch) {
    const resultId = gapsMatch[1];
    if (!resultId) return notFound("result");
    return handleGetGaps(env, resultId, url);
  }

  // GET /factcheck/results/:resultId/report
  const reportMatch = path.match(/^\/factcheck\/results\/([^/]+)\/report$/);
  if (method === "GET" && reportMatch) {
    const resultId = reportMatch[1];
    if (!resultId) return notFound("result");
    return handleGetReport(env, resultId);
  }

  // POST /factcheck/results/:resultId/llm-match
  const llmMatch = path.match(/^\/factcheck\/results\/([^/]+)\/llm-match$/);
  if (method === "POST" && llmMatch) {
    const resultId = llmMatch[1];
    if (!resultId) return notFound("result");
    return handleLlmMatch(env, resultId);
  }

  // GET /factcheck/results/:resultId — single result
  const resultDetailMatch = path.match(/^\/factcheck\/results\/([^/]+)$/);
  if (method === "GET" && resultDetailMatch) {
    const resultId = resultDetailMatch[1];
    if (!resultId) return notFound("result");
    return handleGetResult(env, resultId);
  }

  // POST /factcheck/gaps/:gapId/review
  const reviewMatch = path.match(/^\/factcheck\/gaps\/([^/]+)\/review$/);
  if (method === "POST" && reviewMatch) {
    const gapId = reviewMatch[1];
    if (!gapId) return notFound("gap");
    return handleReviewGap(request, env, gapId);
  }

  // No matching factcheck route
  return null;
}

// ── POST /factcheck ───────────────────────────────────────────────

interface TriggerBody {
  organizationId: string;
  specType?: "api" | "table" | "mixed";
}

async function handleTriggerFactCheck(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: TriggerBody;
  try {
    body = (await request.json()) as TriggerBody;
  } catch {
    return badRequest("Request body must be valid JSON");
  }

  const { organizationId } = body;
  if (!organizationId || typeof organizationId !== "string") {
    return badRequest("organizationId is required");
  }

  const specType = body.specType ?? "mixed";
  if (!["api", "table", "mixed"].includes(specType)) {
    return badRequest("specType must be api | table | mixed");
  }

  const resultId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create result record in D1
  await env.DB_EXTRACTION.prepare(
    `INSERT INTO fact_check_results
     (result_id, organization_id, spec_type, source_document_ids, doc_document_ids,
      total_source_items, total_doc_items, matched_items, gap_count, coverage_pct,
      status, created_at, updated_at)
     VALUES (?, ?, ?, '[]', '[]', 0, 0, 0, 0, 0, 'processing', ?, ?)`,
  )
    .bind(resultId, organizationId, specType, now, now)
    .run();

  // Queue factcheck.requested event
  await env.QUEUE_PIPELINE.send({
    eventId: crypto.randomUUID(),
    occurredAt: now,
    type: "factcheck.requested",
    payload: {
      resultId,
      organizationId,
      specType,
    },
  });

  return ok({ resultId, status: "processing" });
}

// ── GET /factcheck/results ────────────────────────────────────────

async function handleListResults(
  request: Request,
  env: Env,
): Promise<Response> {
  const organizationId = request.headers.get("X-Organization-Id");
  if (!organizationId) {
    return badRequest("X-Organization-Id header is required");
  }

  const { results } = await env.DB_EXTRACTION.prepare(
    `SELECT * FROM fact_check_results
     WHERE organization_id = ?
     ORDER BY created_at DESC`,
  )
    .bind(organizationId)
    .all<ResultRow>();

  return ok({ results: results.map(resultRowToApi) });
}

// ── GET /factcheck/results/:resultId ──────────────────────────────

async function handleGetResult(
  env: Env,
  resultId: string,
): Promise<Response> {
  const row = await env.DB_EXTRACTION.prepare(
    `SELECT * FROM fact_check_results WHERE result_id = ?`,
  )
    .bind(resultId)
    .first<ResultRow>();

  if (!row) {
    return notFound("result", resultId);
  }

  return ok(resultRowToApi(row));
}

// ── GET /factcheck/results/:resultId/gaps ─────────────────────────

async function handleGetGaps(
  env: Env,
  resultId: string,
  url: URL,
): Promise<Response> {
  // Verify result exists
  const resultRow = await env.DB_EXTRACTION.prepare(
    `SELECT result_id FROM fact_check_results WHERE result_id = ?`,
  )
    .bind(resultId)
    .first<{ result_id: string }>();

  if (!resultRow) {
    return notFound("result", resultId);
  }

  // Build filtered query
  const conditions: string[] = ["result_id = ?"];
  const bindings: (string | number)[] = [resultId];

  const typeFilter = url.searchParams.get("type");
  if (typeFilter) {
    conditions.push("gap_type = ?");
    bindings.push(typeFilter);
  }

  const severityFilter = url.searchParams.get("severity");
  if (severityFilter) {
    conditions.push("severity = ?");
    bindings.push(severityFilter);
  }

  const reviewStatusFilter = url.searchParams.get("reviewStatus");
  if (reviewStatusFilter) {
    conditions.push("review_status = ?");
    bindings.push(reviewStatusFilter);
  }

  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const whereClause = conditions.join(" AND ");

  // Count query
  const countRow = await env.DB_EXTRACTION.prepare(
    `SELECT COUNT(*) AS total FROM fact_check_gaps WHERE ${whereClause}`,
  )
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countRow?.total ?? 0;

  // Data query
  const { results } = await env.DB_EXTRACTION.prepare(
    `SELECT * FROM fact_check_gaps
     WHERE ${whereClause}
     ORDER BY CASE severity WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
              created_at ASC
     LIMIT ? OFFSET ?`,
  )
    .bind(...bindings, limit, offset)
    .all<GapRow>();

  return ok({
    gaps: results.map(gapRowToApi),
    total,
    limit,
    offset,
  });
}

// ── GET /factcheck/results/:resultId/report ───────────────────────

async function handleGetReport(
  env: Env,
  resultId: string,
): Promise<Response> {
  // Fetch result
  const resultRow = await env.DB_EXTRACTION.prepare(
    `SELECT * FROM fact_check_results WHERE result_id = ?`,
  )
    .bind(resultId)
    .first<ResultRow>();

  if (!resultRow) {
    return notFound("result", resultId);
  }

  // Fetch all gaps for this result
  const { results: gapRows } = await env.DB_EXTRACTION.prepare(
    `SELECT * FROM fact_check_gaps WHERE result_id = ?
     ORDER BY CASE severity WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
              created_at ASC`,
  )
    .bind(resultId)
    .all<GapRow>();

  const gaps: FactCheckGap[] = gapRows.map(gapRowToApi);

  const markdown = generateFactCheckReport({
    resultId,
    organizationId: resultRow.organization_id,
    totalSourceItems: resultRow.total_source_items,
    totalDocItems: resultRow.total_doc_items,
    matchedItems: resultRow.matched_items,
    gapCount: resultRow.gap_count,
    coveragePct: resultRow.coverage_pct,
    gapsByType: safeParseJsonRecord(resultRow.gaps_by_type),
    gapsBySeverity: safeParseJsonRecord(resultRow.gaps_by_severity),
    gaps,
  });

  return new Response(markdown, {
    status: 200,
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

// ── POST /factcheck/gaps/:gapId/review ────────────────────────────

interface ReviewBody {
  reviewStatus: "confirmed" | "dismissed" | "modified";
  reviewerId: string;
  comment?: string;
}

async function handleReviewGap(
  request: Request,
  env: Env,
  gapId: string,
): Promise<Response> {
  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return badRequest("Request body must be valid JSON");
  }

  const { reviewStatus, reviewerId, comment } = body;

  if (!reviewStatus || !["confirmed", "dismissed", "modified"].includes(reviewStatus)) {
    return badRequest("reviewStatus must be confirmed | dismissed | modified");
  }
  if (!reviewerId || typeof reviewerId !== "string") {
    return badRequest("reviewerId is required");
  }

  const reviewedAt = new Date().toISOString();

  const result = await env.DB_EXTRACTION.prepare(
    `UPDATE fact_check_gaps
     SET review_status = ?, reviewer_id = ?, reviewer_comment = ?, reviewed_at = ?
     WHERE gap_id = ?`,
  )
    .bind(reviewStatus, reviewerId, comment ?? null, reviewedAt, gapId)
    .run();

  if (result.meta.rows_written === 0) {
    return notFound("gap", gapId);
  }

  return ok({ gapId, reviewStatus, reviewedAt });
}

// ── POST /factcheck/results/:resultId/llm-match ──────────────────

async function handleLlmMatch(
  env: Env,
  resultId: string,
): Promise<Response> {
  // Verify result exists and is completed
  const resultRow = await env.DB_EXTRACTION.prepare(
    `SELECT * FROM fact_check_results WHERE result_id = ?`,
  )
    .bind(resultId)
    .first<ResultRow>();

  if (!resultRow) {
    return notFound("result", resultId);
  }

  if (resultRow.status !== "completed") {
    return badRequest("Fact check must be completed before running LLM matching");
  }

  const organizationId = resultRow.organization_id;

  // Re-aggregate source and doc specs
  const sourceSpec = await aggregateSourceSpec(env, organizationId);
  const docSpec = await extractDocSpec(env, organizationId);

  // Re-run structural matching to get unmatched items
  const matchResult = structuralMatch(sourceSpec, docSpec);

  // Run LLM semantic matching on unmatched items
  const llmResult = await llmSemanticMatch(
    matchResult,
    docSpec,
    env.LLM_ROUTER,
    env.INTERNAL_API_SECRET,
  );

  // Update match count and coverage if new matches found
  if (llmResult.newMatches.length > 0) {
    const newMatchedCount = resultRow.matched_items + llmResult.newMatches.length;
    const totalSourceItems = resultRow.total_source_items;
    const newCoverage = totalSourceItems > 0
      ? (newMatchedCount / totalSourceItems) * 100
      : 0;

    await env.DB_EXTRACTION.prepare(
      `UPDATE fact_check_results
       SET matched_items = ?, coverage_pct = ?, updated_at = ?
       WHERE result_id = ?`,
    )
      .bind(
        newMatchedCount,
        Math.round(newCoverage * 10) / 10,
        new Date().toISOString(),
        resultId,
      )
      .run();
  }

  return ok({
    resultId,
    llmMatching: {
      processed: llmResult.stats.processed,
      newMatches: llmResult.stats.matched,
      confirmedGaps: llmResult.stats.confirmed,
      errors: llmResult.stats.errors,
    },
    newMatches: llmResult.newMatches,
    confirmedGaps: llmResult.confirmedGaps,
  });
}

// ── GET /factcheck/summary ────────────────────────────────────────

async function handleGetSummary(
  request: Request,
  env: Env,
): Promise<Response> {
  const organizationId = request.headers.get("X-Organization-Id");
  if (!organizationId) {
    return badRequest("X-Organization-Id header is required");
  }

  const aggRow = await env.DB_EXTRACTION.prepare(
    `SELECT COUNT(*) AS result_count,
            COALESCE(SUM(total_source_items), 0) AS total_source,
            COALESCE(SUM(total_doc_items), 0) AS total_doc,
            COALESCE(SUM(matched_items), 0) AS total_matched,
            COALESCE(SUM(gap_count), 0) AS total_gaps,
            MAX(created_at) AS last_check_at
     FROM fact_check_results
     WHERE organization_id = ? AND status = 'completed'`,
  )
    .bind(organizationId)
    .first<{
      result_count: number;
      total_source: number;
      total_doc: number;
      total_matched: number;
      total_gaps: number;
      last_check_at: string | null;
    }>();

  if (!aggRow || aggRow.result_count === 0) {
    return ok({
      organizationId,
      resultCount: 0,
      totalSourceItems: 0,
      totalDocItems: 0,
      totalMatchedItems: 0,
      totalGaps: 0,
      overallCoveragePct: 0,
      lastCheckAt: null,
    });
  }

  const totalItems = aggRow.total_source + aggRow.total_doc;
  const overallCoverage = totalItems > 0
    ? (aggRow.total_matched * 2 / totalItems) * 100
    : 0;

  return ok({
    organizationId,
    resultCount: aggRow.result_count,
    totalSourceItems: aggRow.total_source,
    totalDocItems: aggRow.total_doc,
    totalMatchedItems: aggRow.total_matched,
    totalGaps: aggRow.total_gaps,
    overallCoveragePct: Math.round(overallCoverage * 10) / 10,
    lastCheckAt: aggRow.last_check_at ?? null,
  });
}
