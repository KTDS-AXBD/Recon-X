import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ─── Section Header ─── */
export function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Data Table ─── */
export function DataTable({ headers, rows, highlightCol }: {
  headers: string[];
  rows: string[][];
  highlightCol?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "var(--bg-secondary)" }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-2.5"
                  style={{
                    color: ci === highlightCol ? "var(--accent)" : "var(--text-primary)",
                    fontWeight: ci === highlightCol ? 600 : 400,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Task Card ─── */
export function TaskCard({ priority, title, description, status }: {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  status: string;
}) {
  const colorMap = { high: "#ef4444", medium: "#f59e0b", low: "#6b7280" };
  const labelMap = { high: "높음", medium: "보통", low: "낮음" };
  const color = colorMap[priority];
  return (
    <div
      className="p-4 rounded-lg border flex items-start gap-3"
      style={{ borderColor: "var(--border)", borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
            {title}
          </span>
          <Badge variant="outline" style={{ color, borderColor: color, fontSize: "0.65rem" }}>
            {labelMap[priority]}
          </Badge>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{description}</p>
      </div>
      <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
        {status}
      </span>
    </div>
  );
}

/* ─── Finding Card ─── */
export function FindingCard({ icon: Icon, title, items, color }: {
  icon: React.ElementType;
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{title}</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Policy Example Card ─── */
export function PolicyExampleCard({ code, title, description }: {
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="secondary" className="text-xs font-mono">{code}</Badge>
        <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{title}</span>
      </div>
      <p className="text-xs ml-1" style={{ color: "var(--text-secondary)" }}>{description}</p>
    </div>
  );
}

/* ─── Pipeline Source Info ─── */
export function SourceFileInfo({ leftCount, leftLabel, leftSub, rightCount, rightLabel, rightSub }: {
  leftCount: string;
  leftLabel: string;
  leftSub: string;
  rightCount: string;
  rightLabel: string;
  rightSub: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div>
        <div className="text-2xl font-bold" style={{ color: "#3b82f6" }}>{leftCount}</div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{leftLabel}</div>
        <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>{leftSub}</div>
      </div>
      <div className="flex items-center justify-center">
        <ArrowRight className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: "#10b981" }}>{rightCount}</div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{rightLabel}</div>
        <div className="text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>{rightSub}</div>
      </div>
    </div>
  );
}
