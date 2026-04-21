import { buildHeaders } from "./headers";

export interface ProvenanceSource {
  type: "reverse-engineering" | "inference";
  path?: string;
  section?: string;
  confidence: number;
  documentId?: string;
}

export interface ProvenancePolicy {
  code: string;
  title: string;
  condition: string;
  criteria: string;
  outcome: string;
  confidence: number;
}

export interface ProvenanceTerm {
  termId: string;
  label: string;
  definition?: string;
}

export interface ProvenanceResolveData {
  skillId: string;
  domain: string;
  r2Key: string;
  extractedAt: string;
  sources: ProvenanceSource[];
  policies: ProvenancePolicy[];
  terms: ProvenanceTerm[];
  documentIds: string[];
  pipelineStages: string[];
}

export async function fetchProvenanceResolve(
  orgId: string,
  skillId: string,
): Promise<{ success: true; data: ProvenanceResolveData } | { success: false; error: string }> {
  try {
    const res = await fetch(`/api/skills/${skillId}/provenance/resolve`, {
      headers: buildHeaders({ organizationId: orgId }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: body };
    }
    const data = await res.json() as ProvenanceResolveData;
    return { success: true, data };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
