/**
 * F430 (Sprint 263) — provenance.yaml auto-write.
 *
 * String-based YAML mutation (js-yaml 의존성 회피, provenance-cross-check.ts와 동일 패턴).
 * 3 핵심 함수:
 *   - updateMarkerStatus()       기존 marker의 status 전환 (idempotent)
 *   - appendDivergenceMarker()   신규 ABSENCE marker append (섹션 부재 시 신설)
 *   - recomputeDivergenceSummary() totalMarkers + bySeverity 재계산
 *
 * 정책 결정 (세션 275 사용자 결정):
 *   - severity 기본값: marker.severity (detector 산출) 그대로, 없으면 MEDIUM
 *   - recommendation 기본값: "TODO: manual review (auto-detected by F430 Sprint 263)"
 *   - PRESENCE 자동 입증은 본 writer scope 외 — 기존 OPEN markers의 status 전환만
 */
import type { BLDivergenceMarker } from "@ai-foundry/types";

const AUTO_DETECTED_HEADER_COMMENT = `# -----------------------------------------------------------------------------
# Divergence Markers — Source-First Reconciliation
# -----------------------------------------------------------------------------
# Auto-detected by F430 Sprint 263 (provenance-writer).
# Manual curation overrides — sourceReference detail은 추정값. 도메인 검토 필요.
# -----------------------------------------------------------------------------
`;

const TODO_RECOMMENDATION =
  "TODO: manual review (auto-detected by F430 Sprint 263 provenance-writer)";

type Severity = "HIGH" | "MEDIUM" | "LOW";

interface ParsedExistingMarker {
  ruleId: string;
  severity: Severity;
  status: "OPEN" | "RESOLVED";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findDivergenceMarkersStart(yamlText: string): number {
  const m = yamlText.match(/^divergenceMarkers:\s*$/m);
  return m?.index ?? -1;
}

function findDivergenceMarkersEnd(yamlText: string): number {
  const start = findDivergenceMarkersStart(yamlText);
  if (start < 0) return -1;

  const headerNewline = yamlText.indexOf("\n", start);
  if (headerNewline < 0) return yamlText.length;

  let cursor = headerNewline + 1;
  while (cursor < yamlText.length) {
    const lineEnd = yamlText.indexOf("\n", cursor);
    const line = yamlText.slice(cursor, lineEnd < 0 ? yamlText.length : lineEnd);

    if (line.trim() === "") {
      if (lineEnd < 0) return yamlText.length;
      cursor = lineEnd + 1;
      continue;
    }

    if (/^[a-zA-Z]/.test(line) || /^#/.test(line)) {
      return cursor;
    }

    if (lineEnd < 0) return yamlText.length;
    cursor = lineEnd + 1;
  }
  return yamlText.length;
}

export function renderDivergenceMarker(
  marker: BLDivergenceMarker,
  opts?: {
    ruleName?: string;
    severityOverride?: Severity;
    recommendation?: string;
  },
): string {
  const severity: Severity = opts?.severityOverride ?? marker.severity;
  const ruleName =
    opts?.ruleName ?? `${marker.ruleId} — auto-detected by ${marker.pattern}`;
  const recommendation = opts?.recommendation ?? TODO_RECOMMENDATION;
  const detailQuoted = JSON.stringify(marker.detail);
  const matchedQuoted =
    marker.matchedText !== undefined ? JSON.stringify(marker.matchedText) : null;

  const lines = [
    `  - marker: DIVERGENCE`,
    `    ruleId: ${marker.ruleId}`,
    `    ruleName: ${JSON.stringify(ruleName)}`,
    `    scope: business-rule`,
    `    severity: ${severity}`,
    `    pattern: ${marker.pattern}`,
    `    sourceReference:`,
    `      file: ${JSON.stringify(marker.sourceFile)}`,
    `      line: ${marker.sourceLine}`,
    `      detail: ${detailQuoted}`,
    ...(matchedQuoted !== null ? [`      matchedText: ${matchedQuoted}`] : []),
    `    confidence: ${marker.confidence}`,
    `    autoDetected: true`,
    `    detectedBy: "F430 Sprint 263 provenance-writer"`,
    `    status: OPEN`,
    `    recommendation: ${JSON.stringify(recommendation)}`,
  ];
  return lines.join("\n") + "\n";
}

export function updateMarkerStatus(
  yamlText: string,
  ruleId: string,
  newStatus: "OPEN" | "RESOLVED",
): { text: string; changed: boolean } {
  const dmStart = findDivergenceMarkersStart(yamlText);
  if (dmStart < 0) return { text: yamlText, changed: false };

  const dmEnd = findDivergenceMarkersEnd(yamlText);
  const before = yamlText.slice(0, dmStart);
  const section = yamlText.slice(dmStart, dmEnd);
  const after = yamlText.slice(dmEnd);

  const blockPattern = new RegExp(
    `(-\\s+marker:\\s+DIVERGENCE[\\s\\S]*?ruleId:\\s+${escapeRegex(ruleId)}\\b[\\s\\S]*?status:\\s+)(OPEN|RESOLVED)`,
    "m",
  );

  let changed = false;
  const newSection = section.replace(blockPattern, (full, prefix, curStatus) => {
    if (curStatus === newStatus) return full;
    changed = true;
    return `${prefix}${newStatus}`;
  });

  if (!changed) return { text: yamlText, changed: false };
  return { text: before + newSection + after, changed: true };
}

export function appendDivergenceMarker(
  yamlText: string,
  marker: BLDivergenceMarker,
  opts?: {
    ruleName?: string;
    severityOverride?: Severity;
    recommendation?: string;
  },
): { text: string; appended: boolean; reason?: string } {
  const existing = parseExistingMarkers(yamlText);
  if (existing.some((e) => e.ruleId === marker.ruleId)) {
    return { text: yamlText, appended: false, reason: "ruleId already present" };
  }

  const block = renderDivergenceMarker(marker, opts);
  const dmStart = findDivergenceMarkersStart(yamlText);

  if (dmStart < 0) {
    const summaryIdx = yamlText.search(/^divergenceSummary:/m);
    const insertAt = summaryIdx >= 0 ? summaryIdx : yamlText.length;
    const prefix = yamlText.slice(0, insertAt);
    const suffix = yamlText.slice(insertAt);
    const padBefore =
      prefix.length === 0 || prefix.endsWith("\n\n")
        ? ""
        : prefix.endsWith("\n")
          ? "\n"
          : "\n\n";
    const padAfter = suffix.length > 0 && !suffix.startsWith("\n") ? "\n" : "";
    return {
      text:
        prefix +
        padBefore +
        AUTO_DETECTED_HEADER_COMMENT +
        "divergenceMarkers:\n" +
        block +
        padAfter +
        suffix,
      appended: true,
    };
  }

  const dmEnd = findDivergenceMarkersEnd(yamlText);
  const before = yamlText.slice(0, dmEnd);
  const after = yamlText.slice(dmEnd);
  const padBefore = before.endsWith("\n") ? "" : "\n";
  return { text: before + padBefore + block + after, appended: true };
}

export function parseExistingMarkers(yamlText: string): ParsedExistingMarker[] {
  const dmStart = findDivergenceMarkersStart(yamlText);
  if (dmStart < 0) return [];

  const dmEnd = findDivergenceMarkersEnd(yamlText);
  const section = yamlText.slice(dmStart, dmEnd);

  const out: ParsedExistingMarker[] = [];
  const itemPattern = /-\s+marker:\s+DIVERGENCE\s+([\s\S]*?)(?=\n\s*-\s+marker:|$)/g;
  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(section)) !== null) {
    const block = match[1] ?? "";
    const ruleIdMatch = block.match(/ruleId:\s+(\S+)/);
    const sevMatch = block.match(/severity:\s+(HIGH|MEDIUM|LOW)/);
    const statusMatch = block.match(/status:\s+(OPEN|RESOLVED)/);
    if (!ruleIdMatch) continue;
    out.push({
      ruleId: ruleIdMatch[1] ?? "",
      severity: ((sevMatch?.[1] ?? "MEDIUM") as Severity),
      status: ((statusMatch?.[1] ?? "OPEN") as "OPEN" | "RESOLVED"),
    });
  }
  return out;
}

export function recomputeDivergenceSummary(yamlText: string): {
  text: string;
  changed: boolean;
} {
  const markers = parseExistingMarkers(yamlText);
  const total = markers.length;
  const bySev: Record<Severity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const m of markers) bySev[m.severity]++;

  const summaryStart = yamlText.search(/^divergenceSummary:/m);
  if (summaryStart < 0) {
    if (total === 0) return { text: yamlText, changed: false };
    const block =
      `\ndivergenceSummary:\n  totalMarkers: ${total}\n  bySeverity:\n` +
      `    HIGH: ${bySev.HIGH}\n    MEDIUM: ${bySev.MEDIUM}\n    LOW: ${bySev.LOW}\n`;
    const padBefore = yamlText.endsWith("\n") ? "" : "\n";
    return { text: yamlText + padBefore + block, changed: true };
  }

  const before = yamlText.slice(0, summaryStart);
  const sectionTail = yamlText.slice(summaryStart);
  const tailNextTopLevel = sectionTail.slice(1).search(/\n[a-zA-Z]/);
  const summaryEnd =
    tailNextTopLevel < 0
      ? yamlText.length
      : summaryStart + 1 + tailNextTopLevel + 1;
  const summaryBody = yamlText.slice(summaryStart, summaryEnd);
  const after = yamlText.slice(summaryEnd);

  let updated = summaryBody;
  let changed = false;
  const totalMatch = updated.match(/^(\s+totalMarkers:\s+)(\d+)/m);
  if (totalMatch) {
    const cur = Number(totalMatch[2]);
    if (cur !== total) {
      updated = updated.replace(/^(\s+totalMarkers:\s+)\d+/m, `$1${total}`);
      changed = true;
    }
  }
  for (const sev of ["HIGH", "MEDIUM", "LOW"] as const) {
    const re = new RegExp(`^(\\s+${sev}:\\s+)(\\d+)`, "m");
    const sevMatch = updated.match(re);
    if (sevMatch) {
      const cur = Number(sevMatch[2]);
      if (cur !== bySev[sev]) {
        updated = updated.replace(re, `$1${bySev[sev]}`);
        changed = true;
      }
    }
  }

  if (!changed) return { text: yamlText, changed: false };
  return { text: before + updated + after, changed: true };
}
