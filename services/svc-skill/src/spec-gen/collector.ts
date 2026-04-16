/**
 * Skill Spec Data Collector — 개별 Skill의 B/T/Q Spec 생성에 필요한 데이터 수집
 *
 * 1. R2에서 SkillPackage 로드
 * 2. Service Binding으로 extraction 결과 조회
 * 3. Service Binding으로 ontology terms 조회
 */
import type { SkillPackage } from "@ai-foundry/types";
import { createLogger } from "@ai-foundry/utils";
import type { Env } from "../env.js";
import type {
  SkillSpecData,
  PolicySummary,
  TechnicalSpecData,
  ExtractionData,
  TermSummary,
} from "./types.js";

const logger = createLogger("spec-gen:collector");

// ── 헬퍼: Service Binding fetch ─────────────────

async function fetchInternal<T>(
  fetcher: Fetcher,
  path: string,
  secret: string,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetcher.fetch(`https://internal${path}`, {
    headers: {
      "X-Internal-Secret": secret,
      "Content-Type": "application/json",
      ...headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Service fetch failed: ${path} → ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── SkillPackage → PolicySummary 변환 ────────────

function toPolicySummaries(pkg: SkillPackage): PolicySummary[] {
  return pkg.policies.map((p) => {
    const source: PolicySummary["source"] = { documentId: p.source.documentId };
    if (p.source.pageRef) source.pageRef = p.source.pageRef;
    if (p.source.excerpt) source.excerpt = p.source.excerpt;
    return {
      code: p.code,
      title: p.title,
      condition: p.condition,
      criteria: p.criteria,
      outcome: p.outcome,
      tags: p.tags,
      source,
      trust: { level: p.trust.level, score: p.trust.score },
    };
  });
}

// ── SkillPackage → TechnicalSpecData 변환 ────────

function toTechnicalSpec(pkg: SkillPackage): TechnicalSpecData | null {
  const ts = pkg.technicalSpec;
  if (!ts) return null;
  return {
    apis: ts.apis ?? [],
    tables: ts.tables ?? [],
    dataFlows: ts.dataFlows ?? [],
    errors: ts.errors ?? [],
  };
}

// ── Extraction 결과 조회 ─────────────────────────

async function fetchExtraction(
  env: Env,
  sourceDocIds: string[],
): Promise<ExtractionData | null> {
  if (sourceDocIds.length === 0) return null;

  // 첫 번째 문서의 extraction 결과를 가져옴 (대부분 1:1 매핑)
  // 여러 문서면 병합
  const allProcesses: ExtractionData["processes"] = [];
  const allEntities: ExtractionData["entities"] = [];
  const allRelationships: ExtractionData["relationships"] = [];
  const allRules: ExtractionData["rules"] = [];

  const batchSize = 5;
  for (let i = 0; i < sourceDocIds.length; i += batchSize) {
    const batch = sourceDocIds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (docId) => {
        const res = await fetchInternal<{
          success: boolean;
          data: { extractions: Array<{ result: unknown }> };
        }>(
          env.SVC_EXTRACTION,
          `/extractions?documentId=${docId}`,
          env.INTERNAL_API_SECRET,
        );
        const extractions = res.data?.extractions ?? [];
        return extractions;
      }),
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const ext of r.value) {
        const result = ext.result as Record<string, unknown> | null;
        if (!result) continue;

        const processes = result["processes"] as ExtractionData["processes"] | undefined;
        const entities = result["entities"] as ExtractionData["entities"] | undefined;
        const relationships = result["relationships"] as ExtractionData["relationships"] | undefined;
        const rules = result["rules"] as ExtractionData["rules"] | undefined;

        if (processes) allProcesses.push(...processes);
        if (entities) allEntities.push(...entities);
        if (relationships) allRelationships.push(...relationships);
        if (rules) allRules.push(...rules);
      }
    }
  }

  if (allProcesses.length === 0 && allEntities.length === 0 && allRules.length === 0) {
    return null;
  }

  return {
    processes: allProcesses,
    entities: allEntities,
    relationships: allRelationships,
    rules: allRules,
  };
}

// ── Ontology terms 조회 ──────────────────────────

async function fetchTerms(
  env: Env,
  orgId: string,
  termUris: string[],
): Promise<TermSummary[]> {
  if (termUris.length === 0) return [];

  // Org 전체 terms에서 URI 매칭 (terms API에 URI 필터 미지원이므로 전체 조회 후 필터)
  const all: TermSummary[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const res = await fetchInternal<{
      success: boolean;
      data: { terms: Array<{ label: string; definition: string | null; skos_uri: string | null; term_type: string }>; total: number };
    }>(
      env.SVC_ONTOLOGY,
      `/terms?limit=${limit}&offset=${offset}`,
      env.INTERNAL_API_SECRET,
      { "X-Organization-Id": orgId },
    );
    const terms = res.data?.terms ?? [];
    for (const t of terms) {
      all.push({
        label: t.label,
        definition: t.definition,
        skosUri: t.skos_uri,
        termType: t.term_type,
      });
    }
    if (terms.length < limit || all.length >= (res.data?.total ?? 0)) break;
    offset += limit;
  }

  // URI 매칭이 가능하면 필터, 아니면 전체 반환 (용어사전이므로)
  if (termUris.length > 0 && all.some((t) => t.skosUri)) {
    const uriSet = new Set(termUris);
    const matched = all.filter((t) => t.skosUri && uriSet.has(t.skosUri));
    // URI 매칭된 것이 있으면 그것만, 없으면 전체 (fallback)
    return matched.length > 0 ? matched : all;
  }

  return all;
}

// ── exactOptionalPropertyTypes 호환 빌더 ────────

function buildAdapters(pkg: SkillPackage): SkillSpecData["adapters"] {
  const result: SkillSpecData["adapters"] = {};
  if (pkg.adapters.mcp) result.mcp = pkg.adapters.mcp;
  if (pkg.adapters.openapi) result.openapi = pkg.adapters.openapi;
  return result;
}

function buildOntologyRef(pkg: SkillPackage): SkillSpecData["ontologyRef"] {
  const result: SkillSpecData["ontologyRef"] = {
    graphId: pkg.ontologyRef.graphId,
    termUris: pkg.ontologyRef.termUris,
  };
  if (pkg.ontologyRef.skosConceptScheme) result.skosConceptScheme = pkg.ontologyRef.skosConceptScheme;
  return result;
}

// ── 메인 수집 함수 ──────────────────────────────

export async function collectSkillSpecData(
  env: Env,
  skillId: string,
): Promise<SkillSpecData | null> {
  // 1. D1에서 R2 키 조회
  const row = await env.DB_SKILL.prepare(
    "SELECT r2_key, organization_id, domain, status FROM skills WHERE skill_id = ?",
  )
    .bind(skillId)
    .first<{ r2_key: string; organization_id: string; domain: string; status: string }>();

  if (!row) {
    logger.warn("Skill not found", { skillId });
    return null;
  }

  // 2. R2에서 SkillPackage 로드
  const r2Obj = await env.R2_SKILL_PACKAGES.get(row["r2_key"]);
  if (!r2Obj) {
    logger.error("R2 object not found", { skillId, r2Key: row["r2_key"] });
    return null;
  }

  const pkg = (await r2Obj.json()) as SkillPackage;

  // 3. 병렬: extraction 결과 + ontology terms
  const [extraction, terms] = await Promise.all([
    fetchExtraction(env, pkg.provenance.sourceDocumentIds).catch((err) => {
      logger.warn("Extraction fetch failed, proceeding without", { skillId, err: String(err) });
      return null;
    }),
    fetchTerms(env, row["organization_id"], pkg.ontologyRef.termUris).catch((err) => {
      logger.warn("Terms fetch failed, proceeding without", { skillId, err: String(err) });
      return [] as TermSummary[];
    }),
  ]);

  return {
    skillId,
    organizationId: row["organization_id"],
    domain: pkg.metadata.domain,
    subdomain: pkg.metadata.subdomain,
    policies: toPolicySummaries(pkg),
    technicalSpec: toTechnicalSpec(pkg),
    adapters: buildAdapters(pkg),
    trust: { level: pkg.trust.level, score: pkg.trust.score },
    provenance: {
      sourceDocumentIds: pkg.provenance.sourceDocumentIds,
      organizationId: pkg.provenance.organizationId,
      extractedAt: pkg.provenance.extractedAt,
      pipeline: pkg.provenance.pipeline,
    },
    ontologyRef: buildOntologyRef(pkg),
    extraction,
    terms,
  };
}
