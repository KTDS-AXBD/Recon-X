/**
 * Stage 2: Semantic Evaluator
 * Calls LLM (Haiku tier) to check policy logic consistency,
 * inter-policy contradictions, and domain terminology appropriateness.
 */

import type { EvalResult, EvalIssue, SkillPackage } from "@ai-foundry/types";
import { createLogger } from "@ai-foundry/utils";

const logger = createLogger("svc-governance:evaluator:semantic");

const THRESHOLDS = { fail: 0.5, needsReview: 0.7 } as const;

export interface SemanticEvalEnv {
  LLM_ROUTER: Fetcher;
  INTERNAL_API_SECRET: string;
}

interface SemanticScores {
  logicConsistency: number;
  interPolicyCoherence: number;
  terminologyAppropriateness: number;
}

export async function runSemanticEval(
  skillPackage: SkillPackage,
  env: SemanticEvalEnv,
): Promise<EvalResult> {
  const startMs = Date.now();
  const issues: EvalIssue[] = [];

  try {
    const system = `You are a policy quality evaluator for AI Foundry.
Evaluate the given set of policies on 3 dimensions. Return ONLY a JSON object:
{
  "logicConsistency": 0.0,
  "interPolicyCoherence": 0.0,
  "terminologyAppropriateness": 0.0,
  "issues": [{"dimension": "...", "message": "...", "severity": "warning|error"}]
}
- logicConsistency (0-1): Does each policy's condition-criteria-outcome chain make logical sense?
- interPolicyCoherence (0-1): Are there contradictions between policies?
- terminologyAppropriateness (0-1): Are domain terms used correctly and consistently?`;

    const policySummary = skillPackage.policies
      .slice(0, 30)
      .map(
        (p, i) =>
          `${i + 1}. [${p.code}] ${p.title}\n   IF: ${p.condition.slice(0, 150)}\n   CRITERIA: ${p.criteria.slice(0, 150)}\n   THEN: ${p.outcome.slice(0, 150)}`,
      )
      .join("\n\n");

    const userContent = `Domain: ${skillPackage.metadata.domain}
Total Policies: ${skillPackage.policies.length}

Policies (up to 30):
${policySummary}`;

    const response = await env.LLM_ROUTER.fetch(
      "https://svc-llm-router.internal/complete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({
          tier: "haiku",
          messages: [{ role: "user", content: userContent }],
          system,
          callerService: "svc-governance",
          maxTokens: 1024,
          temperature: 0.1,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      logger.error("LLM call failed", { status: response.status, body: text.slice(0, 200) });
      issues.push({
        code: "SEM_LLM_ERROR",
        severity: "error",
        message: `LLM call failed: ${response.status}`,
      });
      return buildResult(startMs, 0, "fail", issues);
    }

    const llmResult = (await response.json()) as { content?: string; text?: string };
    const rawText = llmResult.content ?? llmResult.text ?? "";

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      issues.push({
        code: "SEM_PARSE_ERROR",
        severity: "error",
        message: "Could not parse LLM response as JSON",
      });
      return buildResult(startMs, 0, "fail", issues);
    }

    const scores: SemanticScores & { issues?: Array<{ dimension: string; message: string; severity: string }> } =
      JSON.parse(jsonMatch[0]);

    // Collect LLM-reported issues
    if (scores.issues && Array.isArray(scores.issues)) {
      for (const llmIssue of scores.issues) {
        issues.push({
          code: "SEM_LLM_FINDING",
          severity: llmIssue.severity === "error" ? "error" : "warning",
          message: llmIssue.message,
          dimension: llmIssue.dimension,
        });
      }
    }

    const avgScore =
      (clamp(scores.logicConsistency) +
        clamp(scores.interPolicyCoherence) +
        clamp(scores.terminologyAppropriateness)) /
      3;

    const verdict =
      avgScore < THRESHOLDS.fail
        ? "fail"
        : avgScore < THRESHOLDS.needsReview
          ? "needs_review"
          : "pass";

    logger.info("Semantic eval complete", { verdict, avgScore, issueCount: issues.length });
    return buildResult(startMs, round3(avgScore), verdict, issues, {
      logicConsistency: clamp(scores.logicConsistency),
      interPolicyCoherence: clamp(scores.interPolicyCoherence),
      terminologyAppropriateness: clamp(scores.terminologyAppropriateness),
    });
  } catch (e) {
    logger.error("Semantic eval error", { error: String(e) });
    issues.push({
      code: "SEM_UNEXPECTED_ERROR",
      severity: "error",
      message: String(e),
    });
    return buildResult(startMs, 0, "fail", issues);
  }
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function buildResult(
  startMs: number,
  score: number,
  verdict: "pass" | "fail" | "needs_review",
  issues: EvalIssue[],
  metadata?: Record<string, unknown>,
): EvalResult {
  return {
    stage: "semantic",
    verdict,
    score,
    issues,
    evaluator: "semantic-haiku-v1",
    durationMs: Date.now() - startMs,
    timestamp: new Date().toISOString(),
    metadata,
  };
}
