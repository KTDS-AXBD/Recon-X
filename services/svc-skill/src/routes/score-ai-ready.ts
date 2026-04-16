/**
 * POST /admin/score-ai-ready — AIF-REQ-034 Deep Dive PoC
 *
 * Iterates D1 skills catalog, loads each .skill.json from R2, scores against
 * AI-Ready 6 criteria (rule-based, LLM-free), and returns an aggregate report.
 */

import { type AiReadyScore, type SkillPackage, AI_READY_CRITERIA } from "@ai-foundry/types";
import { badRequest, createLogger, errFromUnknown, ok } from "@ai-foundry/utils";
import { z } from "zod";
import { scoreSkill } from "../scoring/ai-ready.js";
import type { Env } from "../env.js";

const logger = createLogger("svc-skill:score-ai-ready");

const ScoreRequestSchema = z.object({
  organization_id: z.string().optional(),
  limit: z.number().int().positive().max(2000).optional(),
  sample_size: z.number().int().min(0).max(50).optional(),
});

interface CatalogRow {
  skill_id: string;
  organization_id: string;
  domain: string;
  r2_key: string;
}

interface CriterionStat {
  passRate: number;
  avgScore: number;
  median: number;
  p25: number;
  p75: number;
}

async function scoreOne(env: Env, row: CatalogRow): Promise<AiReadyScore | null> {
  try {
    const obj = await env.R2_SKILL_PACKAGES.get(row.r2_key);
    if (!obj) {
      logger.warn("R2 miss", { skillId: row.skill_id, r2Key: row.r2_key });
      return null;
    }
    const raw = await obj.json<SkillPackage>();
    return scoreSkill(raw);
  } catch (e) {
    logger.warn("Score failed", { skillId: row.skill_id, error: String(e) });
    return null;
  }
}

async function scoreInBatches(env: Env, rows: CatalogRow[], concurrency: number): Promise<AiReadyScore[]> {
  const results: AiReadyScore[] = [];
  for (let i = 0; i < rows.length; i += concurrency) {
    const batch = rows.slice(i, i + concurrency);
    const settled = await Promise.all(batch.map((r) => scoreOne(env, r)));
    for (const s of settled) if (s) results.push(s);
  }
  return results;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const v0 = sorted[base] ?? 0;
  const v1 = sorted[base + 1] ?? v0;
  return v0 + rest * (v1 - v0);
}

function aggregate(scores: AiReadyScore[]) {
  const n = scores.length;
  if (n === 0) {
    return { total: 0, passed: 0, failed: 0, passRate: 0, byCriterion: {}, overall: null };
  }
  const overallValues = scores.map((s) => s.overall);
  const passed = scores.filter((s) => s.passAiReady).length;

  const byCriterion: Record<string, CriterionStat> = {};
  for (const name of AI_READY_CRITERIA) {
    const values = scores.map((s) => s.criteria[name].score);
    const passCount = scores.filter((s) => s.criteria[name].pass).length;
    byCriterion[name] = {
      passRate: Math.round((passCount / n) * 1000) / 1000,
      avgScore: Math.round((values.reduce((a, b) => a + b, 0) / n) * 1000) / 1000,
      median: Math.round(quantile(values, 0.5) * 1000) / 1000,
      p25: Math.round(quantile(values, 0.25) * 1000) / 1000,
      p75: Math.round(quantile(values, 0.75) * 1000) / 1000,
    };
  }

  // BTQ breakdown from completeness signals
  const btqValues = scores.map((s) => {
    const c = s.criteria.completeness as typeof s.criteria.completeness & {
      btq?: { business: number; technical: number; quality: number };
    };
    return c.btq ?? { business: 0, technical: 0, quality: 0 };
  });
  const btqAvg = {
    business:
      Math.round((btqValues.reduce((a, b) => a + b.business, 0) / n) * 1000) / 1000,
    technical:
      Math.round((btqValues.reduce((a, b) => a + b.technical, 0) / n) * 1000) / 1000,
    quality:
      Math.round((btqValues.reduce((a, b) => a + b.quality, 0) / n) * 1000) / 1000,
  };

  // Failure reason ranking
  const failureCount = new Map<string, number>();
  for (const s of scores) {
    for (const f of s.failedCriteria) {
      failureCount.set(f, (failureCount.get(f) ?? 0) + 1);
    }
  }
  const topFailures = [...failureCount.entries()]
    .map(([name, count]) => ({ name, count, rate: Math.round((count / n) * 1000) / 1000 }))
    .sort((a, b) => b.count - a.count);

  return {
    total: n,
    passed,
    failed: n - passed,
    passRate: Math.round((passed / n) * 1000) / 1000,
    byCriterion,
    overall: {
      avg: Math.round((overallValues.reduce((a, b) => a + b, 0) / n) * 1000) / 1000,
      median: Math.round(quantile(overallValues, 0.5) * 1000) / 1000,
      p25: Math.round(quantile(overallValues, 0.25) * 1000) / 1000,
      p75: Math.round(quantile(overallValues, 0.75) * 1000) / 1000,
      min: Math.round(Math.min(...overallValues) * 1000) / 1000,
      max: Math.round(Math.max(...overallValues) * 1000) / 1000,
    },
    btqAvg,
    topFailures,
  };
}

export async function handleScoreAiReady(request: Request, env: Env): Promise<Response> {
  let params: z.infer<typeof ScoreRequestSchema>;
  try {
    const raw = (await request.json()) as unknown;
    const parsed = ScoreRequestSchema.safeParse(raw ?? {});
    if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());
    params = parsed.data;
  } catch {
    params = {};
  }

  const limit = params.limit ?? 2000;
  const sampleSize = params.sample_size ?? 10;
  const startedAt = Date.now();

  try {
    const sql = params.organization_id
      ? "SELECT skill_id, organization_id, domain, r2_key FROM skills WHERE organization_id = ? LIMIT ?"
      : "SELECT skill_id, organization_id, domain, r2_key FROM skills LIMIT ?";
    const bindings: unknown[] = params.organization_id
      ? [params.organization_id, limit]
      : [limit];

    const res = await env.DB_SKILL.prepare(sql)
      .bind(...bindings)
      .all<CatalogRow>();
    const rows = res.results ?? [];
    logger.info("Scoring started", { rowCount: rows.length, organizationId: params.organization_id });

    const scores = await scoreInBatches(env, rows, 10);
    const agg = aggregate(scores);

    // Top/bottom samples
    const sorted = [...scores].sort((a, b) => b.overall - a.overall);
    const topSamples = sorted.slice(0, sampleSize);
    const bottomSamples = sorted.slice(-sampleSize).reverse();

    const elapsedMs = Date.now() - startedAt;
    return ok({
      params,
      elapsedMs,
      rowsQueried: rows.length,
      scored: scores.length,
      skipped: rows.length - scores.length,
      aggregate: agg,
      topSamples,
      bottomSamples,
      allScores: scores,
    });
  } catch (e) {
    logger.error("Score failed", { error: String(e) });
    return errFromUnknown(e);
  }
}
