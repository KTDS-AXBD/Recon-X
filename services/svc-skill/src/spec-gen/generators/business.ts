/**
 * Business Spec Generator — policies + extraction + ontology → 업무 명세서
 *
 * 섹션: 개요, 업무규칙, 프로세스맵, 엔티티정의, 정책체계, 용어사전, Gap
 */
import type { SkillSpecData, SpecSection } from "../types.js";

// ── 정책 그룹핑 ─────────────────────────────────

interface PolicyGroup {
  domain: string;
  type: string;
  policies: SkillSpecData["policies"];
}

function parsePolicyCode(code: string): { domain: string; type: string } {
  const parts = code.split("-");
  return {
    domain: parts[1] ?? "UNKNOWN",
    type: parts.slice(2, -1).join("-") || "GENERAL",
  };
}

function groupPolicies(policies: SkillSpecData["policies"]): PolicyGroup[] {
  const map = new Map<string, PolicyGroup>();

  for (const p of policies) {
    const { domain, type } = parsePolicyCode(p.code);
    const key = `${domain}::${type}`;
    const existing = map.get(key);
    if (existing) {
      existing.policies.push(p);
    } else {
      map.set(key, { domain, type, policies: [p] });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.domain.localeCompare(b.domain) || a.type.localeCompare(b.type),
  );
}

// ── 섹션 생성기 ─────────────────────────────────

function genOverview(data: SkillSpecData): SpecSection {
  const { policies, domain, subdomain, trust } = data;
  const trustLabel = trust.level === "validated" ? "검증됨" : trust.level === "reviewed" ? "검토됨" : "미검토";
  const groups = groupPolicies(policies);
  const typeList = groups.map((g) => g.type).join(", ");

  const lines = [
    `# Business Spec — ${domain}${subdomain ? ` > ${subdomain}` : ""}`,
    "",
    `| 항목 | 값 |`,
    `|------|-----|`,
    `| 도메인 | ${domain} |`,
    subdomain ? `| 서브도메인 | ${subdomain} |` : null,
    `| 정책 수 | ${policies.length}건 |`,
    `| 정책 유형 | ${typeList} |`,
    `| 신뢰 수준 | ${trustLabel} (${(trust.score * 100).toFixed(1)}%) |`,
    `| 원천 문서 | ${data.provenance.sourceDocumentIds.length}건 |`,
  ].filter(Boolean).join("\n");

  return { id: "biz-overview", title: "개요", content: lines, order: 1 };
}

function genBusinessRules(data: SkillSpecData): SpecSection {
  const groups = groupPolicies(data.policies);

  const parts: string[] = ["## 업무 규칙 (Business Rules)", ""];

  for (const group of groups) {
    parts.push(`### ${group.domain} — ${group.type}`);
    parts.push("");
    parts.push("| 코드 | 제목 | 조건 (IF) | 기준 (CRITERIA) | 결과 (THEN) |");
    parts.push("|------|------|-----------|-----------------|-------------|");

    for (const p of group.policies) {
      const cond = p.condition.replace(/\|/g, "\\|").slice(0, 80);
      const crit = p.criteria.replace(/\|/g, "\\|").slice(0, 80);
      const out = p.outcome.replace(/\|/g, "\\|").slice(0, 80);
      parts.push(`| ${p.code} | ${p.title} | ${cond} | ${crit} | ${out} |`);
    }
    parts.push("");
  }

  return { id: "biz-rules", title: "업무 규칙", content: parts.join("\n"), order: 2 };
}

function genProcessMap(data: SkillSpecData): SpecSection {
  const processes = data.extraction?.processes ?? [];

  if (processes.length === 0) {
    return {
      id: "biz-process",
      title: "프로세스 맵",
      content: "## 프로세스 맵\n\n> 추출된 프로세스 데이터가 없습니다.",
      order: 3,
    };
  }

  const parts: string[] = ["## 프로세스 맵", ""];

  for (const proc of processes) {
    parts.push(`### ${proc.name}`);
    parts.push("");
    if (proc.description) parts.push(proc.description);
    parts.push("");
    if (proc.steps.length > 0) {
      parts.push("**단계:**");
      for (let i = 0; i < proc.steps.length; i++) {
        parts.push(`${i + 1}. ${proc.steps[i]}`);
      }
      parts.push("");
    }
  }

  // 관계 매트릭스
  const rels = data.extraction?.relationships ?? [];
  if (rels.length > 0) {
    parts.push("### 관계 매트릭스");
    parts.push("");
    parts.push("| 시작 | 관계 | 대상 |");
    parts.push("|------|------|------|");
    for (const r of rels) {
      parts.push(`| ${r.from} | ${r.type} | ${r.to} |`);
    }
    parts.push("");
  }

  return { id: "biz-process", title: "프로세스 맵", content: parts.join("\n"), order: 3 };
}

function genEntityDef(data: SkillSpecData): SpecSection {
  const entities = data.extraction?.entities ?? [];

  if (entities.length === 0) {
    return {
      id: "biz-entity",
      title: "엔티티 정의",
      content: "## 엔티티 정의\n\n> 추출된 엔티티 데이터가 없습니다.",
      order: 4,
    };
  }

  const parts: string[] = ["## 엔티티 정의", ""];
  parts.push("| 엔티티 | 유형 | 속성 |");
  parts.push("|--------|------|------|");

  for (const e of entities) {
    const attrs = e.attributes.length > 0 ? e.attributes.join(", ") : "—";
    parts.push(`| ${e.name} | ${e.type} | ${attrs} |`);
  }
  parts.push("");

  return { id: "biz-entity", title: "엔티티 정의", content: parts.join("\n"), order: 4 };
}

function genPolicyRegistry(data: SkillSpecData): SpecSection {
  const groups = groupPolicies(data.policies);

  const parts: string[] = ["## 정책 체계 (Policy Registry)", ""];
  parts.push(`총 ${data.policies.length}건의 정책이 ${groups.length}개 유형으로 분류됨.`);
  parts.push("");
  parts.push("| 유형 | 건수 | 코드 범위 | 평균 신뢰도 |");
  parts.push("|------|------|-----------|------------|");

  for (const g of groups) {
    const codes = g.policies.map((p) => p.code).sort();
    const range = codes.length === 1 ? codes[0] : `${codes[0]} ~ ${codes[codes.length - 1]}`;
    const avgTrust = g.policies.reduce((sum, p) => sum + p.trust.score, 0) / g.policies.length;
    parts.push(`| ${g.domain}-${g.type} | ${g.policies.length} | ${range ?? ""} | ${(avgTrust * 100).toFixed(1)}% |`);
  }
  parts.push("");

  return { id: "biz-policy-registry", title: "정책 체계", content: parts.join("\n"), order: 5 };
}

function genGlossary(data: SkillSpecData): SpecSection {
  const terms = data.terms;

  if (terms.length === 0) {
    return {
      id: "biz-glossary",
      title: "용어사전",
      content: "## 용어사전 (Glossary)\n\n> 연결된 온톨로지 용어가 없습니다.",
      order: 6,
    };
  }

  const parts: string[] = ["## 용어사전 (Glossary)", ""];
  parts.push(`총 ${terms.length}건의 도메인 용어.`);
  parts.push("");
  parts.push("| 용어 | 정의 | 유형 | SKOS URI |");
  parts.push("|------|------|------|----------|");

  // 최대 50개까지 (너무 많으면 문서가 비대해짐)
  const display = terms.slice(0, 50);
  for (const t of display) {
    const def = t.definition ? t.definition.replace(/\|/g, "\\|").slice(0, 100) : "—";
    parts.push(`| ${t.label} | ${def} | ${t.termType} | ${t.skosUri ?? "—"} |`);
  }

  if (terms.length > 50) {
    parts.push("");
    parts.push(`> 외 ${terms.length - 50}건 (전체 목록은 온톨로지 서비스에서 조회)`);
  }
  parts.push("");

  return { id: "biz-glossary", title: "용어사전", content: parts.join("\n"), order: 6 };
}

// ── 메인 ────────────────────────────────────────

export function generateBusinessSpec(data: SkillSpecData): SpecSection[] {
  return [
    genOverview(data),
    genBusinessRules(data),
    genProcessMap(data),
    genEntityDef(data),
    genPolicyRegistry(data),
    genGlossary(data),
  ];
}
