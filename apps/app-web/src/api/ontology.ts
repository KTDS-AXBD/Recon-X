import type { ApiResponse } from "@ai-foundry/types";
import { buildHeaders } from "./headers";

const API_BASE =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

function headers(organizationId: string): Record<string, string> {
  return buildHeaders({ organizationId, contentType: "application/json" });
}

export interface TermRow {
  termId: string;
  ontologyId: string;
  label: string;
  definition: string | null;
  skosUri: string;
  broaderTermId: string | null;
  embeddingModel: string | null;
  createdAt: string;
}

export async function fetchTerms(
  organizationId: string,
  params?: {
    ontologyId?: string;
    limit?: number;
    offset?: number;
  },
): Promise<ApiResponse<{ terms: TermRow[]; limit: number; offset: number }>> {
  const qs = new URLSearchParams();
  if (params !== undefined) {
    if (params.ontologyId !== undefined) qs.set("ontologyId", params.ontologyId);
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
  }
  const query = qs.toString();
  const res = await fetch(
    `${API_BASE}/terms${query ? `?${query}` : ""}`,
    { headers: headers(organizationId) },
  );
  return res.json() as Promise<
    ApiResponse<{ terms: TermRow[]; limit: number; offset: number }>
  >;
}

export async function fetchTerm(
  organizationId: string,
  id: string,
): Promise<ApiResponse<TermRow>> {
  const res = await fetch(`${API_BASE}/terms/${id}`, {
    headers: headers(organizationId),
  });
  return res.json() as Promise<ApiResponse<TermRow>>;
}

export interface GraphResult {
  columns: string[];
  rows: unknown[][];
  query: string;
}

export async function fetchGraph(
  organizationId: string,
  query?: string,
): Promise<ApiResponse<GraphResult>> {
  const qs = new URLSearchParams();
  if (query !== undefined) qs.set("query", query);
  const q = qs.toString();
  const res = await fetch(
    `${API_BASE}/graph${q ? `?${q}` : ""}`,
    { headers: headers(organizationId) },
  );
  return res.json() as Promise<ApiResponse<GraphResult>>;
}

// ── Stats ────────────────────────────────────────────────────────────

export interface TermsStats {
  totalTerms: number;
  distinctLabels: number;
  ontologyCount: number;
  neo4j: {
    termNodes: number;
    ontologyNodes: number;
    policyNodes: number;
    relationships: number;
  } | null;
}

export async function fetchTermsStats(
  organizationId: string,
): Promise<ApiResponse<TermsStats>> {
  const res = await fetch(`${API_BASE}/terms/stats`, {
    headers: headers(organizationId),
  });
  return res.json() as Promise<ApiResponse<TermsStats>>;
}

// ── Graph Visualization ──────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  definition: string;
  frequency: number;
  group: "core" | "important" | "standard";
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface GraphVisualizationData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export async function fetchGraphVisualization(
  organizationId: string,
  params?: { limit?: number; term?: string },
): Promise<ApiResponse<GraphVisualizationData>> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.term !== undefined) qs.set("term", params.term);
  const q = qs.toString();
  const res = await fetch(
    `${API_BASE}/graph/visualization${q ? `?${q}` : ""}`,
    { headers: headers(organizationId) },
  );
  return res.json() as Promise<ApiResponse<GraphVisualizationData>>;
}
