/**
 * LLM Enhancer — OpenRouter 직접 호출로 요약 문단 + Gap 코멘터리 생성
 *
 * Template 생성 후 optional로 호출. 실패해도 문서 생성에 영향 없음.
 * svc-llm-router를 거치지 않고 OpenRouter API를 직접 호출.
 */
import { callOpenRouter, type OpenRouterEnv } from "@ai-foundry/utils";
import type { SkillSpecData, SpecSection, SpecType } from "./types.js";

const SYSTEM_PROMPT = `당신은 SI 산출물 분석 전문가입니다. 역공학으로 추출된 데이터를 기반으로 간결하고 정확한 한국어 요약과 분석을 제공합니다.
- 사실에 근거한 내용만 작성
- 추측이나 가정 금지
- 3~5문장 이내로 간결하게
- 마크다운 형식`;

function buildSummaryPrompt(data: SkillSpecData, type: SpecType): string {
  const base = `도메인: ${data.domain}, 정책 ${data.policies.length}건, 신뢰도 ${(data.trust.score * 100).toFixed(0)}%`;

  if (type === "business") {
    const ruleTypes = [...new Set(data.policies.map((p) => p.code.split("-").slice(1, -1).join("-")))];
    return `다음 역공학 추출 결과의 비즈니스 측면을 3~5문장으로 요약하세요.
${base}
정책 유형: ${ruleTypes.join(", ")}
프로세스: ${data.extraction?.processes.length ?? 0}건
엔티티: ${data.extraction?.entities.length ?? 0}건
용어: ${data.terms.length}건`;
  }

  if (type === "technical") {
    const ts = data.technicalSpec;
    return `다음 역공학 추출 결과의 기술 측면을 3~5문장으로 요약하세요.
${base}
API: ${ts?.apis.length ?? 0}건, 테이블: ${ts?.tables.length ?? 0}건
데이터흐름: ${ts?.dataFlows.length ?? 0}건, 에러: ${ts?.errors.length ?? 0}건
MCP 어댑터: ${data.adapters.mcp ? "있음" : "없음"}, OpenAPI: ${data.adapters.openapi ? "있음" : "없음"}`;
  }

  // quality
  const reviewedPct = (data.policies.filter((p) => p.trust.level !== "unreviewed").length / Math.max(data.policies.length, 1) * 100).toFixed(0);
  const excerptPct = (data.policies.filter((p) => p.source.excerpt).length / Math.max(data.policies.length, 1) * 100).toFixed(0);
  return `다음 역공학 추출 결과의 품질 측면을 3~5문장으로 요약하세요.
${base}
검토율: ${reviewedPct}%, 원문 보유율: ${excerptPct}%
파이프라인: ${data.provenance.pipeline.stages.join(" → ")}`;
}

function buildGapPrompt(data: SkillSpecData, type: SpecType): string {
  const signals: string[] = [];

  if (type === "business") {
    if (data.policies.length < 3) signals.push("정책 수가 부족 (3건 미만)");
    if (!data.extraction?.processes.length) signals.push("프로세스 추출 데이터 없음");
    if (!data.extraction?.entities.length) signals.push("엔티티 추출 데이터 없음");
    if (data.terms.length === 0) signals.push("온톨로지 용어 연결 없음");
  } else if (type === "technical") {
    if (!data.technicalSpec?.apis.length) signals.push("API 엔드포인트 추출 없음");
    if (!data.technicalSpec?.tables.length) signals.push("데이터 테이블 추출 없음");
    if (!data.adapters.mcp) signals.push("MCP 어댑터 미생성");
    if (!data.adapters.openapi) signals.push("OpenAPI 어댑터 미생성");
  } else {
    const lowTrust = data.policies.filter((p) => p.trust.score < 0.5);
    if (lowTrust.length > 0) signals.push(`${lowTrust.length}건의 정책이 신뢰도 50% 미만`);
    const noExcerpt = data.policies.filter((p) => !p.source.excerpt);
    if (noExcerpt.length > 0) signals.push(`${noExcerpt.length}건의 정책에 원문 누락`);
  }

  if (signals.length === 0) {
    return `도메인 "${data.domain}"의 ${type} Spec에서 발견된 Gap이 없습니다. "현재 ${type} 측면의 완성도가 양호합니다."라고 1문장으로 작성하세요.`;
  }

  return `다음 Gap을 기반으로 개선 권고를 3~5문장으로 작성하세요.
도메인: ${data.domain}
Spec 유형: ${type}
발견된 Gap:
${signals.map((s) => `- ${s}`).join("\n")}

권고는 구체적이고 실행 가능해야 합니다.`;
}

// ── 메인 ────────────────────────────────────────

export async function enhanceWithLlm(
  env: OpenRouterEnv,
  data: SkillSpecData,
  sections: SpecSection[],
  type: SpecType,
): Promise<SpecSection[]> {
  try {
    const [summary, gap] = await Promise.allSettled([
      callOpenRouter(env, buildSummaryPrompt(data, type), {
        system: SYSTEM_PROMPT,
        maxTokens: 512,
        temperature: 0.3,
      }),
      callOpenRouter(env, buildGapPrompt(data, type), {
        system: SYSTEM_PROMPT,
        maxTokens: 512,
        temperature: 0.3,
      }),
    ]);

    const enhanced = [...sections];

    // 요약을 overview 섹션 뒤에 삽입
    if (summary.status === "fulfilled" && summary.value) {
      enhanced.splice(1, 0, {
        id: `${type.slice(0, 4)}-summary`,
        title: "AI 요약",
        content: `## AI 요약\n\n${summary.value}`,
        order: 1.5,
      });
    }

    // Gap 코멘터리를 마지막에 추가
    if (gap.status === "fulfilled" && gap.value) {
      enhanced.push({
        id: `${type.slice(0, 4)}-gap`,
        title: "Gap 분석 & 권고",
        content: `## Gap 분석 & 권고\n\n${gap.value}`,
        order: 99,
      });
    }

    return enhanced;
  } catch {
    // LLM 실패 시 원본 섹션 그대로 반환
    return sections;
  }
}
