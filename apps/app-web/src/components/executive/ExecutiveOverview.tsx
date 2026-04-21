// F375: Executive View Overview — 4 Group 요약 위젯 (KPI-1: 3분 내 파악)
// 4 Groups: 문서 수집, 정책 추출, 검증 품질, Foundry-X 핸드오프
import { useState, useEffect } from "react";
import {
  FileStack,
  BookOpenCheck,
  ShieldCheck,
  Rocket,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface GroupMetric {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

interface MetricGroup {
  id: string;
  icon: React.ReactNode;
  title: string;
  titleKo: string;
  color: string;
  metrics: GroupMetric[];
}

// TODO: 실 API 연결 시 useQuery로 교체 (기존 svc-skill/svc-policy endpoints)
// GET /api/skills?domain=pension&limit=100
// GET /api/policies?status=approved&limit=100
// GET /api/handoff/jobs?status=completed
// GET /api/factcheck/domain-summary
const STATIC_GROUPS: MetricGroup[] = [
  {
    id: "ingestion",
    icon: <FileStack className="w-5 h-5" />,
    title: "Document Ingestion",
    titleKo: "문서 수집",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    metrics: [
      { label: "처리 문서", value: "47건", sub: "PDF/PPT/DOCX/Excel", trend: "up", trendValue: "+12 (이번 달)" },
      { label: "소스코드", value: "3개 레포", sub: "AST 파싱 완료" },
      { label: "처리 성공률", value: "96.8%", trend: "up", trendValue: "+0.8%p" },
    ],
  },
  {
    id: "policy",
    icon: <BookOpenCheck className="w-5 h-5" />,
    title: "Policy Extraction",
    titleKo: "정책 추출",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    metrics: [
      { label: "확정 정책", value: "87건", sub: "HITL 승인 완료", trend: "up", trendValue: "+25 (이번 Sprint)" },
      { label: "Skill 패키지", value: "12개", sub: "svc-skill R2 저장" },
      { label: "HITL 대기", value: "8건", trend: "neutral" },
    ],
  },
  {
    id: "quality",
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Verification Quality",
    titleKo: "검증 품질",
    color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    metrics: [
      { label: "자가보고 일치율", value: "99.7%", trend: "up" },
      { label: "독립 검증율", value: "95.6%", sub: "Drift 4.1%p", trend: "down", trendValue: "Gap 주의" },
      { label: "팩트체크 커버리지", value: "78%", trend: "up", trendValue: "+5%p" },
    ],
  },
  {
    id: "handoff",
    icon: <Rocket className="w-5 h-5" />,
    title: "Foundry-X Handoff",
    titleKo: "핸드오프 현황",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    metrics: [
      { label: "Gate Pass", value: "3/6 서비스", sub: "LPON 파일럿", trend: "up" },
      { label: "평균 AI-Ready", value: "71.7%", trend: "up", trendValue: "+8%p" },
      { label: "Drift (자가/독립)", value: "99% / 95.6%", sub: "4.1%p 격차" },
    ],
  },
];

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" | undefined }) {
  if (!trend) return null;
  if (trend === "up") return <TrendingUp className="w-3 h-3 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function GroupCard({ group }: { group: MetricGroup }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2">
        <span className={`p-1.5 rounded-lg ${group.color}`}>{group.icon}</span>
        <div>
          <p className="text-sm font-semibold">{group.titleKo}</p>
          <p className="text-xs text-muted-foreground">{group.title}</p>
        </div>
      </div>
      <div className="space-y-2 divide-y divide-border">
        {group.metrics.map((metric) => (
          <div key={metric.label} className="flex items-start justify-between pt-2 first:pt-0">
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <TrendIcon trend={metric.trend} />
                <span className="text-sm font-semibold">{metric.value}</span>
              </div>
              {metric.sub && (
                <p className="text-xs text-muted-foreground">{metric.sub}</p>
              )}
              {metric.trendValue && (
                <p className="text-xs text-muted-foreground">{metric.trendValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExecutiveOverview() {
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Executive Overview</h2>
          <p className="text-sm text-muted-foreground">
            Decode-X → Foundry-X 파이프라인 현황 요약
          </p>
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            최종 갱신: {lastUpdated}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATIC_GROUPS.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}
