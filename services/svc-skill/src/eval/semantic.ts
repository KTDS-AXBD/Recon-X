import type {
  EvalResult,
  EvalIssue,
  SkillSemanticDimension,
} from "@ai-foundry/types";
import type { SkillPackage } from "@ai-foundry/types";

const SKILL_SEMANTIC_WEIGHTS = {
  coverage: 0.40,
  coherence: 0.35,
  granularity: 0.25,
} as const;

const THRESHOLDS = { fail: 0.5, needsReview: 0.7 } as const;

export interface SkillSemanticEnv {
  LLM_ROUTER: Fetcher;
  INTERNAL_API_SECRET: string;
}

/**
 * Skill Semantic Evaluator — Sonnet으로 skill package 전체 평가.
 *
 * 3개 차원:
 * - Coverage (40%): 도메인 내 주요 비즈니스 규칙 충분성
 * - Coherence (35%): policies 간 상호 모순 여부
 * - Granularity (25%): policy 단위 적절성
 */
export class SkillSemanticEvaluator {
  async evaluate(
    skillPackage: SkillPackage,
    env: SkillSemanticEnv,
  ): Promise<EvalResult> {
    const startMs = Date.now();

    try {
      const system = `You are a Skill package quality evaluator for AI Foundry.
Evaluate the given Skill package (set of policies for a domain) on 3 dimensions.
Return ONLY a JSON object with scores 0.0 to 1.0:
{
  "coverage": 0.0,
  "coherence": 0.0,
  "granularity": 0.0
}
- coverage: Are the major business rules in this domain adequately represented?
- coherence: Are there any contradictions between policies?
- granularity: Are policies at an appropriate level of detail? (not too broad, not too narrow)`;

      const policySummary = skillPackage.policies
        .slice(0, 50)
        .map((p, i) => `${i + 1}. [${p.code}] ${p.title}: IF ${p.condition.slice(0, 100)} → THEN ${p.outcome.slice(0, 100)}`)
        .join("\n");

      const userContent = `Skill Package to evaluate:
- Domain: ${skillPackage.metadata.domain}
- Total Policies: ${skillPackage.policies.length}
- Trust Level: ${skillPackage.trust.level} (score: ${skillPackage.trust.score})

Policies (up to 50):
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
            tier: "sonnet",
            messages: [{ role: "user", content: userContent }],
            system,
            callerService: "svc-skill",
            maxTokens: 512,
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

      const dimensions = this.parseDimensions(json.data.content);
      const score = this.calculateScore(dimensions);
      const verdict = score < THRESHOLDS.fail ? "fail"
        : score < THRESHOLDS.needsReview ? "needs_review"
        : "pass";
      const issues = this.buildIssues(dimensions);

      return {
        stage: "semantic",
        verdict,
        score: Math.round(score * 1000) / 1000,
        issues,
        evaluator: "sonnet-semantic-skill",
        durationMs: Date.now() - startMs,
        timestamp: new Date().toISOString(),
        metadata: { dimensions },
      };
    } catch (error) {
      return {
        stage: "semantic",
        verdict: "needs_review",
        score: 0,
        issues: [{
          code: "SKILL_SEM_LLM_ERROR",
          severity: "warning",
          message: `Skill semantic evaluation skipped: ${String(error)}`,
        }],
        evaluator: "sonnet-semantic-skill",
        durationMs: Date.now() - startMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private parseDimensions(content: string): SkillSemanticDimension {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { coverage: 0, coherence: 0, granularity: 0 };
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const clamp = (v: unknown): number => typeof v === "number" ? Math.max(0, Math.min(1, v)) : 0;
      return {
        coverage: clamp(parsed["coverage"]),
        coherence: clamp(parsed["coherence"]),
        granularity: clamp(parsed["granularity"]),
      };
    } catch {
      return { coverage: 0, coherence: 0, granularity: 0 };
    }
  }

  private calculateScore(d: SkillSemanticDimension): number {
    return (
      d.coverage * SKILL_SEMANTIC_WEIGHTS.coverage +
      d.coherence * SKILL_SEMANTIC_WEIGHTS.coherence +
      d.granularity * SKILL_SEMANTIC_WEIGHTS.granularity
    );
  }

  private buildIssues(d: SkillSemanticDimension): EvalIssue[] {
    const issues: EvalIssue[] = [];
    if (d.coverage < 0.5) {
      issues.push({
        code: "SKILL_SEM_LOW_COVERAGE",
        severity: "warning",
        message: "도메인 내 주요 비즈니스 규칙이 충분히 포함되지 않았을 수 있어요.",
        dimension: "coverage",
      });
    }
    if (d.coherence < 0.5) {
      issues.push({
        code: "SKILL_SEM_INCOHERENT",
        severity: "warning",
        message: "정책 간 상호 모순이 감지되었어요.",
        dimension: "coherence",
      });
    }
    if (d.granularity < 0.5) {
      issues.push({
        code: "SKILL_SEM_BAD_GRANULARITY",
        severity: "warning",
        message: "정책 단위가 너무 넓거나 좁아요.",
        dimension: "granularity",
      });
    }
    return issues;
  }
}
