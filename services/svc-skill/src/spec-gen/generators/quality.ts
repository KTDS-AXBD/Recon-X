/**
 * Quality Spec Generator — trust + quality signals → 품질 명세서
 *
 * 섹션: 품질 개요, 성능 요구, 보안 요구, 추적성, 검증 현황
 */
import type { SkillSpecData, SpecSection } from "../types.js";

// ── 키워드 추출 ─────────────────────────────────

const PERFORMANCE_PATTERNS = [
  /(\d+)\s*(TPS|RPS|QPS|건\/초)/gi,
  /(\d+)\s*(ms|초|분|밀리초)\s*(이내|이하)/gi,
  /(응답시간|latency|처리시간|지연)[^.]*?(\d+)/gi,
  /(SLA|가용성|무중단|uptime)[^.]*?(\d+)/gi,
  /(\d+)\s*(%|퍼센트)[^.]*?(이상|이하|이내)/gi,
];

const SECURITY_KEYWORDS = [
  "암호화", "마스킹", "감사", "로그", "접근제어", "인증",
  "권한", "보안", "PII", "개인정보", "토큰", "세션",
  "RBAC", "SSO", "2FA", "CSRF", "XSS",
];

function extractPerformanceRequirements(policies: SkillSpecData["policies"]): string[] {
  const results: string[] = [];
  const allText = policies.map((p) => `${p.condition} ${p.criteria} ${p.outcome}`).join(" ");

  for (const pattern of PERFORMANCE_PATTERNS) {
    const matches = allText.matchAll(pattern);
    for (const m of matches) {
      results.push(m[0].trim());
    }
  }

  return [...new Set(results)];
}

function extractSecurityRequirements(policies: SkillSpecData["policies"]): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  for (const p of policies) {
    const text = `${p.condition} ${p.criteria} ${p.outcome}`;
    for (const kw of SECURITY_KEYWORDS) {
      if (text.includes(kw) && !seen.has(kw)) {
        seen.add(kw);
        // 키워드가 포함된 정책의 관련 문맥 추출
        const idx = text.indexOf(kw);
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + kw.length + 50);
        const context = text.slice(start, end).trim();
        results.push(`**${kw}** — ${context}... (${p.code})`);
      }
    }
  }

  return results;
}

// ── 섹션 생성기 ─────────────────────────────────

function genOverview(data: SkillSpecData): SpecSection {
  const { trust, policies } = data;
  const trustLabel = trust.level === "validated" ? "검증됨" : trust.level === "reviewed" ? "검토됨" : "미검토";

  const reviewedCount = policies.filter((p) => p.trust.level !== "unreviewed").length;
  const validatedCount = policies.filter((p) => p.trust.level === "validated").length;
  const excerptCount = policies.filter((p) => p.source.excerpt && p.source.excerpt.length > 0).length;
  const avgTrust = policies.reduce((sum, p) => sum + p.trust.score, 0) / Math.max(policies.length, 1);

  const lines = [
    `# Quality Spec — ${data.domain}${data.subdomain ? ` > ${data.subdomain}` : ""}`,
    "",
    "| 항목 | 값 |",
    "|------|-----|",
    `| 전체 신뢰 수준 | ${trustLabel} |`,
    `| 전체 신뢰 점수 | ${(trust.score * 100).toFixed(1)}% |`,
    `| 정책 평균 신뢰도 | ${(avgTrust * 100).toFixed(1)}% |`,
    `| 검토된 정책 | ${reviewedCount}/${policies.length} (${((reviewedCount / Math.max(policies.length, 1)) * 100).toFixed(0)}%) |`,
    `| 검증된 정책 | ${validatedCount}/${policies.length} |`,
    `| 원문 보유율 | ${excerptCount}/${policies.length} (${((excerptCount / Math.max(policies.length, 1)) * 100).toFixed(0)}%) |`,
    "",
  ];

  return { id: "qual-overview", title: "품질 개요", content: lines.join("\n"), order: 1 };
}

function genPerformanceReq(data: SkillSpecData): SpecSection {
  const reqs = extractPerformanceRequirements(data.policies);

  const parts: string[] = ["## 성능 요구사항", ""];

  if (reqs.length === 0) {
    parts.push("> 정책 텍스트에서 성능 관련 수치가 추출되지 않았습니다.");
    parts.push("> 성능 요구사항(SLA, 응답시간, TPS 등)이 포함된 문서를 추가 투입하면 자동 추출됩니다.");
  } else {
    parts.push("정책 텍스트에서 추출된 성능 관련 수치:");
    parts.push("");
    for (const r of reqs) {
      parts.push(`- ${r}`);
    }
  }
  parts.push("");

  return { id: "qual-performance", title: "성능 요구", content: parts.join("\n"), order: 2 };
}

function genSecurityReq(data: SkillSpecData): SpecSection {
  const reqs = extractSecurityRequirements(data.policies);

  const parts: string[] = ["## 보안 요구사항", ""];

  if (reqs.length === 0) {
    parts.push("> 정책 텍스트에서 보안 관련 키워드가 추출되지 않았습니다.");
  } else {
    parts.push("정책 텍스트에서 추출된 보안 관련 항목:");
    parts.push("");
    for (const r of reqs) {
      parts.push(`- ${r}`);
    }
  }
  parts.push("");

  return { id: "qual-security", title: "보안 요구", content: parts.join("\n"), order: 3 };
}

function genTraceability(data: SkillSpecData): SpecSection {
  const { policies, provenance } = data;

  const parts: string[] = ["## 추적성 (Traceability)", ""];

  // 원천 문서 → 정책 매핑
  const docPolicyMap = new Map<string, string[]>();
  for (const p of policies) {
    const docId = p.source.documentId;
    const existing = docPolicyMap.get(docId);
    if (existing) {
      existing.push(p.code);
    } else {
      docPolicyMap.set(docId, [p.code]);
    }
  }

  parts.push("### 원천 문서 → 정책 매핑");
  parts.push("");
  parts.push("| 문서 ID | 정책 수 | 정책 코드 |");
  parts.push("|---------|---------|-----------|");

  for (const [docId, codes] of docPolicyMap) {
    const shortDoc = docId.slice(0, 12);
    const codeList = codes.length <= 5 ? codes.join(", ") : `${codes.slice(0, 5).join(", ")} 외 ${codes.length - 5}건`;
    parts.push(`| ${shortDoc}… | ${codes.length} | ${codeList} |`);
  }
  parts.push("");

  // 파이프라인 투명성
  parts.push("### 파이프라인 추적");
  parts.push("");
  parts.push(`- **단계**: ${provenance.pipeline.stages.join(" → ")}`);
  parts.push(`- **추출일시**: ${provenance.extractedAt}`);
  parts.push(`- **원천 문서 수**: ${provenance.sourceDocumentIds.length}건`);

  const models = provenance.pipeline.models;
  if (Object.keys(models).length > 0) {
    parts.push("- **사용 모델**:");
    for (const [stage, model] of Object.entries(models)) {
      parts.push(`  - ${stage}: ${model}`);
    }
  }
  parts.push("");

  return { id: "qual-traceability", title: "추적성", content: parts.join("\n"), order: 4 };
}

function genVerificationStatus(data: SkillSpecData): SpecSection {
  const { policies } = data;

  const parts: string[] = ["## 검증 현황", ""];
  parts.push("| 코드 | 제목 | 신뢰 수준 | 점수 | 원문 |");
  parts.push("|------|------|-----------|------|------|");

  for (const p of policies) {
    const level = p.trust.level === "validated" ? "✅ 검증"
      : p.trust.level === "reviewed" ? "🔍 검토"
      : "⬜ 미검토";
    const hasExcerpt = p.source.excerpt ? "✅" : "❌";
    parts.push(
      `| ${p.code} | ${p.title.slice(0, 40)} | ${level} | ${(p.trust.score * 100).toFixed(0)}% | ${hasExcerpt} |`,
    );
  }
  parts.push("");

  return { id: "qual-verification", title: "검증 현황", content: parts.join("\n"), order: 5 };
}

// ── 메인 ────────────────────────────────────────

export function generateQualitySpec(data: SkillSpecData): SpecSection[] {
  return [
    genOverview(data),
    genPerformanceReq(data),
    genSecurityReq(data),
    genTraceability(data),
    genVerificationStatus(data),
  ];
}
