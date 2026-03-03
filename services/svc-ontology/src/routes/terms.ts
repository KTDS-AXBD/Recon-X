/**
 * Term and graph routes.
 * GET /terms       — list terms (with optional ontologyId filter + pagination)
 * GET /terms/:id   — single term lookup
 * GET /graph       — proxy Cypher query to Neo4j
 */

import { createLogger, ok, notFound, badRequest, errFromUnknown } from "@ai-foundry/utils";
import { neo4jQuery } from "../neo4j/client.js";
import type { Env } from "../env.js";

const logger = createLogger("svc-ontology:terms");

interface TermRow {
  term_id: string;
  ontology_id: string;
  label: string;
  definition: string | null;
  skos_uri: string;
  broader_term_id: string | null;
  embedding_model: string | null;
  created_at: string;
  term_type: string | null;
}

// ── GET /terms/:id ───────────────────────────────────────────────────

export async function handleGetTerm(
  _request: Request,
  env: Env,
  termId: string,
): Promise<Response> {
  const row = await env.DB_ONTOLOGY.prepare(
    "SELECT * FROM terms WHERE term_id = ?",
  )
    .bind(termId)
    .first<TermRow>();

  if (!row) {
    return notFound("Term", termId);
  }

  return ok(formatTermRow(row));
}

// ── GET /terms ───────────────────────────────────────────────────────

export async function handleListTerms(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const ontologyId = url.searchParams.get("ontologyId");
  const termType = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);
  const offset = Number(url.searchParams.get("offset") ?? "0");

  let query = "SELECT * FROM terms WHERE 1=1";
  const binds: (string | number)[] = [];

  if (ontologyId) {
    query += " AND ontology_id = ?";
    binds.push(ontologyId);
  }

  if (termType) {
    query += " AND term_type = ?";
    binds.push(termType);
  }

  query += " ORDER BY created_at ASC LIMIT ? OFFSET ?";
  binds.push(limit, offset);

  const result = await env.DB_ONTOLOGY.prepare(query).bind(...binds).all<TermRow>();

  const terms = (result.results ?? []).map(formatTermRow);
  return ok({ terms, limit, offset });
}

// ── GET /graph ───────────────────────────────────────────────────────

const DEFAULT_GRAPH_QUERY =
  "MATCH (t:Term)-[r]->(n) RETURN t, r, n LIMIT 100";

export async function handleGetGraph(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const customQuery = url.searchParams.get("query");
  const cypher = customQuery ?? DEFAULT_GRAPH_QUERY;

  // Basic guard: block obviously destructive Cypher keywords
  const upperCypher = cypher.toUpperCase();
  if (
    upperCypher.includes("DELETE") ||
    upperCypher.includes("DETACH") ||
    upperCypher.includes("DROP") ||
    upperCypher.includes("CREATE") ||
    upperCypher.includes("MERGE") ||
    upperCypher.includes("SET") ||
    upperCypher.includes("REMOVE")
  ) {
    return badRequest("Only read-only Cypher queries are allowed on /graph");
  }

  try {
    const neo4jResponse = await neo4jQuery(env, [{ statement: cypher }]);

    if (neo4jResponse.errors.length > 0) {
      const firstError = neo4jResponse.errors[0];
      logger.warn("Neo4j graph query error", { errors: neo4jResponse.errors });
      return badRequest(
        `Neo4j query error: ${firstError?.message ?? "unknown error"}`,
      );
    }

    const firstResult = neo4jResponse.results[0];
    return ok({
      columns: firstResult?.columns ?? [],
      rows: firstResult?.data.map((d) => d.row) ?? [],
      query: cypher,
    });
  } catch (e) {
    logger.error("Neo4j graph query failed", { error: String(e) });
    return errFromUnknown(e);
  }
}

// ── GET /terms/stats ─────────────────────────────────────────────────

interface StatsRow {
  total: number;
  distinct_labels: number;
  ontology_count: number;
}

export async function handleTermsStats(
  _request: Request,
  env: Env,
): Promise<Response> {
  const row = await env.DB_ONTOLOGY.prepare(
    `SELECT
       COUNT(*) AS total,
       COUNT(DISTINCT label) AS distinct_labels,
       COUNT(DISTINCT ontology_id) AS ontology_count
     FROM terms`,
  ).first<StatsRow>();

  // Try to get Neo4j stats (optional, best-effort)
  let neo4jStats: { termNodes: number; ontologyNodes: number; policyNodes: number; relationships: number } | null = null;
  try {
    const neo4jResponse = await neo4jQuery(env, [
      {
        statement:
          "MATCH (n) WITH labels(n) AS types, count(n) AS cnt " +
          "RETURN types, cnt " +
          "UNION ALL " +
          "MATCH ()-[r]->() RETURN ['_relationships'] AS types, count(r) AS cnt",
      },
    ]);
    if (neo4jResponse.errors.length === 0) {
      const firstResult = neo4jResponse.results[0];
      const rows = firstResult?.data ?? [];
      let termNodes = 0;
      let ontologyNodes = 0;
      let policyNodes = 0;
      let relationships = 0;
      for (const d of rows) {
        const types = d.row[0] as string[];
        const cnt = d.row[1] as number;
        const firstType = types[0];
        if (firstType === "Term") termNodes = cnt;
        else if (firstType === "Ontology") ontologyNodes = cnt;
        else if (firstType === "Policy") policyNodes = cnt;
        else if (firstType === "_relationships") relationships = cnt;
      }
      neo4jStats = { termNodes, ontologyNodes, policyNodes, relationships };
    }
  } catch {
    // Neo4j unavailable — D1 stats still returned
  }

  // Type distribution counts
  const typeCounts = await env.DB_ONTOLOGY.prepare(
    `SELECT term_type, COUNT(*) AS cnt FROM terms GROUP BY term_type`,
  ).all<{ term_type: string | null; cnt: number }>();

  const byType: Record<string, number> = {};
  for (const r of typeCounts.results ?? []) {
    const key = r.term_type ?? "entity";
    byType[key] = r.cnt;
  }

  return ok({
    totalTerms: row?.total ?? 0,
    distinctLabels: row?.distinct_labels ?? 0,
    ontologyCount: row?.ontology_count ?? 0,
    byType,
    neo4j: neo4jStats,
  });
}

// ── GET /graph/visualization ─────────────────────────────────────────

export async function handleGraphVisualization(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Number(limitParam ?? "80"), 200);
  const termLabel = url.searchParams.get("term");

  try {
    // If a specific term is requested, get its co-occurring terms
    const cypher = termLabel
      ? // Neighbors of a specific term
        "MATCH (o:Ontology)-[:HAS_TERM]->(t:Term) " +
        "WHERE t.label = $termLabel " +
        "WITH o " +
        "MATCH (o)-[:HAS_TERM]->(neighbor:Term) " +
        "RETURN neighbor.label AS label, neighbor.definition AS definition, " +
        "count(DISTINCT o) AS freq, " +
        "coalesce(neighbor.type, 'entity') AS termType " +
        "ORDER BY freq DESC LIMIT $limit"
      : // Top terms by frequency
        "MATCH (t:Term) " +
        "WITH t.label AS label, collect(t.definition)[0] AS definition, " +
        "count(t) AS freq, coalesce(collect(t.type)[0], 'entity') AS termType " +
        "ORDER BY freq DESC LIMIT $limit " +
        "RETURN label, definition, freq, termType";

    const params: Record<string, unknown> = { limit };
    if (termLabel) params["termLabel"] = termLabel;

    const termsResp = await neo4jQuery(env, [
      { statement: cypher, parameters: params },
    ]);

    if (termsResp.errors.length > 0) {
      const firstError = termsResp.errors[0];
      return badRequest(
        `Neo4j error: ${firstError?.message ?? "unknown"}`,
      );
    }

    const termRows = termsResp.results[0]?.data ?? [];
    const labels = termRows.map((d) => d.row[0] as string);

    // Build nodes
    const nodes = termRows.map((d, i) => ({
      id: d.row[0] as string,
      label: d.row[0] as string,
      definition: (d.row[1] as string | null) ?? "",
      frequency: d.row[2] as number,
      group: i < 10 ? "core" : i < 30 ? "important" : "standard",
      type: (d.row[3] as string | null) ?? "entity",
    }));

    // Get co-occurrence edges: terms sharing the same Ontology
    if (labels.length < 2) {
      return ok({ nodes, links: [] });
    }

    const edgeCypher =
      "MATCH (t1:Term)<-[:HAS_TERM]-(o:Ontology)-[:HAS_TERM]->(t2:Term) " +
      "WHERE t1.label IN $labels AND t2.label IN $labels " +
      "AND t1.label < t2.label " +
      "RETURN t1.label AS source, t2.label AS target, " +
      "count(DISTINCT o) AS weight " +
      "ORDER BY weight DESC LIMIT 300";

    const edgesResp = await neo4jQuery(env, [
      { statement: edgeCypher, parameters: { labels } },
    ]);

    const links = (edgesResp.results[0]?.data ?? []).map((d) => ({
      source: d.row[0] as string,
      target: d.row[1] as string,
      weight: d.row[2] as number,
    }));

    return ok({ nodes, links });
  } catch (e) {
    logger.error("Graph visualization query failed", { error: String(e) });
    return errFromUnknown(e);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatTermRow(row: TermRow) {
  return {
    termId: row.term_id,
    ontologyId: row.ontology_id,
    label: row.label,
    definition: row.definition,
    skosUri: row.skos_uri,
    broaderTermId: row.broader_term_id,
    embeddingModel: row.embedding_model,
    createdAt: row.created_at,
    termType: row.term_type ?? "entity",
  };
}
