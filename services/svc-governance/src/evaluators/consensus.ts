/**
 * Stage 3: Consensus Evaluator
 * Calls 2 LLM providers (anthropic, openai) with the same prompt.
 * Score difference logic:
 *   < 0.15  → consensus_approve (avg score)
 *   < 0.30  → consensus_approve (min score)
 *   >= 0.30 → consensus_split
 */

import type { EvalResult, EvalIssue, SkillPackage } from "@ai-foundry/types";
import { createLogger } from "@ai-foundry/utils";

const logger = createLogger("svc-governance:evaluator:consensus");

export interface ConsensusEvalEnv {
  LLM_ROUTER: Fetcher;
  INTERNAL_API_SECRET: string;
}

interface ProviderScore {
  provider: string;
  score: number;
  reasoning: string;
}

export async function runConsensusEval(
  skillPackage: SkillPackage,
  env: ConsensusEvalEnv,
): Promise<EvalResult> {
  const startMs = Date.now();
  const issues: EvalIssue[] = [];

  try {
    const system = `You are a policy quality judge for AI Foundry.
Rate the overall quality of this skill package on a 0.0 to 1.0 scale.
Return ONLY a JSON object:
{
  "score": 0.0,
  "reasoning": "brief explanation"
}
Consider: policy specificity, logical consistency, completeness, and domain relevance.`;

    const policySummary = skillPackage.policies
      .slice(0, 20)
      .map(
        (p, i) =>
          `${i + 1}. [${p.code}] IF ${p.condition.slice(0, 100)} → THEN ${p.outcome.slice(0, 100)}`,
      )
      .join("\n");

    const userContent = `Domain: ${skillPackage.metadata.domain}
Policies (${skillPackage.policies.length} total, showing up to 20):
${policySummary}`;

    // Call two providers in parallel
    const [resultA, resultB] = await Promise.all([
      callProvider("anthropic", system, userContent, env),
      callProvider("openai", system, userContent, env),
    ]);

    const scores: ProviderScore[] = [];

    if (resultA) {
      scores.push(resultA);
    } else {
      issues.push({
        code: "CONS_PROVIDER_FAIL",
        severity: "warning",
        message: "Anthropic provider call failed",
      });
    }

    if (resultB) {
      scores.push(resultB);
    } else {
      issues.push({
        code: "CONS_PROVIDER_FAIL",
        severity: "warning",
        message: "OpenAI provider call failed",
      });
    }

    // Need at least 1 score
    if (scores.length === 0) {
      issues.push({
        code: "CONS_ALL_FAILED",
        severity: "error",
        message: "All provider calls failed",
      });
      return buildResult(startMs, 0, "consensus_reject", issues);
    }

    // Single provider fallback
    if (scores.length === 1) {
      const single = scores[0]!;
      issues.push({
        code: "CONS_SINGLE_PROVIDER",
        severity: "warning",
        message: `Only ${single.provider} responded; no consensus possible`,
      });
      const verdict = single.score >= 0.5 ? "consensus_approve" : "consensus_reject";
      return buildResult(startMs, round3(single.score), verdict, issues, {
        providers: scores,
      });
    }

    // Two scores — consensus logic
    const scoreA = scores[0]!.score;
    const scoreB = scores[1]!.score;
    const diff = Math.abs(scoreA - scoreB);
    const avg = (scoreA + scoreB) / 2;
    const min = Math.min(scoreA, scoreB);

    let finalScore: number;
    let verdict: "consensus_approve" | "consensus_reject" | "consensus_split";

    if (diff < 0.15) {
      finalScore = avg;
      verdict = avg >= 0.5 ? "consensus_approve" : "consensus_reject";
    } else if (diff < 0.30) {
      finalScore = min;
      verdict = min >= 0.5 ? "consensus_approve" : "consensus_reject";
    } else {
      finalScore = avg;
      verdict = "consensus_split";
      issues.push({
        code: "CONS_SPLIT",
        severity: "warning",
        message: `Provider scores diverge: ${scoreA.toFixed(2)} vs ${scoreB.toFixed(2)} (diff=${diff.toFixed(2)})`,
      });
    }

    logger.info("Consensus eval complete", {
      verdict,
      finalScore,
      diff: round3(diff),
      providers: scores.map((s) => `${s.provider}=${s.score}`),
    });

    return buildResult(startMs, round3(finalScore), verdict, issues, {
      providers: scores,
      scoreDiff: round3(diff),
    });
  } catch (e) {
    logger.error("Consensus eval error", { error: String(e) });
    issues.push({
      code: "CONS_UNEXPECTED_ERROR",
      severity: "error",
      message: String(e),
    });
    return buildResult(startMs, 0, "consensus_reject", issues);
  }
}

async function callProvider(
  provider: string,
  system: string,
  userContent: string,
  env: ConsensusEvalEnv,
): Promise<ProviderScore | null> {
  try {
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
          preferredProvider: provider,
          messages: [{ role: "user", content: userContent }],
          system,
          callerService: "svc-governance",
          maxTokens: 512,
          temperature: 0.1,
        }),
      },
    );

    if (!response.ok) {
      logger.warn("Provider call failed", { provider, status: response.status });
      return null;
    }

    const llmResult = (await response.json()) as { content?: string; text?: string };
    const rawText = llmResult.content ?? llmResult.text ?? "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed: { score?: number; reasoning?: string } = JSON.parse(jsonMatch[0]);
    const score = typeof parsed.score === "number" ? clamp(parsed.score) : 0;
    const reasoning = parsed.reasoning ?? "";

    return { provider, score, reasoning };
  } catch (e) {
    logger.warn("Provider call error", { provider, error: String(e) });
    return null;
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
  verdict: "consensus_approve" | "consensus_reject" | "consensus_split",
  issues: EvalIssue[],
  metadata?: Record<string, unknown>,
): EvalResult {
  return {
    stage: "consensus",
    verdict,
    score,
    issues,
    evaluator: "consensus-dual-v1",
    durationMs: Date.now() - startMs,
    timestamp: new Date().toISOString(),
    metadata,
  };
}
