import type { ApiResponse } from "@ai-foundry/types";
import { buildHeaders } from "./headers";

const API_BASE =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

function headers(organizationId: string): Record<string, string> {
  return buildHeaders({ organizationId, contentType: "application/json" });
}

// ─── Benchmark ───

export interface BenchmarkOrgData {
  id: string;
  label: string;
  domain: string;
  kpi: {
    documentsUploaded: number;
    extractionsCompleted: number;
    policiesGenerated: number;
    policiesApproved: number;
    skillsPackaged: number;
    avgPipelineDurationMs: number;
  };
  quality: {
    parsing: {
      totalDocuments: number;
      totalChunks: number;
      chunkValidityRate: number;
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
      approvalRate: number;
      avgTrustScore: number;
    };
    skill: {
      totalSkills: number;
      avgTrustScore: number;
      totalTerms: number;
    };
  };
  stageLatencies: Record<
    string,
    { avgMs: number; minMs: number; maxMs: number; samples: number }
  >;
}

export interface ManualComparison {
  documentsProcessed: number;
  policiesExtracted: number;
  skillsGenerated: number;
  aiFoundry: {
    processingMode: string;
    estimatedHours: number;
    accuracyRate: number;
    consistencyRate: number;
    reviewCycleDays: number;
  };
  manual: {
    processingMode: string;
    estimatedHours: number;
    accuracyRate: number;
    consistencyRate: number;
    reviewCycleDays: number;
  };
  improvement: {
    timeReductionPercent: number;
    accuracyGainPp: number;
    consistencyGainPp: number;
    reviewSpeedupX: number;
  };
}

export interface BenchmarkData {
  generatedAt: string;
  organizations: BenchmarkOrgData[];
  aiFoundryVsManual: ManualComparison;
}

export async function fetchBenchmark(
  organizationId: string,
): Promise<ApiResponse<BenchmarkData>> {
  const res = await fetch(`${API_BASE}/reports/benchmark`, {
    headers: headers(organizationId),
  });
  return res.json() as Promise<ApiResponse<BenchmarkData>>;
}
