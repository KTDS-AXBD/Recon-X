/**
 * Auto-Evaluate Orchestrator
 * Runs mechanical → semantic → consensus sequentially.
 * Saves each stage result to pipeline_evaluations table.
 * If mechanical fails, skips semantic + consensus.
 */

import type { EvalResult, EvalPipelineResult, SkillPackage } from "@ai-foundry/types";
import { createLogger } from "@ai-foundry/utils";
import type { Env } from "../env.js";
import { runMechanicalEval } from "./mechanical.js";
import { runSemanticEval } from "./semantic.js";
import { runConsensusEval } from "./consensus.js";

const logger = createLogger("svc-governance:evaluator");

export async function runAutoEvaluate(
  skillPackage: SkillPackage,
  targetId: string,
  organizationId: string,
  env: Env,
  ctx: ExecutionContext,
): Promise<EvalPipelineResult> {
  const stages: EvalResult[] = [];

  // Stage 1: Mechanical
  const mechanical = runMechanicalEval(skillPackage);
  stages.push(mechanical);
  ctx.waitUntil(saveEvalResult(env, "skill", targetId, organizationId, mechanical));

  // If mechanical fails, skip remaining stages
  if (mechanical.verdict === "fail") {
    const skippedSemantic = buildSkipped("semantic");
    const skippedConsensus = buildSkipped("consensus");
    stages.push(skippedSemantic, skippedConsensus);
    ctx.waitUntil(saveEvalResult(env, "skill", targetId, organizationId, skippedSemantic));
    ctx.waitUntil(saveEvalResult(env, "skill", targetId, organizationId, skippedConsensus));

    logger.info("Auto-evaluate stopped at mechanical (fail)", { targetId });
    return buildPipelineResult("skill", targetId, organizationId, stages);
  }

  // Stage 2: Semantic
  const semantic = await runSemanticEval(skillPackage, env);
  stages.push(semantic);
  ctx.waitUntil(saveEvalResult(env, "skill", targetId, organizationId, semantic));

  if (semantic.verdict === "fail") {
    const skippedConsensus = buildSkipped("consensus");
    stages.push(skippedConsensus);
    ctx.waitUntil(saveEvalResult(env, "skill", targetId, organizationId, skippedConsensus));

    logger.info("Auto-evaluate stopped at semantic (fail)", { targetId });
    return buildPipelineResult("skill", targetId, organizationId, stages);
  }

  // Stage 3: Consensus
  const consensus = await runConsensusEval(skillPackage, env);
  stages.push(consensus);
  ctx.waitUntil(saveEvalResult(env, "skill", targetId, organizationId, consensus));

  logger.info("Auto-evaluate complete", {
    targetId,
    stageCount: stages.length,
    finalVerdict: consensus.verdict,
  });

  return buildPipelineResult("skill", targetId, organizationId, stages);
}

function buildSkipped(stage: "semantic" | "consensus"): EvalResult {
  return {
    stage,
    verdict: "skipped",
    score: 0,
    issues: [],
    evaluator: `${stage}-skipped`,
    durationMs: 0,
    timestamp: new Date().toISOString(),
  };
}

async function saveEvalResult(
  env: Env,
  targetType: "policy" | "skill" | "document",
  targetId: string,
  organizationId: string,
  result: EvalResult,
): Promise<void> {
  const evalId = `pe-${crypto.randomUUID().slice(0, 12)}`;
  try {
    await env.DB_GOVERNANCE.prepare(
      `INSERT INTO pipeline_evaluations
       (eval_id, target_type, target_id, organization_id, stage, verdict, score, issues_json, evaluator, duration_ms, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        evalId,
        targetType,
        targetId,
        organizationId,
        result.stage,
        result.verdict,
        result.score,
        JSON.stringify(result.issues),
        result.evaluator,
        result.durationMs,
        result.metadata ? JSON.stringify(result.metadata) : null,
        result.timestamp,
      )
      .run();
  } catch (e) {
    logger.error("Failed to save eval result", { evalId, stage: result.stage, error: String(e) });
  }
}

function buildPipelineResult(
  targetType: "policy" | "skill" | "document",
  targetId: string,
  organizationId: string,
  stages: EvalResult[],
): EvalPipelineResult {
  // Final verdict = last non-skipped stage's verdict
  const nonSkipped = stages.filter((s) => s.verdict !== "skipped");
  const last = nonSkipped[nonSkipped.length - 1];
  const finalVerdict = last?.verdict ?? "fail";
  const finalScore = last?.score ?? 0;

  return {
    targetType,
    targetId,
    organizationId,
    stages,
    finalVerdict,
    finalScore,
    completedAt: new Date().toISOString(),
  };
}
