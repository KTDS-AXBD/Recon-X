/**
 * Neo4j Query API v2 client.
 * Workers cannot use Bolt protocol — all queries go through the HTTPS Query API.
 *
 * Aura 5.x no longer exposes the HTTP Transaction API (/tx/commit → 403).
 * Instead we use: POST /db/{database}/query/v2
 *
 * NEO4J_URI example: "https://c22f7f0f.databases.neo4j.io"
 * NEO4J_USERNAME: Aura instance username (e.g. "c22f7f0f")
 * NEO4J_DATABASE: Aura database name (e.g. "c22f7f0f")
 */

import type { Env } from "../env.js";

export interface Neo4jStatement {
  statement: string;
  parameters?: Record<string, unknown>;
}

export interface Neo4jError {
  code: string;
  message: string;
}

// ── Query API v2 response ───────────────────────────────────────────

interface QueryApiData {
  fields: string[];
  values: unknown[][];
}

interface QueryApiResponse {
  data: QueryApiData;
  bookmarks?: string[];
  counters?: Record<string, number>;
}

interface QueryApiErrorResponse {
  errors: Neo4jError[];
}

// ── Public types (kept compatible with callers) ─────────────────────

export interface Neo4jResultRow {
  row: unknown[];
  meta: unknown[];
}

export interface Neo4jResult {
  columns: string[];
  data: Neo4jResultRow[];
}

export interface Neo4jResponse {
  results: Neo4jResult[];
  errors: Neo4jError[];
}

// ── Internal: execute a single Cypher statement ─────────────────────

async function executeOne(
  env: Env,
  stmt: Neo4jStatement,
): Promise<{ result: Neo4jResult; errors: Neo4jError[] }> {
  const auth = btoa(`${env.NEO4J_USERNAME}:${env.NEO4J_PASSWORD}`);
  const url = `${env.NEO4J_URI}/db/${env.NEO4J_DATABASE}/query/v2`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      statement: stmt.statement,
      parameters: stmt.parameters ?? {},
    }),
  });

  // 4xx/5xx with JSON error body
  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as QueryApiErrorResponse;
      if (parsed.errors) {
        return {
          result: { columns: [], data: [] },
          errors: parsed.errors,
        };
      }
    } catch {
      // not JSON
    }
    throw new Error(`Neo4j HTTP error: ${response.status} ${text.slice(0, 200)}`);
  }

  const body = (await response.json()) as QueryApiResponse;

  // Convert Query API v2 response → Neo4jResult shape
  const result: Neo4jResult = {
    columns: body.data.fields,
    data: body.data.values.map((row) => ({ row, meta: [] })),
  };

  return { result, errors: [] };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Execute one or more Cypher statements against Neo4j via Query API v2.
 * Statements are executed sequentially (Query API is single-statement).
 * Returns a combined response compatible with callers that expect Neo4jResponse.
 */
export async function neo4jQuery(
  env: Env,
  statements: Neo4jStatement[],
): Promise<Neo4jResponse> {
  const results: Neo4jResult[] = [];
  const errors: Neo4jError[] = [];

  for (const stmt of statements) {
    const { result, errors: stmtErrors } = await executeOne(env, stmt);
    results.push(result);
    errors.push(...stmtErrors);
  }

  return { results, errors };
}
