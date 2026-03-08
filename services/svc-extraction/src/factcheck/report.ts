/**
 * Fact Check Report Generator — produces Markdown reports from
 * fact-check results and gaps.
 *
 * v0.7.4 Phase 2-B → v0.8 Gap Analysis Deep Dive:
 * - Noise filtering stats
 * - Domain-based gap categorization
 * - Adjusted coverage calculation
 */

import type { FactCheckGap } from "@ai-foundry/types";
import type { NoiseStats } from "./gap-detector.js";
import { buildDomainSummary } from "./gap-categorizer.js";

// ── Input type ────────────────────────────────────────────────────

export interface ReportInput {
  resultId: string;
  organizationId: string;
  totalSourceItems: number;
  totalDocItems: number;
  matchedItems: number;
  gapCount: number;
  coveragePct: number;
  gapsByType: Record<string, number>;
  gapsBySeverity: Record<string, number>;
  gaps: FactCheckGap[];
  noiseStats?: NoiseStats;
}

// ── Gap type / severity labels ────────────────────────────────────

const GAP_TYPE_LABELS: Record<string, string> = {
  SM: "Schema Mismatch",
  MC: "Missing in Code",
  PM: "Parameter Mismatch",
  TM: "Type Mismatch",
  MID: "Missing in Document",
};

const SEVERITY_ORDER = ["HIGH", "MEDIUM", "LOW"] as const;

// ── Main ──────────────────────────────────────────────────────────

export function generateFactCheckReport(input: ReportInput): string {
  const lines: string[] = [];

  // Separate noise vs real gaps
  const noiseGapIds = new Set<string>();
  const realGaps: FactCheckGap[] = [];
  for (const gap of input.gaps) {
    if (gap.autoResolved && gap.reviewStatus === "dismissed") {
      noiseGapIds.add(gap.gapId);
    } else {
      realGaps.push(gap);
    }
  }

  // Adjusted coverage: exclude noise source items from denominator
  const noiseCount = noiseGapIds.size;
  const adjustedSourceItems = input.totalSourceItems - (input.noiseStats?.filteredTables ?? 0) - (input.noiseStats?.filteredApis ?? 0);
  const adjustedCoverage = adjustedSourceItems > 0
    ? (input.matchedItems / adjustedSourceItems) * 100
    : 0;

  // Title
  lines.push(`# Fact Check Report — ${input.organizationId}`);
  lines.push("");
  lines.push(`> Result ID: \`${input.resultId}\``);
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Summary table
  lines.push("## 1. Summary");
  lines.push("");
  lines.push("| Metric | Raw | Adjusted |");
  lines.push("|--------|----:|--------:|");
  lines.push(`| Source Items | ${input.totalSourceItems} | ${adjustedSourceItems} |`);
  lines.push(`| Document Items | ${input.totalDocItems} | ${input.totalDocItems} |`);
  lines.push(`| Matched | ${input.matchedItems} | ${input.matchedItems} |`);
  lines.push(`| Gaps Found | ${input.gapCount} | ${realGaps.length} |`);
  lines.push(`| Coverage | ${input.coveragePct.toFixed(1)}% | ${adjustedCoverage.toFixed(1)}% |`);
  lines.push(`| Noise Filtered | — | ${noiseCount} |`);
  lines.push("");

  // Noise Analysis
  if (input.noiseStats && noiseCount > 0) {
    lines.push("## 2. Noise Analysis");
    lines.push("");
    lines.push(`총 **${noiseCount}건**의 노이즈 항목이 자동 필터링되었습니다.`);
    lines.push("");
    lines.push("| Category | Count | Description |");
    lines.push("|----------|------:|-------------|");
    if (input.noiseStats.filteredTables > 0) {
      lines.push(`| Noise Tables | ${input.noiseStats.filteredTables} | Oracle 시스템 테이블, SQL alias/keyword, 변수명 |`);
    }
    if (input.noiseStats.filteredApis > 0) {
      lines.push(`| Noise APIs | ${input.noiseStats.filteredApis} | 테스트, 유틸리티, 중복 경로, 디버그 엔드포인트 |`);
    }
    if (input.noiseStats.downgraded0ColTables > 0) {
      lines.push(`| 0-Column Tables | ${input.noiseStats.downgraded0ColTables} | MyBatis SELECT-only 참조 (HIGH→MEDIUM 다운그레이드) |`);
    }
    lines.push("");

    // Detailed noise reasons
    const reasonEntries = Object.entries(input.noiseStats.reasons);
    if (reasonEntries.length > 0) {
      lines.push("**Noise Reasons Breakdown:**");
      lines.push("");
      for (const [reason, count] of reasonEntries.sort((a, b) => b[1] - a[1])) {
        lines.push(`- \`${reason}\`: ${count}건`);
      }
      lines.push("");
    }
  }

  // Gap Distribution: type x severity matrix (real gaps only)
  lines.push("## 3. Gap Distribution (Real Gaps Only)");
  lines.push("");

  const allTypes = Object.keys(GAP_TYPE_LABELS);

  lines.push(`| Type | ${SEVERITY_ORDER.join(" | ")} | Total |`);
  lines.push(`|------|${SEVERITY_ORDER.map(() => "------:").join("|")}|------:|`);

  for (const gapType of allTypes) {
    const typeLabel = GAP_TYPE_LABELS[gapType] ?? gapType;
    const counts = SEVERITY_ORDER.map((sev) => {
      return realGaps.filter(
        (g) => g.gapType === gapType && g.severity === sev,
      ).length;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    lines.push(`| ${typeLabel} (${gapType}) | ${counts.join(" | ")} | ${total} |`);
  }

  const severityTotals = SEVERITY_ORDER.map((sev) =>
    realGaps.filter((g) => g.severity === sev).length,
  );
  lines.push(
    `| **Total** | ${severityTotals.join(" | ")} | ${realGaps.length} |`,
  );
  lines.push("");

  // Domain Categorization
  lines.push("## 4. Domain Analysis");
  lines.push("");

  const domainSummaries = buildDomainSummary(input.gaps, noiseGapIds);

  lines.push("| Domain | Total | HIGH | MEDIUM | LOW | Noise | Gap Types |");
  lines.push("|--------|------:|-----:|-------:|----:|------:|-----------|");

  for (const summary of domainSummaries) {
    const gapTypeStr = Object.entries(summary.gapTypes)
      .map(([t, c]) => `${t}:${c}`)
      .join(", ");
    lines.push(
      `| ${summary.label} | ${summary.totalGaps} | ${summary.highGaps} | ${summary.mediumGaps} | ${summary.lowGaps} | ${summary.noiseGaps} | ${gapTypeStr} |`,
    );
  }
  lines.push("");

  // Domain details with samples
  for (const summary of domainSummaries) {
    if (summary.sampleDescriptions.length === 0) continue;
    lines.push(`### ${summary.label} (${summary.domain})`);
    lines.push("");
    for (const desc of summary.sampleDescriptions) {
      lines.push(`- ${desc}`);
    }
    lines.push("");
  }

  // HIGH Severity Gap List (top priority)
  const highGaps = realGaps.filter((g) => g.severity === "HIGH");
  if (highGaps.length > 0) {
    lines.push(`## 5. HIGH Severity Gaps (${highGaps.length})`);
    lines.push("");

    // Group by gap type for readability
    const byType = new Map<string, FactCheckGap[]>();
    for (const gap of highGaps) {
      const existing = byType.get(gap.gapType) ?? [];
      existing.push(gap);
      byType.set(gap.gapType, existing);
    }

    for (const [gapType, typeGaps] of byType) {
      const typeLabel = GAP_TYPE_LABELS[gapType] ?? gapType;
      lines.push(`### ${typeLabel} (${typeGaps.length})`);
      lines.push("");

      // Show up to 20 items as a compact list
      const showAll = typeGaps.length <= 20;
      const displayGaps = showAll ? typeGaps : typeGaps.slice(0, 20);

      for (const gap of displayGaps) {
        lines.push(`- ${gap.description}`);
      }

      if (!showAll) {
        lines.push(`- ... and ${typeGaps.length - 20} more`);
      }
      lines.push("");
    }
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("*Generated by AI Foundry Fact Check Engine (v0.8 — Deep Analysis)*");
  lines.push("");

  return lines.join("\n");
}
