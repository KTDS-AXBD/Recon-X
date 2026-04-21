import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Zap,
  FileText,
  Shield,
  Package,
  Brain,
  Users,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  fetchBenchmark,
  type BenchmarkData,
  type BenchmarkOrgData,
} from "@/api/benchmark";

/* ─── Helpers ─── */

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

const STAGE_LABELS: Record<string, string> = {
  ingestion: "Stage 1: Ingestion",
  extraction: "Stage 2: Extraction",
  policy: "Stage 3: Policy",
  ontology: "Stage 4: Ontology",
  skill: "Stage 5: Skill",
};

const STAGE_ORDER = ["ingestion", "extraction", "policy", "ontology", "skill"];

/* ─── Sub-components ─── */

function SectionTitle({
  icon,
  number,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  number: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
      >
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <Badge
            className="text-xs px-2 py-0.5"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            {number}
          </Badge>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
        </div>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function BigMetric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-sm font-medium mt-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ComparisonBar({
  label,
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  unit,
}: {
  label: string;
  leftValue: number;
  rightValue: number;
  leftLabel: string;
  rightLabel: string;
  unit?: string;
}) {
  const max = Math.max(leftValue, rightValue, 1);
  const leftPct = (leftValue / max) * 100;
  const rightPct = (rightValue / max) * 100;

  return (
    <div className="mb-4">
      <div className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        {label}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: "var(--text-secondary)" }}>{leftLabel}</span>
            <span className="font-semibold" style={{ color: "#3B82F6" }}>
              {fmt(leftValue)}{unit ?? ""}
            </span>
          </div>
          <div className="h-6 rounded-md overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
            <div
              className="h-full rounded-md transition-all duration-700"
              style={{ width: `${leftPct}%`, backgroundColor: "#3B82F6" }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: "var(--text-secondary)" }}>{rightLabel}</span>
            <span className="font-semibold" style={{ color: "#F59E0B" }}>
              {fmt(rightValue)}{unit ?? ""}
            </span>
          </div>
          <div className="h-6 rounded-md overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
            <div
              className="h-full rounded-md transition-all duration-700"
              style={{ width: `${rightPct}%`, backgroundColor: "#F59E0B" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sections ─── */

function CrossOrgSection({ orgs }: { orgs: BenchmarkOrgData[] }) {
  const left = orgs[0];
  const right = orgs[1];
  if (!left || !right) return null;

  return (
    <section>
      <SectionTitle
        icon={<BarChart3 className="w-6 h-6" style={{ color: "var(--accent)" }} />}
        number={1}
        title="Cross-Domain Comparison"
        subtitle="퇴직연금 vs 온누리상품권 — 파이프라인 투입/산출 비교"
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[left, right].map((org) => (
          <Card
            key={org.id}
            className="p-5"
            style={{
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge
                className="text-xs"
                style={{
                  backgroundColor: org.id === "LPON" ? "color-mix(in srgb, #F59E0B 15%, transparent)" : "color-mix(in srgb, #3B82F6 15%, transparent)",
                  color: org.id === "LPON" ? "#F59E0B" : "#3B82F6",
                  border: `1px solid ${org.id === "LPON" ? "#F59E0B" : "#3B82F6"}`,
                }}
              >
                {org.domain}
              </Badge>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {org.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <BigMetric
                label="Documents"
                value={fmt(org.kpi.documentsUploaded)}
                sub="투입 문서"
                color={org.id === "LPON" ? "#F59E0B" : "#3B82F6"}
              />
              <BigMetric
                label="Policies"
                value={fmt(org.kpi.policiesApproved)}
                sub="승인 정책"
                color={org.id === "LPON" ? "#F59E0B" : "#3B82F6"}
              />
              <BigMetric
                label="Terms"
                value={fmt(org.quality.skill.totalTerms)}
                sub="도메인 용어"
                color={org.id === "LPON" ? "#F59E0B" : "#3B82F6"}
              />
              <BigMetric
                label="Skills"
                value={fmt(org.kpi.skillsPackaged)}
                sub="생성 스킬"
                color={org.id === "LPON" ? "#F59E0B" : "#3B82F6"}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Comparison Bars */}
      <Card
        className="p-5"
        style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Metric-by-Metric Comparison
        </h3>
        <ComparisonBar
          label="Approved Policies"
          leftValue={left.kpi.policiesApproved}
          rightValue={right.kpi.policiesApproved}
          leftLabel={left.label}
          rightLabel={right.label}
        />
        <ComparisonBar
          label="Domain Terms"
          leftValue={left.quality.skill.totalTerms}
          rightValue={right.quality.skill.totalTerms}
          leftLabel={left.label}
          rightLabel={right.label}
        />
        <ComparisonBar
          label="Generated Skills"
          leftValue={left.kpi.skillsPackaged}
          rightValue={right.kpi.skillsPackaged}
          leftLabel={left.label}
          rightLabel={right.label}
        />
        <ComparisonBar
          label="Policy Approval Rate"
          leftValue={left.quality.policy.approvalRate}
          rightValue={right.quality.policy.approvalRate}
          leftLabel={left.label}
          rightLabel={right.label}
          unit="%"
        />
      </Card>
    </section>
  );
}

function AiVsManualSection({
  data,
}: {
  data: BenchmarkData["aiFoundryVsManual"];
}) {
  const rows = [
    {
      metric: "Processing Mode",
      ai: data.aiFoundry.processingMode,
      manual: data.manual.processingMode,
    },
    {
      metric: "Estimated Hours",
      ai: `${data.aiFoundry.estimatedHours}h`,
      manual: `${fmt(data.manual.estimatedHours)}h`,
      delta: `${pct(data.improvement.timeReductionPercent)} saved`,
    },
    {
      metric: "Accuracy Rate",
      ai: `${data.aiFoundry.accuracyRate}%`,
      manual: `${data.manual.accuracyRate}%`,
      delta: `+${data.improvement.accuracyGainPp}pp`,
    },
    {
      metric: "Consistency Rate",
      ai: `${data.aiFoundry.consistencyRate}%`,
      manual: `${data.manual.consistencyRate}%`,
      delta: `+${data.improvement.consistencyGainPp}pp`,
    },
    {
      metric: "Review Cycle",
      ai: `${data.aiFoundry.reviewCycleDays} days`,
      manual: `${data.manual.reviewCycleDays} days`,
      delta: `${data.improvement.reviewSpeedupX}x faster`,
    },
  ];

  return (
    <section>
      <SectionTitle
        icon={<TrendingUp className="w-6 h-6" style={{ color: "var(--accent)" }} />}
        number={2}
        title="AI Foundry vs Manual Process"
        subtitle="자동화 파이프라인 대비 수작업 SI 지식 추출 효과 비교"
      />

      {/* Hero Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card
          className="p-4 text-center"
          style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <FileText className="w-5 h-5 mx-auto mb-2" style={{ color: "#3B82F6" }} />
          <div className="text-2xl font-bold" style={{ color: "#3B82F6" }}>
            {fmt(data.documentsProcessed)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Documents Processed
          </div>
        </Card>
        <Card
          className="p-4 text-center"
          style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <Shield className="w-5 h-5 mx-auto mb-2" style={{ color: "#10B981" }} />
          <div className="text-2xl font-bold" style={{ color: "#10B981" }}>
            {fmt(data.policiesExtracted)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Policies Extracted
          </div>
        </Card>
        <Card
          className="p-4 text-center"
          style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <Package className="w-5 h-5 mx-auto mb-2" style={{ color: "#8B5CF6" }} />
          <div className="text-2xl font-bold" style={{ color: "#8B5CF6" }}>
            {fmt(data.skillsGenerated)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Skills Generated
          </div>
        </Card>
        <Card
          className="p-4 text-center"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent) 8%, var(--bg-primary))",
            border: "1px solid var(--accent)",
          }}
        >
          <Zap className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--accent)" }} />
          <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
            {data.improvement.reviewSpeedupX}x
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Review Speed-up
          </div>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card
        className="overflow-hidden"
        style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--bg-secondary)" }}>
              <th className="text-left p-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                Metric
              </th>
              <th className="text-center p-3 font-semibold" style={{ color: "#3B82F6" }}>
                <div className="flex items-center justify-center gap-1.5">
                  <Brain className="w-4 h-4" />
                  AI Foundry
                </div>
              </th>
              <th className="text-center p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>
                <div className="flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Manual
                </div>
              </th>
              <th className="text-center p-3 font-semibold" style={{ color: "#10B981" }}>
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.metric}
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                  {row.metric}
                </td>
                <td className="p-3 text-center font-semibold" style={{ color: "#3B82F6" }}>
                  {row.ai}
                </td>
                <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>
                  {row.manual}
                </td>
                <td className="p-3 text-center">
                  {row.delta && (
                    <Badge
                      className="text-xs"
                      style={{
                        backgroundColor: "color-mix(in srgb, #10B981 15%, transparent)",
                        color: "#10B981",
                        border: "1px solid #10B981",
                      }}
                    >
                      {row.delta}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function StagePerformanceSection({ orgs }: { orgs: BenchmarkOrgData[] }) {
  const left = orgs[0];
  const right = orgs[1];
  if (!left || !right) return null;

  const allStages = STAGE_ORDER.filter(
    (s) => left.stageLatencies[s] || right.stageLatencies[s],
  );

  return (
    <section>
      <SectionTitle
        icon={<Clock className="w-6 h-6" style={{ color: "var(--accent)" }} />}
        number={3}
        title="5-Stage Pipeline Performance"
        subtitle="Stage별 평균 처리 시간 및 처리량 비교"
      />

      {/* Stage cards */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {allStages.map((stage) => {
          const lStage = left.stageLatencies[stage];
          const rStage = right.stageLatencies[stage];
          const label = STAGE_LABELS[stage] ?? stage;

          return (
            <Card
              key={stage}
              className="p-4"
              style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  {STAGE_ORDER.indexOf(stage) + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {label}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Left org */}
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: "#3B82F6" }}>
                    {left.label}
                  </div>
                  {lStage ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {fmtMs(lStage.avgMs)}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          Avg
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {fmtMs(lStage.minMs)}/{fmtMs(lStage.maxMs)}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          Min / Max
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {fmt(lStage.samples)}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          Samples
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      No data
                    </div>
                  )}
                </div>

                {/* Right org */}
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: "#F59E0B" }}>
                    {right.label}
                  </div>
                  {rStage ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {fmtMs(rStage.avgMs)}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          Avg
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {fmtMs(rStage.minMs)}/{fmtMs(rStage.maxMs)}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          Min / Max
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {fmt(rStage.samples)}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          Samples
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      No data
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quality Summary */}
      <Card
        className="p-5"
        style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Quality Metrics Summary
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {[left, right].map((org) => (
            <div key={org.id}>
              <div className="text-xs font-medium mb-3" style={{ color: org.id === "LPON" ? "#F59E0B" : "#3B82F6" }}>
                {org.label}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Chunk Validity</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {pct(org.quality.parsing.chunkValidityRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Rules / Extraction</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {org.quality.extraction.avgRulesPerExtraction}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Policy Approval Rate</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {pct(org.quality.policy.approvalRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Avg Trust Score</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {org.quality.policy.avgTrustScore.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ─── Page ─── */

function BenchmarkSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}

export default function BenchmarkPage() {
  const { organizationId } = useOrganization();
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBenchmark(organizationId);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error.message);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []); // benchmark is cross-org, no dependency on organizationId

  if (loading) return <BenchmarkSkeleton />;
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {error ?? "No benchmark data available"}
          </p>
          <button
            onClick={() => void loadData()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Target className="w-5 h-5" style={{ color: "var(--accent-foreground)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Benchmark Report
              </h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                AI Foundry 파이프라인 벤치마크 비교 분석
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Badge
            className="text-xs"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
            }}
          >
            {new Date(data.generatedAt).toLocaleDateString("ko-KR")} generated
          </Badge>
        </div>
      </div>

      {/* Pipeline Overview Banner */}
      <Card
        className="p-5 mb-8"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent) 5%, var(--bg-primary))",
          border: "1px solid var(--accent)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            AI Foundry Production Summary
          </span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>2</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Organizations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {fmt(data.aiFoundryVsManual.documentsProcessed)}
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {fmt(data.aiFoundryVsManual.policiesExtracted)}
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Policies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {fmt(data.aiFoundryVsManual.skillsGenerated)}
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Skills</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>5</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Pipeline Stages</div>
          </div>
        </div>
      </Card>

      {/* Three Sections */}
      <div className="space-y-10">
        <CrossOrgSection orgs={data.organizations} />

        <div className="flex items-center gap-3" style={{ color: "var(--border)" }}>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          <ArrowRight className="w-4 h-4" />
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        </div>

        <AiVsManualSection data={data.aiFoundryVsManual} />

        <div className="flex items-center gap-3" style={{ color: "var(--border)" }}>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          <ArrowRight className="w-4 h-4" />
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        </div>

        <StagePerformanceSection orgs={data.organizations} />
      </div>

      {/* Footer */}
      <div
        className="mt-10 pt-6 text-center text-xs"
        style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}
      >
        AI Foundry v0.6.0 — KTDS AX BD Team — Generated {new Date(data.generatedAt).toLocaleString("ko-KR")}
      </div>
    </div>
  );
}
