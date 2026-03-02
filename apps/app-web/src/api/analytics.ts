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

export interface QualityMetrics {
  organizationId: string;
  period: { startDate: string; endDate: string };
  parsing: {
    totalDocuments: number;
    totalChunks: number;
    chunkValidityRate: number;
    avgChunksPerDoc: number;
    avgParseDurationMs: number;
  };
  extraction: {
    totalExtractions: number;
    totalRules: number;
    avgRulesPerExtraction: number;
    avgExtractionDurationMs: number;
  };
  policy: {
    candidateCount: number;
    approvedCount: number;
    modifiedCount: number;
    approvalRate: number;
    modificationRate: number;
    avgTrustScore: number;
  };
  skill: {
    totalSkills: number;
    avgTrustScore: number;
    totalTerms: number;
  };
  stageLatencies: Record<
    string,
    { avgMs: number; minMs: number; maxMs: number; samples: number }
  >;
}

export async function fetchQualityMetrics(): Promise<
  ApiResponse<QualityMetrics>
> {
  const res = await fetch(`${API_BASE}/quality`, { headers: HEADERS });
  return res.json() as Promise<ApiResponse<QualityMetrics>>;
}
