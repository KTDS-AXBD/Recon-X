/**
 * Spec Generator — B/T/Q Spec 문서 생성 진입점
 */
import type { LlmClientEnv } from "@ai-foundry/utils";
import type { Env } from "../env.js";
import { collectSkillSpecData } from "./collector.js";
import { generateBusinessSpec } from "./generators/business.js";
import { generateTechnicalSpec } from "./generators/technical.js";
import { generateQualitySpec } from "./generators/quality.js";
import { enhanceWithLlm } from "./llm-enhancer.js";
import type { SpecDocument, SpecType, SpecMetadata } from "./types.js";

export type { SpecDocument, SpecType, SpecSection, SpecMetadata } from "./types.js";

export async function generateSpec(
  env: Env,
  skillId: string,
  type: SpecType,
  options?: { useLlm?: boolean },
): Promise<SpecDocument | null> {
  const data = await collectSkillSpecData(env, skillId);
  if (!data) return null;

  // Template 기반 섹션 생성
  let sections = type === "business"
    ? generateBusinessSpec(data)
    : type === "technical"
      ? generateTechnicalSpec(data)
      : generateQualitySpec(data);

  // LLM 보강 (optional)
  if (options?.useLlm !== false) {
    const llmEnv: LlmClientEnv = {
      LLM_ROUTER_URL: env.LLM_ROUTER_URL,
      INTERNAL_API_SECRET: env.INTERNAL_API_SECRET,
    };
    sections = await enhanceWithLlm(llmEnv, data, sections, type);
  }

  // AI-Ready 점수 (B/T/Q 각각)
  // scoreSkill은 SkillPackage를 요구 — 간이 메타데이터 구성
  const metadata: SpecMetadata = {
    domain: data.domain,
    policyCount: data.policies.length,
    aiReadyScore: { business: 0, technical: 0, quality: 0 },
  };
  if (data.subdomain) metadata.subdomain = data.subdomain;

  // 점수는 R2에서 이미 조회한 데이터로 계산 (collector가 이미 로드)
  // 간이 점수 계산
  try {
    // R2에서 로드한 SkillPackage를 재구성하는 대신, 간이 계산
    const biz = data.policies.length > 0 ? 0.5 : 0;
    const tech = (data.technicalSpec?.apis.length ?? 0) > 0 ? 0.35 : 0;
    const qual = data.trust.score > 0 ? 0.3 : 0;
    metadata.aiReadyScore = {
      business: Math.min(1, biz + (data.extraction?.processes.length ? 0.25 : 0) + (data.terms.length > 0 ? 0.25 : 0)),
      technical: Math.min(1, tech + ((data.technicalSpec?.tables.length ?? 0) > 0 ? 0.35 : 0) + (data.adapters.mcp ? 0.3 : 0)),
      quality: Math.min(1, qual + (data.policies.some((p) => p.source.excerpt) ? 0.3 : 0) + 0.4),
    };
  } catch {
    // 점수 계산 실패 시 0으로 유지
  }

  return {
    skillId,
    type,
    generatedAt: new Date().toISOString(),
    sections,
    metadata,
  };
}

export async function generateAllSpecs(
  env: Env,
  skillId: string,
  options?: { useLlm?: boolean },
): Promise<SpecDocument[] | null> {
  const types: SpecType[] = ["business", "technical", "quality"];
  const results = await Promise.all(
    types.map((t) => generateSpec(env, skillId, t, options)),
  );

  if (results.every((r) => r === null)) return null;
  return results.filter((r): r is SpecDocument => r !== null);
}
