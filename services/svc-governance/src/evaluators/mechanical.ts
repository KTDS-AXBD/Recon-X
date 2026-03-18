/**
 * Stage 1: Mechanical Evaluator
 * Validates SkillPackage structure via Zod + business rule checks.
 */

import { SkillPackageSchema } from "@ai-foundry/types";
import type { EvalResult, EvalIssue } from "@ai-foundry/types";
import { createLogger } from "@ai-foundry/utils";

const logger = createLogger("svc-governance:evaluator:mechanical");

const POLICY_CODE_REGEX = /^POL-[A-Z]+-[A-Z-]+-\d{3}$/;

export function runMechanicalEval(skillPackageJson: unknown): EvalResult {
  const startMs = Date.now();
  const issues: EvalIssue[] = [];

  // 1. Zod parse
  const parsed = SkillPackageSchema.safeParse(skillPackageJson);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        code: "MECH_SCHEMA_INVALID",
        severity: "error",
        message: `${issue.path.join(".")}: ${issue.message}`,
      });
    }
    logger.warn("Mechanical eval: schema validation failed", { issueCount: issues.length });
    return buildResult(startMs, 0, "fail", issues);
  }

  const pkg = parsed.data;

  // 2. Policies array not empty (Zod .min(1) already ensures this, but double check)
  if (pkg.policies.length === 0) {
    issues.push({
      code: "MECH_NO_POLICIES",
      severity: "error",
      message: "Skill package has no policies",
    });
  }

  // 3. Policy code format
  for (const policy of pkg.policies) {
    if (!POLICY_CODE_REGEX.test(policy.code)) {
      issues.push({
        code: "MECH_POLICY_CODE_FORMAT",
        severity: "error",
        message: `Invalid policy code format: ${policy.code}`,
        detail: "Expected POL-{DOMAIN}-{TYPE}-{SEQ}",
      });
    }
  }

  // 4. Trust score in 0..1
  if (pkg.trust.score < 0 || pkg.trust.score > 1) {
    issues.push({
      code: "MECH_TRUST_RANGE",
      severity: "error",
      message: `Trust score out of range: ${pkg.trust.score}`,
    });
  }

  // 5. metadata.domain exists
  if (!pkg.metadata.domain || pkg.metadata.domain.trim().length === 0) {
    issues.push({
      code: "MECH_MISSING_DOMAIN",
      severity: "error",
      message: "metadata.domain is empty",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const score = errorCount === 0 ? 1.0 : Math.max(0, 1 - errorCount * 0.2);
  const verdict = errorCount === 0 ? "pass" : "fail";

  logger.info("Mechanical eval complete", { verdict, score, issueCount: issues.length });
  return buildResult(startMs, score, verdict, issues);
}

function buildResult(
  startMs: number,
  score: number,
  verdict: "pass" | "fail",
  issues: EvalIssue[],
): EvalResult {
  return {
    stage: "mechanical",
    verdict,
    score,
    issues,
    evaluator: "mechanical-v1",
    durationMs: Date.now() - startMs,
    timestamp: new Date().toISOString(),
  };
}
