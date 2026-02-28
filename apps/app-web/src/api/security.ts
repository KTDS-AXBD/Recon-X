import type { ApiResponse } from "@ai-foundry/types";

const API_BASE =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

const HEADERS = {
  "Content-Type": "application/json",
  "X-Internal-Secret":
    (import.meta.env["VITE_INTERNAL_SECRET"] as string | undefined) ??
    "dev-secret",
  "X-User-Id": "client-001",
  "X-User-Role": "Client",
  "X-Organization-Id": "org-001",
};

export interface AuditRow {
  audit_id: string;
  user_id: string;
  organization_id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  occurred_at: string;
}

export async function fetchAuditLogs(params?: {
  userId?: string;
  resource?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<
  ApiResponse<{
    items: AuditRow[];
    pagination: { page: number; limit: number; total: number };
  }>
> {
  const qs = new URLSearchParams();
  if (params !== undefined) {
    if (params.userId !== undefined) qs.set("userId", params.userId);
    if (params.resource !== undefined) qs.set("resource", params.resource);
    if (params.fromDate !== undefined) qs.set("fromDate", params.fromDate);
    if (params.toDate !== undefined) qs.set("toDate", params.toDate);
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
  }
  const query = qs.toString();
  const res = await fetch(
    `${API_BASE}/audit${query ? `?${query}` : ""}`,
    { headers: HEADERS },
  );
  return res.json() as Promise<
    ApiResponse<{
      items: AuditRow[];
      pagination: { page: number; limit: number; total: number };
    }>
  >;
}
