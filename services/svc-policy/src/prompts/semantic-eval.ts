import type { PolicyCandidate } from "@ai-foundry/types";

/**
 * Policy 시맨틱 평가 프롬프트를 생성한다.
 * Sonnet 티어로 호출하여 5개 dimension을 0~1 스케일로 채점.
 */
export function buildSemanticEvalPrompt(candidate: PolicyCandidate): {
  system: string;
  userContent: string;
} {
  const system = `You are a policy quality evaluator for AI Foundry.
Evaluate the given policy (condition-criteria-outcome triple) on 5 dimensions.
Return ONLY a JSON object with scores 0.0 to 1.0 for each dimension.

Dimensions:
- specificity: Are the condition and criteria specific? (penalize vague words: "적절한", "충분한", "상황에 따라")
- consistency: Are condition, criteria, and outcome logically consistent?
- completeness: Are boundary conditions and exceptions addressed?
- actionability: Is the outcome a concrete, executable action?
- traceability: Is source evidence provided (sourceExcerpt, sourcePageRef)?

Output format (JSON only, no explanation):
{
  "specificity": 0.0,
  "consistency": 0.0,
  "completeness": 0.0,
  "actionability": 0.0,
  "traceability": 0.0
}`;

  const userContent = `Policy to evaluate:
- Code: ${candidate.policyCode}
- Title: ${candidate.title}
- Condition (IF): ${candidate.condition}
- Criteria: ${candidate.criteria}
- Outcome (THEN): ${candidate.outcome}
- Source Excerpt: ${candidate.sourceExcerpt ?? "(없음)"}
- Source Page Ref: ${candidate.sourcePageRef ?? "(없음)"}
- Tags: ${candidate.tags.join(", ") || "(없음)"}`;

  return { system, userContent };
}
