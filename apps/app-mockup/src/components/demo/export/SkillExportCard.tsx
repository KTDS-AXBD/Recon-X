import { useEffect, useState } from "react";
import type { SkillSummary } from "@/lib/api/skill";
import { fetchPipelineEvals, type PipelineEval } from "@/lib/api/evaluation";
import { cn } from "@/lib/cn";

function trustBadge(score: number) {
  if (score > 0.8) return { label: "High", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
  if (score > 0.6) return { label: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" };
  return { label: "Low", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
}

function verdictBadge(verdict: string) {
  switch (verdict) {
    case "pass": return { label: "PASS", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
    case "warn": return { label: "WARN", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" };
    case "fail": return { label: "FAIL", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
    default: return { label: "N/A", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
  }
}

interface SkillExportCardProps {
  skill: SkillSummary;
  organizationId: string;
  selected: boolean;
  onClick: () => void;
}

export function SkillExportCard({ skill, organizationId, selected, onClick }: SkillExportCardProps) {
  const { metadata, trust } = skill;
  const tb = trustBadge(trust.score);
  const [latestEval, setLatestEval] = useState<PipelineEval | null>(null);

  useEffect(() => {
    fetchPipelineEvals(organizationId, {
      targetType: "skill",
      targetId: skill.skillId,
      limit: 1,
    })
      .then((evals) => {
        if (evals.length > 0) setLatestEval(evals[0] ?? null);
      })
      .catch(() => { /* silently ignore eval fetch errors */ });
  }, [organizationId, skill.skillId]);

  const vb = latestEval ? verdictBadge(latestEval.verdict) : verdictBadge("");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-4 space-y-2.5 transition-all",
        selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400 ring-1 ring-blue-500/30"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 hover:border-gray-400 dark:hover:border-gray-500",
      )}
    >
      {/* Header: domain + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium">
          {metadata.domain}
        </span>
        {metadata.subdomain && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {metadata.subdomain}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", tb.color)}>
            {tb.label}
          </span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", vb.color)}>
            {vb.label}
          </span>
        </span>
      </div>

      {/* Skill ID (truncated) */}
      <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
        {skill.skillId}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{skill.policyCount} policies</span>
        <span>v{metadata.version}</span>
        <span className={cn("font-medium", trust.score > 0.8 ? "text-green-600 dark:text-green-400" : "text-gray-500")}>
          {Math.round(trust.score * 100)}%
        </span>
      </div>
    </button>
  );
}
