import { buildHeaders } from "./headers";

export interface PipelineEval {
  evalId: string;
  targetType: string;
  targetId: string;
  organizationId: string;
  stage: string;
  verdict: string;
  score: number;
  issuesJson: string;
  evaluator: string;
  durationMs: number;
  createdAt: string;
}

export interface EvalSummaryItem {
  stage: string;
  totalCount: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  avgScore: number;
}

export async function fetchPipelineEvals(
  orgId: string,
  params?: {
    targetType?: string;
    targetId?: string;
    stage?: string;
    verdict?: string;
    limit?: number;
  },
): Promise<PipelineEval[]> {
  const qs = new URLSearchParams();
  if (params?.targetType) qs.set("targetType", params.targetType);
  if (params?.targetId) qs.set("targetId", params.targetId);
  if (params?.stage) qs.set("stage", params.stage);
  if (params?.verdict) qs.set("verdict", params.verdict);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  const res = await fetch(
    `/api/pipeline-evaluations${query ? `?${query}` : ""}`,
    { headers: buildHeaders(orgId) },
  );
  if (!res.ok) throw new Error(`Pipeline evals fetch failed: ${res.status}`);
  const json = (await res.json()) as { data: { evaluations: PipelineEval[] } };
  return json.data.evaluations;
}

export async function fetchEvalSummary(
  orgId: string,
  params?: { stage?: string },
): Promise<EvalSummaryItem[]> {
  const qs = new URLSearchParams();
  if (params?.stage) qs.set("stage", params.stage);
  const query = qs.toString();
  const res = await fetch(
    `/api/pipeline-evaluations/summary${query ? `?${query}` : ""}`,
    { headers: buildHeaders(orgId) },
  );
  if (!res.ok) throw new Error(`Eval summary fetch failed: ${res.status}`);
  const json = (await res.json()) as { data: { summary: EvalSummaryItem[] } };
  return json.data.summary;
}
