/**
 * single-eval-loop.ts — F416 우회 경로 (Sprint 247)
 *
 * batch endpoint Queue burst LLM systemic fail(TD-56 fix 후에도 production 재현)
 * 회피용. single eval은 정상 동작하므로 35건 sequential 호출.
 *
 * Usage:
 *   pnpm tsx scripts/ai-ready/single-eval-loop.ts \
 *     --org LPON --model haiku --concurrency 2
 *
 * Required env: SVC_SKILL_URL, INTERNAL_API_SECRET
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";

function arg(flag: string, def: string): string {
  const args = process.argv.slice(2);
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] !== undefined ? (args[i + 1] as string) : def;
}

interface EvalCriterion {
  criterion: string;
  score: number;
  rationale: string;
  passed: boolean;
  passThreshold: number;
}
interface EvalResult {
  skillId: string;
  model: string;
  criteria: EvalCriterion[];
  totalScore: number;
  passCount: number;
  overallPassed: boolean;
  evaluatedAt: string;
  costUsd: number;
}

async function evalOne(base: string, secret: string, org: string, skillId: string, model: string): Promise<{ ok: true; data: EvalResult } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${base}/skills/${skillId}/ai-ready/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
        "X-Organization-Id": org,
      },
      body: JSON.stringify({ force: true, model }),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
    }
    const json = (await res.json()) as { success: boolean; data?: EvalResult; error?: { message: string } };
    if (!json.success || !json.data) {
      return { ok: false, error: json.error?.message ?? "no data" };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function main() {
  const org = arg("--org", "LPON");
  const model = arg("--model", "haiku");
  const concurrency = parseInt(arg("--concurrency", "2"), 10);
  const idsFile = arg("--ids", "/tmp/lpon-35-ids.txt");

  const base = process.env["SVC_SKILL_URL"] ?? "https://svc-skill.ktds-axbd.workers.dev";
  const secret = process.env["INTERNAL_API_SECRET"];
  if (!secret) throw new Error("INTERNAL_API_SECRET required");

  const ids = (await readFile(idsFile, "utf-8")).trim().split("\n").filter(Boolean);
  console.log(`\n=== AI-Ready single eval loop (F416 우회) ===`);
  console.log(`  org=${org}  model=${model}  concurrency=${concurrency}  total=${ids.length}\n`);

  const results: Array<{ skillId: string; result: EvalResult | null; error: string | null; durationMs: number }> = [];
  const startedAt = Date.now();

  const queue = [...ids];
  let inFlight = 0;
  let done = 0;

  await new Promise<void>((resolveAll) => {
    function dispatch() {
      while (inFlight < concurrency && queue.length > 0) {
        const id = queue.shift()!;
        inFlight++;
        const t0 = Date.now();
        evalOne(base, secret, org, id, model).then((r) => {
          inFlight--;
          done++;
          const dur = Date.now() - t0;
          if (r.ok) {
            results.push({ skillId: id, result: r.data, error: null, durationMs: dur });
            console.log(`[${done}/${ids.length}] ✅ ${id.slice(0, 8)} score=${r.data.totalScore.toFixed(3)} pass=${r.data.passCount}/6 cost=$${r.data.costUsd.toFixed(4)} ${(dur / 1000).toFixed(1)}s`);
          } else {
            results.push({ skillId: id, result: null, error: r.error, durationMs: dur });
            console.log(`[${done}/${ids.length}] ❌ ${id.slice(0, 8)} ${r.error.slice(0, 80)} ${(dur / 1000).toFixed(1)}s`);
          }
          if (queue.length === 0 && inFlight === 0) resolveAll();
          else dispatch();
        });
      }
    }
    dispatch();
  });

  const totalDur = (Date.now() - startedAt) / 1000;
  const ok = results.filter((r) => r.result !== null);
  const failed = results.filter((r) => r.result === null);
  const totalCost = ok.reduce((s, r) => s + (r.result?.costUsd ?? 0), 0);
  const avgScore = ok.length > 0 ? ok.reduce((s, r) => s + (r.result?.totalScore ?? 0), 0) / ok.length : 0;
  const passCount = ok.filter((r) => r.result!.overallPassed).length;

  // Per-criterion stats
  const criteriaPass: Record<string, { passed: number; total: number; sumScore: number }> = {};
  for (const r of ok) {
    for (const c of r.result!.criteria) {
      const k = c.criterion;
      if (!criteriaPass[k]) criteriaPass[k] = { passed: 0, total: 0, sumScore: 0 };
      criteriaPass[k].total++;
      criteriaPass[k].sumScore += c.score;
      if (c.passed) criteriaPass[k].passed++;
    }
  }

  console.log(`\n=== 결과 ===`);
  console.log(`  성공/실패: ${ok.length}/${ids.length} (실패 ${failed.length})`);
  console.log(`  총 비용: $${totalCost.toFixed(3)}  소요: ${totalDur.toFixed(0)}s`);
  console.log(`  평균 점수: ${avgScore.toFixed(3)}  전체 PASS: ${passCount}/${ok.length}`);
  console.log(`\n  기준별 PASS율:`);
  for (const [k, v] of Object.entries(criteriaPass)) {
    console.log(`    ${k}: ${v.passed}/${v.total} (${((v.passed / v.total) * 100).toFixed(1)}%) avg=${(v.sumScore / v.total).toFixed(3)}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const reportDir = resolve(process.cwd(), "reports");
  if (!existsSync(reportDir)) await mkdir(reportDir, { recursive: true });
  const jsonPath = resolve(reportDir, `ai-ready-${org}-${today}.json`);

  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        organization: org,
        model,
        method: "single-eval-loop (F416 우회 — TD-56 batch burst 차단 회피)",
        totalSkills: ids.length,
        completedSkills: ok.length,
        failedSkills: failed.length,
        totalCostUsd: totalCost,
        durationSeconds: totalDur,
        avgScore,
        overallPassedCount: passCount,
        criteriaPassRates: Object.fromEntries(
          Object.entries(criteriaPass).map(([k, v]) => [
            k,
            { passed: v.passed, total: v.total, passRate: v.passed / v.total, avgScore: v.sumScore / v.total },
          ]),
        ),
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\n📄 리포트: ${jsonPath}`);
  console.log(`🏁 완료\n`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
