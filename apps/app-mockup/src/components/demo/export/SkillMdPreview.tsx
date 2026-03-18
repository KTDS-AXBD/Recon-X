import { useEffect, useState } from "react";
import { fetchSkillDetail } from "@/lib/api/skill";
import { Skeleton } from "@/components/shared/Skeleton";
import { cn } from "@/lib/cn";

interface SkillMdPreviewProps {
  skillId: string;
  organizationId: string;
}

function renderMarkdownLine(line: string, idx: number) {
  if (line.startsWith("### ")) {
    return <h4 key={idx} className="text-sm font-semibold mt-3 mb-1 text-gray-800 dark:text-gray-200">{line.slice(4)}</h4>;
  }
  if (line.startsWith("## ")) {
    return <h3 key={idx} className="text-base font-bold mt-4 mb-1.5 text-gray-900 dark:text-gray-100">{line.slice(3)}</h3>;
  }
  if (line.startsWith("# ")) {
    return <h2 key={idx} className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-gray-50">{line.slice(2)}</h2>;
  }
  if (line.startsWith("| ")) {
    return (
      <div key={idx} className="font-mono text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {line}
      </div>
    );
  }
  if (line.startsWith("```")) {
    return <div key={idx} className="text-xs text-gray-400">{"---"}</div>;
  }
  if (line.startsWith("- ")) {
    return <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc">{line.slice(2)}</li>;
  }
  if (line.trim() === "") {
    return <div key={idx} className="h-2" />;
  }
  return <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{line}</p>;
}

function buildSkillMd(detail: Record<string, unknown>): string {
  const meta = detail["metadata"] as Record<string, unknown> | undefined;
  const policies = detail["policies"] as Array<Record<string, unknown>> | undefined;
  const trust = detail["trust"] as Record<string, unknown> | undefined;

  const lines: string[] = [];
  lines.push(`# SKILL.md`);
  lines.push("");
  lines.push(`## Metadata`);
  if (meta) {
    lines.push(`- **Domain**: ${String(meta["domain"] ?? "unknown")}`);
    if (meta["subdomain"]) lines.push(`- **Subdomain**: ${String(meta["subdomain"])}`);
    lines.push(`- **Version**: ${String(meta["version"] ?? "1.0.0")}`);
    lines.push(`- **Author**: ${String(meta["author"] ?? "AI Foundry")}`);
    const tags = meta["tags"] as string[] | undefined;
    if (tags && tags.length > 0) lines.push(`- **Tags**: ${tags.join(", ")}`);
  }
  lines.push("");

  if (trust) {
    lines.push(`## Trust`);
    lines.push(`- **Level**: ${String(trust["level"] ?? "unknown")}`);
    lines.push(`- **Score**: ${String(trust["score"] ?? 0)}`);
    lines.push("");
  }

  if (policies && policies.length > 0) {
    lines.push(`## Policies (${String(policies.length)})`);
    lines.push("");
    lines.push(`| Code | Condition | Outcome |`);
    lines.push(`|------|-----------|---------|`);
    for (const p of policies.slice(0, 20)) {
      lines.push(`| ${String(p["code"] ?? "")} | ${String(p["condition"] ?? "").slice(0, 40)} | ${String(p["outcome"] ?? "").slice(0, 40)} |`);
    }
    if (policies.length > 20) {
      lines.push(`\n_... and ${String(policies.length - 20)} more policies_`);
    }
  }

  return lines.join("\n");
}

export function SkillMdPreview({ skillId, organizationId }: SkillMdPreviewProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSkillDetail(organizationId, skillId)
      .then((detail) => {
        if (!cancelled) setMarkdown(buildSkillMd(detail));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "로딩 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [organizationId, skillId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        {error}
      </div>
    );
  }

  const lines = markdown?.split("\n") ?? [];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-5 space-y-0.5 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">SKILL.md preview</span>
        <button
          type="button"
          onClick={() => {
            if (markdown) navigator.clipboard.writeText(markdown);
          }}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Copy
        </button>
      </div>
      {lines.map((line, i) => renderMarkdownLine(line, i))}
    </div>
  );
}
