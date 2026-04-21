// F386: Spec↔Source 규제 준수 뱃지 — Foundry-X 타임라인 카드에 compliance 항목별 표시
import { ShieldCheck, ShieldAlert } from "lucide-react";

export interface ComplianceItem {
  label: string;
  passed: boolean;
}

export interface ComplianceBadgeProps {
  items: ComplianceItem[];
  compact?: boolean;
}

export function ComplianceBadge({ items, compact = false }: ComplianceBadgeProps) {
  const allPassed = items.every((i) => i.passed);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
          allPassed
            ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
            : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
        }`}
        title={items.map((i) => `${i.label}: ${i.passed ? "✓" : "✗"}`).join(" | ")}
      >
        {allPassed ? (
          <ShieldCheck className="w-3 h-3" />
        ) : (
          <ShieldAlert className="w-3 h-3" />
        )}
        {allPassed ? "규제 준수" : "일부 미준수"}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            item.passed
              ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
          }`}
        >
          {item.passed ? (
            <ShieldCheck className="w-3 h-3" />
          ) : (
            <ShieldAlert className="w-3 h-3" />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}
