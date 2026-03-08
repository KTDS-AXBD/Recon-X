/**
 * Report sections & snapshots API client
 * AIF-REQ-011: Dynamic report content management
 *
 * Backend: svc-analytics /reports/* endpoints
 */

import type { ApiResponse } from "@ai-foundry/types";
import { buildHeaders } from "./headers";

const API_BASE =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

function headers(organizationId: string): Record<string, string> {
  return buildHeaders({ organizationId, contentType: "application/json" });
}

/* ─── Types ─── */

export interface ReportSection {
  sectionId: string;
  organizationId: string;
  sectionKey: string;
  title: string;
  subtitle: string | null;
  iconName: string | null;
  contentType: string;
  content: unknown;
  sortOrder: number;
  updatedAt: string;
  createdAt: string;
}

export interface SnapshotSummary {
  snapshotId: string;
  organizationId: string;
  version: string;
  title: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ReportSnapshot {
  snapshotId: string;
  organizationId: string;
  version: string;
  title: string | null;
  sectionsJson: unknown;
  metricsJson: unknown;
  notes: string | null;
  createdAt: string;
}

/* ─── API Functions ─── */

/** Fetch all report sections for an organization (live data) */
export async function fetchReportSections(
  organizationId: string,
): Promise<ApiResponse<{ organizationId: string; sections: ReportSection[] }>> {
  const params = new URLSearchParams({ organizationId });
  const res = await fetch(
    `${API_BASE}/reports/sections?${params.toString()}`,
    { headers: headers(organizationId) },
  );
  return res.json() as Promise<
    ApiResponse<{ organizationId: string; sections: ReportSection[] }>
  >;
}

/** List all snapshots (version summaries) for an organization */
export async function fetchReportSnapshots(
  organizationId: string,
): Promise<ApiResponse<{ organizationId: string; snapshots: SnapshotSummary[] }>> {
  const params = new URLSearchParams({ organizationId });
  const res = await fetch(
    `${API_BASE}/reports/snapshots?${params.toString()}`,
    { headers: headers(organizationId) },
  );
  return res.json() as Promise<
    ApiResponse<{ organizationId: string; snapshots: SnapshotSummary[] }>
  >;
}

/** Fetch a specific snapshot by version */
export async function fetchReportSnapshot(
  organizationId: string,
  version: string,
): Promise<ApiResponse<ReportSnapshot>> {
  const params = new URLSearchParams({ organizationId });
  const res = await fetch(
    `${API_BASE}/reports/snapshots/${encodeURIComponent(version)}?${params.toString()}`,
    { headers: headers(organizationId) },
  );
  return res.json() as Promise<ApiResponse<ReportSnapshot>>;
}

/** Create a versioned snapshot of the current report state */
export async function createReportSnapshot(
  organizationId: string,
  version: string,
  title?: string,
  notes?: string,
): Promise<ApiResponse<{ snapshotId: string; version: string }>> {
  const body: Record<string, string> = { organizationId, version };
  if (title !== undefined) body["title"] = title;
  if (notes !== undefined) body["notes"] = notes;

  const res = await fetch(`${API_BASE}/reports/snapshots`, {
    method: "POST",
    headers: headers(organizationId),
    body: JSON.stringify(body),
  });
  return res.json() as Promise<
    ApiResponse<{ snapshotId: string; version: string }>
  >;
}

/** Export report as Markdown (returns raw text) */
export async function exportReportMarkdown(
  organizationId: string,
  version?: string,
): Promise<string> {
  const params = new URLSearchParams({ organizationId });
  if (version !== undefined) params.set("version", version);

  const res = await fetch(
    `${API_BASE}/reports/export/markdown?${params.toString()}`,
    { headers: headers(organizationId) },
  );
  return res.text();
}
