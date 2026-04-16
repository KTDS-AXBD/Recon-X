import { useMemo } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import raw from "../../../../docs/poc/ai-ready-score-lpon-raw.json";

// ── Data shape (kept loose to avoid full schema import) ────────────────────
interface CriterionScore {
  score: number;
  pass: boolean;
  signals: Record<string, unknown>;
}
interface ScoreRow {
  skillId: string;
  domain: string;
  overall: number;
  passAiReady: boolean;
  criteria: {
    machineReadable: CriterionScore;
    semanticConsistency: CriterionScore;
    testable: CriterionScore;
    traceable: CriterionScore;
    completeness: CriterionScore & { btq?: { business: number; technical: number; quality: number } };
    humanReviewable: CriterionScore;
  };
  failedCriteria: string[];
}

interface PayloadData {
  rowsQueried: number;
  scored: number;
  elapsedMs: number;
  aggregate: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    byCriterion: Record<string, { passRate: number; avgScore: number; median: number; p25: number; p75: number }>;
    overall: { avg: number; median: number; p25: number; p75: number; min: number; max: number };
    btqAvg: { business: number; technical: number; quality: number };
    topFailures: { name: string; count: number; rate: number }[];
  };
  topSamples: ScoreRow[];
  bottomSamples: ScoreRow[];
  allScores: ScoreRow[];
}

interface Payload {
  data: PayloadData;
}

const CRITERION_LABEL: Record<string, string> = {
  machineReadable: "Machine-readable",
  semanticConsistency: "Semantic Consistency",
  testable: "Testable",
  traceable: "Traceable",
  completeness: "Completeness (B+T+Q)",
  humanReviewable: "Human-reviewable",
};

function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

function colorFor(pass: boolean): string {
  return pass ? "#16a34a" : "#dc2626";
}

export default function PocAiReadyPage() {
  const payload = raw as Payload;
  const d = payload.data;
  const a = d.aggregate;

  const criterionData = useMemo(
    () =>
      Object.entries(a.byCriterion).map(([k, v]) => ({
        name: CRITERION_LABEL[k] ?? k,
        passRate: Math.round(v.passRate * 1000) / 10,
        avg: Math.round(v.avgScore * 1000) / 1000,
        pass: v.passRate >= 0.9,
      })),
    [a.byCriterion],
  );

  const btqData = useMemo(
    () => [
      { dim: "Business", value: Math.round(a.btqAvg.business * 1000) / 10 },
      { dim: "Technical", value: Math.round(a.btqAvg.technical * 1000) / 10 },
      { dim: "Quality", value: Math.round(a.btqAvg.quality * 1000) / 10 },
    ],
    [a.btqAvg],
  );

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">AIF-REQ-034</Badge>
          <Badge>PoC · 2026-04-17 보고</Badge>
        </div>
        <h1 className="text-2xl font-semibold">AI-Ready 6기준 채점 리포트 — LPON</h1>
        <p className="text-sm text-muted-foreground">
          LPON 온누리상품권 {d.scored}건 skill package를 규칙 기반 채점기로 평가 (소요 {(d.elapsedMs / 1000).toFixed(1)}초).
          Foundry-X 반제품 자동 생산 필요충분조건 충족률을 수치화.
        </p>
      </header>

      {/* Hero numbers */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">AI-Ready 통과</div>
          <div className="text-3xl font-semibold">{pct(a.passRate)}</div>
          <div className="text-xs mt-1 text-muted-foreground">
            {a.passed} / {a.total} (overall ≥ 0.8)
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">평균 Overall</div>
          <div className="text-3xl font-semibold">{a.overall.avg.toFixed(3)}</div>
          <div className="text-xs mt-1 text-muted-foreground">
            median {a.overall.median.toFixed(3)} · p25 {a.overall.p25.toFixed(3)} · p75 {a.overall.p75.toFixed(3)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Business 차원 평균</div>
          <div className="text-3xl font-semibold text-emerald-600">{pct(a.btqAvg.business, 1)}</div>
          <div className="text-xs mt-1 text-muted-foreground">업무 규칙 추출은 견고</div>
        </Card>
        <Card className="p-5 border-red-300">
          <div className="text-xs text-muted-foreground mb-1">Technical 차원 평균</div>
          <div className="text-3xl font-semibold text-red-600">{pct(a.btqAvg.technical, 1)}</div>
          <div className="text-xs mt-1 text-red-600 font-medium">핵심 Gap — 정식 구현 최우선</div>
        </Card>
      </section>

      {/* 6-criterion bar chart */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">6기준별 통과율</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={criterionData} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={180} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
                {criterionData.map((e, i) => (
                  <Cell key={i} fill={colorFor(e.pass)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* BTQ */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">B / T / Q 3차원 (Completeness 세부)</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={btqData} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="dim" width={120} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {btqData.map((e, i) => (
                  <Cell key={i} fill={e.value >= 50 ? "#16a34a" : e.value >= 25 ? "#f59e0b" : "#dc2626"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          <strong>해석</strong>: Decode-X 파이프라인은 업무 규칙(Business)은 잘 뽑지만 Technical/Quality 관점은 거의 추출 못함.
          정식 구현에서 svc-extraction 프롬프트를 API/필드/비기능 관점으로 확장하면 pass rate의 대폭 상승 기대.
        </p>
      </Card>

      {/* Top failures */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">실패 원인 랭킹</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">순위</th>
              <th className="py-2 pr-4">기준</th>
              <th className="py-2 pr-4 text-right">미달 건수</th>
              <th className="py-2 text-right">미달 비율</th>
            </tr>
          </thead>
          <tbody>
            {a.topFailures.map((f, i) => (
              <tr key={f.name} className="border-b last:border-0">
                <td className="py-2 pr-4">{i + 1}</td>
                <td className="py-2 pr-4">{CRITERION_LABEL[f.name] ?? f.name}</td>
                <td className="py-2 pr-4 text-right font-mono">{f.count}</td>
                <td className="py-2 text-right font-mono">{pct(f.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Top / Bottom samples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">상위 10건 (overall 상위)</h2>
          <SampleTable rows={d.topSamples.slice(0, 10)} />
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">하위 10건 (overall 하위)</h2>
          <SampleTable rows={d.bottomSamples.slice(0, 10)} />
        </Card>
      </div>

      <footer className="text-xs text-muted-foreground border-t pt-4">
        <p>
          <strong>채점 로직</strong>: services/svc-skill/src/scoring/ai-ready.ts (규칙 기반, LLM 없음) · <strong>엔드포인트</strong>:
          <code className="ml-1">POST /admin/score-ai-ready</code> · <strong>설계 문서</strong>:
          docs/poc/ai-ready-criteria-design.md · <strong>PRD</strong>:
          docs/req-interview/decode-x-deep-dive/prd-final.md (R2 82/100)
        </p>
      </footer>
    </div>
  );
}

function SampleTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-2">skillId</th>
            <th className="py-2 pr-2 text-right">Overall</th>
            <th className="py-2 pr-2 text-right">MR</th>
            <th className="py-2 pr-2 text-right">SC</th>
            <th className="py-2 pr-2 text-right">T</th>
            <th className="py-2 pr-2 text-right">TR</th>
            <th className="py-2 pr-2 text-right">C</th>
            <th className="py-2 pr-2 text-right">HR</th>
            <th className="py-2 text-right">Pass</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.skillId} className="border-b last:border-0">
              <td className="py-1 pr-2">{r.skillId.slice(0, 8)}…</td>
              <td className="py-1 pr-2 text-right">{r.overall.toFixed(3)}</td>
              <td className="py-1 pr-2 text-right">{r.criteria.machineReadable.score.toFixed(2)}</td>
              <td className="py-1 pr-2 text-right">{r.criteria.semanticConsistency.score.toFixed(2)}</td>
              <td className="py-1 pr-2 text-right">{r.criteria.testable.score.toFixed(2)}</td>
              <td className="py-1 pr-2 text-right">{r.criteria.traceable.score.toFixed(2)}</td>
              <td className="py-1 pr-2 text-right">{r.criteria.completeness.score.toFixed(2)}</td>
              <td className="py-1 pr-2 text-right">{r.criteria.humanReviewable.score.toFixed(2)}</td>
              <td className="py-1 text-right">
                {r.passAiReady ? <span className="text-emerald-600">✓</span> : <span className="text-red-600">✗</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
