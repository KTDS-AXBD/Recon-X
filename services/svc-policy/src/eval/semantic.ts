import type {
  EvalResult,
  EvalIssue,
  PolicySemanticDimension,
} from "@ai-foundry/types";
import type { PolicyCandidate } from "@ai-foundry/types";
import { buildSemanticEvalPrompt } from "../prompts/semantic-eval.js";

/** 시맨틱 평가 dimension 가중치 */
const SEMANTIC_WEIGHTS = {
  specificity: 0.25,
  consistency: 0.25,
  completeness: 0.20,
  actionability: 0.20,
  traceability: 0.10,
} as const;

/** 판정 임계값 */
const THRESHOLDS = {
  fail: 0.5,
  needsReview: 0.7,
} as const;

export interface SemanticEvalEnv {
  LLM_ROUTER: Fetcher;
  INTERNAL_API_SECRET: string;
}

/**
 * Policy Semantic Evaluator — Sonnet LLM을 사용한 의미적 품질 평가.
 *
 * condition-criteria-outcome 트리플을 5개 차원에서 채점:
 * - Specificity (25%): 조건과 기준의 구체성
 * - Consistency (25%): condition ↔ criteria ↔ outcome 논리적 일관성
 * - Completeness (20%): 경계 조건/예외 사항 완전성
 * - Actionability (20%): outcome의 실행 가능성
 * - Traceability (10%): 원문 추적 가능성
 */
export class SemanticEvaluator {
  async evaluate(
    candidate: PolicyCandidate,
    env: SemanticEvalEnv,
  ): Promise<EvalResult> {
    const startMs = Date.now();

    try {
      const { system, userContent } = buildSemanticEvalPrompt(candidate);

      const response = await env.LLM_ROUTER.fetch(
        "https://svc-llm-router.internal/complete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": env.INTERNAL_API_SECRET,
          },
          body: JSON.stringify({
            tier: "sonnet",
            messages: [{ role: "user", content: userContent }],
            system,
            callerService: "svc-policy",
            maxTokens: 1024,
            temperature: 0.1,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`LLM Router error: ${response.status}`);
      }

      const json = (await response.json()) as {
        success: boolean;
        data: { content: string };
        error?: { message: string };
      };
      if (!json.success) {
        throw new Error(`LLM failure: ${json.error?.message ?? "unknown"}`);
      }

      const dimensions = this.parseDimensionScores(json.data.content);
      const issues = this.buildIssues(dimensions);
      const weightedScore = this.calculateWeightedScore(dimensions);
      const verdict = this.determineVerdict(weightedScore);
      const durationMs = Date.now() - startMs;

      return {
        stage: "semantic",
        verdict,
        score: Math.round(weightedScore * 1000) / 1000,
        issues,
        evaluator: "sonnet-semantic",
        durationMs,
        timestamp: new Date().toISOString(),
        metadata: { dimensions },
      };
    } catch (error) {
      return {
        stage: "semantic",
        verdict: "needs_review",
        score: 0,
        issues: [{
          code: "SEM_LLM_ERROR",
          severity: "warning",
          message: `Semantic evaluation skipped: ${String(error)}`,
        }],
        evaluator: "sonnet-semantic",
        durationMs: Date.now() - startMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private parseDimensionScores(content: string): PolicySemanticDimension {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { specificity: 0, consistency: 0, completeness: 0, actionability: 0, traceability: 0 };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        specificity: this.clampScore(parsed["specificity"]),
        consistency: this.clampScore(parsed["consistency"]),
        completeness: this.clampScore(parsed["completeness"]),
        actionability: this.clampScore(parsed["actionability"]),
        traceability: this.clampScore(parsed["traceability"]),
      };
    } catch {
      return { specificity: 0, consistency: 0, completeness: 0, actionability: 0, traceability: 0 };
    }
  }

  private clampScore(value: unknown): number {
    if (typeof value !== "number") return 0;
    return Math.max(0, Math.min(1, value));
  }

  private calculateWeightedScore(d: PolicySemanticDimension): number {
    return (
      d.specificity * SEMANTIC_WEIGHTS.specificity +
      d.consistency * SEMANTIC_WEIGHTS.consistency +
      d.completeness * SEMANTIC_WEIGHTS.completeness +
      d.actionability * SEMANTIC_WEIGHTS.actionability +
      d.traceability * SEMANTIC_WEIGHTS.traceability
    );
  }

  private determineVerdict(score: number): "pass" | "fail" | "needs_review" {
    if (score < THRESHOLDS.fail) return "fail";
    if (score < THRESHOLDS.needsReview) return "needs_review";
    return "pass";
  }

  private buildIssues(d: PolicySemanticDimension): EvalIssue[] {
    const issues: EvalIssue[] = [];
    const check = (
      value: number,
      name: string,
      code: string,
      message: string,
    ) => {
      if (value < 0.5) {
        issues.push({
          code,
          severity: "warning",
          message,
          dimension: name,
        });
      }
    };

    check(d.specificity, "specificity", "SEM_LOW_SPECIFICITY",
      "조건/기준이 모호해요 — 구체적 수치나 조건을 포함해야 해요.");
    check(d.consistency, "consistency", "SEM_INCONSISTENT",
      "condition ↔ criteria ↔ outcome 간 논리적 일관성이 부족해요.");
    check(d.completeness, "completeness", "SEM_INCOMPLETE",
      "경계 조건이나 예외 사항이 누락되었을 수 있어요.");
    check(d.actionability, "actionability", "SEM_NOT_ACTIONABLE",
      "outcome이 실행 가능한 구체적 행동으로 기술되지 않았어요.");
    check(d.traceability, "traceability", "SEM_LOW_TRACEABILITY",
      "원문 추적 정보(sourceExcerpt, sourcePageRef)가 부족해요.");

    return issues;
  }
}
