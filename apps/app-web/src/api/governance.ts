import type { ApiResponse } from "@ai-foundry/types";

const API_BASE =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

const HEADERS = {
  "Content-Type": "application/json",
  "X-Internal-Secret":
    (import.meta.env["VITE_INTERNAL_SECRET"] as string | undefined) ??
    "dev-secret",
  "X-User-Id": "exec-001",
  "X-User-Role": "Executive",
  "X-Organization-Id": "org-001",
};

export interface CostSummary {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  byTier: Record<string, { requests: number; tokens: number; cost: number }>;
  byService: Record<string, { requests: number; tokens: number; cost: number }>;
  period: string;
}

export async function fetchCostSummary(): Promise<ApiResponse<CostSummary>> {
  const res = await fetch(`${API_BASE}/cost`, { headers: HEADERS });
  return res.json() as Promise<ApiResponse<CostSummary>>;
}

export interface TrustData {
  byTargetType: Record<string, Record<string, { count: number; avgScore: number }>>;
  totalEvaluations: number;
}

export async function fetchTrust(): Promise<ApiResponse<TrustData>> {
  const res = await fetch(`${API_BASE}/trust`, { headers: HEADERS });
  return res.json() as Promise<ApiResponse<TrustData>>;
}
