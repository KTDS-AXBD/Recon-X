/**
 * Build a ZIP archive containing a CC Skill directory structure.
 *
 * Structure:
 *   .claude/skills/{skill-name}/SKILL.md
 *   .claude/skills/{skill-name}/rules/domain-overview.md
 *   .claude/skills/{skill-name}/rules/policies/{pol-code}.md
 */

import { strToU8, zipSync } from "fflate";
import type { SkillPackage } from "@ai-foundry/types";

export function buildCcSkillZip(
  pkg: SkillPackage,
  skillMd: string,
  policyMds: Map<string, string>,
): Uint8Array {
  const { metadata } = pkg;
  const subdomain = metadata.subdomain;
  const skillName = subdomain
    ? `${metadata.domain}-${subdomain}`
    : metadata.domain;
  const base = `.claude/skills/${skillName}`;

  const files: Record<string, Uint8Array> = {};

  // SKILL.md
  files[`${base}/SKILL.md`] = strToU8(skillMd);

  // Domain overview
  const domainLabel = subdomain
    ? `${metadata.domain} / ${subdomain}`
    : metadata.domain;
  const overview = [
    `# ${domainLabel} 도메인 개요`,
    "",
    `이 스킬은 AI Foundry의 5-Stage 역공학 파이프라인에서 추출된 ${domainLabel} 도메인 지식이에요.`,
    "",
    `- **정책 수**: ${pkg.policies.length}`,
    `- **신뢰도**: ${pkg.trust.level} (${pkg.trust.score})`,
    `- **추출 시점**: ${pkg.provenance.extractedAt}`,
    `- **출처 문서**: ${pkg.provenance.sourceDocumentIds.join(", ")}`,
    "",
  ].join("\n");
  files[`${base}/rules/domain-overview.md`] = strToU8(overview);

  // Individual policy files
  for (const [code, md] of policyMds) {
    const filename = code.toLowerCase();
    files[`${base}/rules/policies/${filename}.md`] = strToU8(md);
  }

  return zipSync(files, { level: 6 });
}
