/**
 * Pipeline evaluation routes for svc-governance.
 * POST /pipeline-evaluations/auto — run 3-stage auto evaluator
 * GET  /pipeline-evaluations — list evaluations (filtered)
 * GET  /pipeline-evaluations/summary — aggregated summary
 */

import { SkillPackageSchema } from "@ai-foundry/types";
import { badRequest, createLogger } from "@ai-foundry/utils";
import type { Env } from "../env.js";
import { runAutoEvaluate } from "../evaluators/index.js";

const logger = createLogger("svc-governance:pipeline-eval");

/** POST /pipeline-evaluations/auto */
export async function handleAutoEvaluate(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { targetType, targetId, organizationId, skillPackageJson } = body as {
    targetType?: string;
    targetId?: string;
    organizationId?: string;
    skillPackageJson?: unknown;
  };

  if (!targetType || !targetId || !organizationId) {
    return badRequest("targetType, targetId, organizationId are required");
  }

  // Get skill package: from body or fetch from SVC_SKILL
  let rawPackage: unknown = skillPackageJson;
  if (!rawPackage) {
    try {
      const resp = await env.SVC_SKILL.fetch(
        `https://svc-skill.internal/skills/${targetId}`,
        {
          headers: {
            "X-Internal-Secret": env.INTERNAL_API_SECRET,
            "X-Organization-Id": organizationId,
          },
        },
      );
      if (!resp.ok) {
        return badRequest(`Failed to fetch skill ${targetId}: ${resp.status}`);
      }
      const skillResp = (await resp.json()) as { success: boolean; data?: unknown };
      rawPackage = skillResp.data;
    } catch (e) {
      logger.error("Failed to fetch skill package", { targetId, error: String(e) });
      return badRequest(`Failed to fetch skill: ${String(e)}`);
    }
  }

  const parsed = SkillPackageSchema.safeParse(rawPackage);
  if (!parsed.success) {
    return badRequest("Invalid SkillPackage", parsed.error.flatten());
  }

  const result = await runAutoEvaluate(parsed.data, targetId, organizationId, env, ctx);

  return new Response(
    JSON.stringify({ success: true, data: result }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** GET /pipeline-evaluations */
export async function handleListPipelineEvaluations(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const targetType = url.searchParams.get("targetType");
  const targetId = url.searchParams.get("targetId");
  const organizationId = url.searchParams.get("organizationId");
  const stage = url.searchParams.get("stage");
  const verdict = url.searchParams.get("verdict");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  let sql = "SELECT * FROM pipeline_evaluations WHERE 1=1";
  const bindings: (string | number)[] = [];

  if (targetType) {
    sql += " AND target_type = ?";
    bindings.push(targetType);
  }
  if (targetId) {
    sql += " AND target_id = ?";
    bindings.push(targetId);
  }
  if (organizationId) {
    sql += " AND organization_id = ?";
    bindings.push(organizationId);
  }
  if (stage) {
    sql += " AND stage = ?";
    bindings.push(stage);
  }
  if (verdict) {
    sql += " AND verdict = ?";
    bindings.push(verdict);
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  bindings.push(limit, offset);

  const stmt = env.DB_GOVERNANCE.prepare(sql);
  const result = await (bindings.length > 0
    ? stmt.bind(...bindings)
    : stmt
  ).all();

  return new Response(
    JSON.stringify({ success: true, data: result.results }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** GET /pipeline-evaluations/summary */
export async function handlePipelineEvaluationsSummary(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  const stage = url.searchParams.get("stage");

  let sql = `SELECT stage, verdict, COUNT(*) as count,
             ROUND(AVG(score), 3) as avg_score,
             MIN(score) as min_score, MAX(score) as max_score
             FROM pipeline_evaluations WHERE 1=1`;
  const bindings: string[] = [];

  if (organizationId) {
    sql += " AND organization_id = ?";
    bindings.push(organizationId);
  }
  if (stage) {
    sql += " AND stage = ?";
    bindings.push(stage);
  }
  sql += " GROUP BY stage, verdict ORDER BY stage, verdict";

  const stmt = env.DB_GOVERNANCE.prepare(sql);
  const result = await (bindings.length > 0
    ? stmt.bind(...bindings)
    : stmt
  ).all();

  return new Response(
    JSON.stringify({ success: true, data: result.results }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
