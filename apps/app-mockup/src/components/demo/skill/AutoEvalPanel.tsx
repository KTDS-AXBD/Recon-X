import { useEffect, useState } from "react";
import { fetchPipelineEvals, type PipelineEval } from "@/lib/api/evaluation";
import { Skeleton } from "@/components/shared/Skeleton";
import { cn } from "@/lib/cn";

interface AutoEvalPanelProps {
  skillId: string;
  organizationId: string;
}

const STAGES = ["mechanical", "semantic", "consensus"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  mechanical: "Mechanical",
  semantic: "Semantic",
  consensus: "Consensus",
};

function verdictIcon(verdict: string) {
  switch (verdict) {
    case "pass": return { icon: "✅", color: "text-green-600 dark:text-green-400" };
    case "warn": return { icon: "⚠️", color: "text-yellow-600 dark:text-yellow-400" };
    case "fail": return { icon: "❌", color: "text-red-600 dark:text-red-400" };
    default: return { icon: "—", color: "text-gray-400" };
  }
}

function scoreBarColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

function parseIssues(issuesJson: string): string[] {
  try {
    const parsed: unknown = JSON.parse(issuesJson);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return issuesJson ? [issuesJson] : [];
  }
}

export function AutoEvalPanel({ skillId, organizationId }: AutoEvalPanelProps) {
  const [evalsByStage, setEvalsByStage] = useState<Map<string, PipelineEval>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExpandedStage(null);

    fetchPipelineEvals(organizationId, {
      targetType: "skill",
      targetId: skillId,
      limit: 10,
    })
      .then((evals) => {
        if (cancelled) return;
        const byStage = new Map<string, PipelineEval>();
        // Take the latest eval per stage
        for (const ev of evals) {
          if (!byStage.has(ev.stage)) {
            byStage.set(ev.stage, ev);
          }
        }
        setEvalsByStage(byStage);
      })
      .catch(() => {
        if (!cancelled) setEvalsByStage(new Map());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [organizationId, skillId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-3">
          <Skeleton className="h-16 w-1/3" />
          <Skeleton className="h-16 w-1/3" />
          <Skeleton className="h-16 w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Auto-Eval Pipeline
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">3-Stage</span>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-3 gap-3">
        {STAGES.map((stage) => {
          const ev = evalsByStage.get(stage);
          const { icon, color } = ev ? verdictIcon(ev.verdict) : verdictIcon("");
          const score = ev?.score ?? 0;
          const issues = ev ? parseIssues(ev.issuesJson) : [];
          const isExpanded = expandedStage === stage;

          return (
            <div key={stage} className="space-y-2">
              <button
                type="button"
                onClick={() => setExpandedStage(isExpanded ? null : stage)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-all",
                  ev
                    ? "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                    : "border-dashed border-gray-300 dark:border-gray-700",
                  isExpanded && "ring-1 ring-blue-500/30 border-blue-400 dark:border-blue-600",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className={cn("text-sm", color)}>{icon}</span>
                </div>

                {/* Score bar */}
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", scoreBarColor(score))}
                    style={{ width: `${Math.round(score * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400">
                    {ev ? `${Math.round(score * 100)}%` : "N/A"}
                  </span>
                  {issues.length > 0 && (
                    <span className="text-[10px] text-gray-400">
                      {issues.length} issue{issues.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </button>

              {/* Expandable issues */}
              {isExpanded && issues.length > 0 && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 space-y-1.5 text-xs">
                  {issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-gray-600 dark:text-gray-400">
                      <span className="text-red-400 mt-0.5 shrink-0">•</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {evalsByStage.size === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          이 Skill에 대한 평가 결과가 아직 없어요
        </p>
      )}
    </div>
  );
}
