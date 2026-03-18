/**
 * Convert a SkillPackage into a SKILL.md string with CC-compatible frontmatter.
 */

import type { SkillPackage } from "@ai-foundry/types";

function escapeYaml(s: string): string {
  if (/[:#{}[\],&*?|>!%@`]/.test(s) || s.includes('"')) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

export function generateSkillMd(pkg: SkillPackage): string {
  const { metadata, policies, trust } = pkg;
  const subdomain = metadata.subdomain;
  const namePart = subdomain
    ? `${metadata.domain}-${subdomain}`
    : metadata.domain;
  const domainLabel = subdomain
    ? `${metadata.domain} / ${subdomain}`
    : metadata.domain;

  const lines: string[] = [];

  // ── Frontmatter ──────────────────────────────────────────────────────
  lines.push("---");
  lines.push(`name: ${escapeYaml(namePart)}`);
  lines.push("description: >-");
  lines.push(`  AI Foundry에서 추출한 ${metadata.domain} 도메인의 ${subdomain ?? metadata.domain} 스킬.`);
  lines.push(`  ${policies.length}개 정책 기반. Trust: ${trust.level} (${trust.score}).`);
  lines.push("user-invocable: true");
  lines.push("allowed-tools:");
  lines.push("  - Read");
  lines.push("  - Bash");
  lines.push("---");
  lines.push("");

  // ── Overview ─────────────────────────────────────────────────────────
  lines.push(`# ${domainLabel} Skill`);
  lines.push("");
  lines.push(`AI Foundry 5-Stage 파이프라인에서 추출된 **${domainLabel}** 도메인 스킬이에요.`);
  lines.push(`${policies.length}개의 비즈니스 정책(condition-criteria-outcome)을 포함하고 있어요.`);
  lines.push("");
  lines.push(`- **버전**: ${metadata.version}`);
  lines.push(`- **언어**: ${metadata.language}`);
  lines.push(`- **신뢰도**: ${trust.level} (${trust.score})`);
  lines.push(`- **출처 조직**: ${pkg.provenance.organizationId}`);
  lines.push("");

  // ── Policy table ─────────────────────────────────────────────────────
  lines.push("## 정책 목록");
  lines.push("");
  lines.push("| 코드 | 제목 | 신뢰도 |");
  lines.push("|------|------|--------|");
  for (const p of policies) {
    lines.push(`| ${p.code} | ${p.title} | ${p.trust.level} (${p.trust.score}) |`);
  }
  lines.push("");

  // ── Usage ────────────────────────────────────────────────────────────
  lines.push("## 사용법");
  lines.push("");
  lines.push("이 스킬의 `rules/policies/` 디렉토리에 각 정책의 상세 내용이 마크다운 파일로 저장되어 있어요.");
  lines.push("Claude Code가 자동으로 로딩하여 도메인 지식 기반 응답을 생성해요.");
  lines.push("");
  lines.push("```");
  lines.push("# 정책 기반 질의 예시");
  lines.push(`이 ${domainLabel} 관련 질문에 정책 규칙을 참조해서 답변해줘.`);
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
