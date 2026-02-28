import type { ApiResponse } from "@ai-foundry/types";

const API_BASE =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

const HEADERS = {
  "Content-Type": "application/json",
  "X-Internal-Secret":
    (import.meta.env["VITE_INTERNAL_SECRET"] as string | undefined) ??
    "dev-secret",
  "X-User-Id": "analyst-001",
  "X-User-Role": "Analyst",
  "X-Organization-Id": "org-001",
};

export interface ExtractionRow {
  extractionId: string;
  documentId: string;
  status: "pending" | "completed" | "failed";
  processNodeCount: number;
  entityCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface ExtractionDetail extends ExtractionRow {
  result: {
    processes: { name: string; description: string; steps: string[] }[];
    entities: { name: string; type: string; attributes: string[] }[];
    relationships: { from: string; to: string; type: string }[];
    rules: { condition: string; outcome: string; domain: string }[];
  } | null;
}

export async function fetchExtractions(
  documentId: string,
): Promise<ApiResponse<{ extractions: ExtractionRow[] }>> {
  const qs = new URLSearchParams({ documentId });
  const res = await fetch(`${API_BASE}/extractions?${qs.toString()}`, {
    headers: HEADERS,
  });
  return res.json() as Promise<
    ApiResponse<{ extractions: ExtractionRow[] }>
  >;
}

export async function fetchExtraction(
  id: string,
): Promise<ApiResponse<ExtractionDetail>> {
  const res = await fetch(`${API_BASE}/extractions/${id}`, {
    headers: HEADERS,
  });
  return res.json() as Promise<ApiResponse<ExtractionDetail>>;
}
