/**
 * Convert a single Policy into a markdown string for CC Skill rules.
 */

import type { Policy } from "@ai-foundry/types";

export function generatePolicyMd(policy: Policy): string {
  const lines: string[] = [];

  lines.push(`# ${policy.code}: ${policy.title}`);
  lines.push("");

  lines.push("## 조건 (IF)");
  lines.push("");
  lines.push(policy.condition);
  lines.push("");

  lines.push("## 기준 (CRITERIA)");
  lines.push("");
  lines.push(policy.criteria);
  lines.push("");

  lines.push("## 결과 (THEN)");
  lines.push("");
  lines.push(policy.outcome);
  lines.push("");

  lines.push("## 출처");
  lines.push("");
  lines.push(`- 문서: ${policy.source.documentId}`);
  if (policy.source.pageRef) {
    lines.push(`- 페이지: ${policy.source.pageRef}`);
  }
  lines.push("");

  lines.push("## 신뢰도");
  lines.push("");
  lines.push(`- Level: ${policy.trust.level}`);
  lines.push(`- Score: ${policy.trust.score}`);
  lines.push("");

  return lines.join("\n");
}
