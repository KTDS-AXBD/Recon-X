import type { ApiResponse } from "@ai-foundry/types";
import { buildHeaders } from "./headers";
import { getAuthUser } from "./auth-store";

const API_BASE =
  (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

function headers(organizationId: string): Record<string, string> {
  return buildHeaders({ organizationId, contentType: "application/json" });
}

export interface Notification {
  notificationId: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  metadata: unknown | null;
  channel: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
}

export async function fetchNotifications(
  organizationId: string,
  userId?: string,
): Promise<ApiResponse<{ notifications: Notification[]; limit: number; offset: number }>> {
  const effectiveUserId = userId ?? getAuthUser()?.userId ?? "anonymous";
  const res = await fetch(
    `${API_BASE}/notifications?userId=${encodeURIComponent(effectiveUserId)}`,
    { headers: headers(organizationId) },
  );
  return res.json() as Promise<ApiResponse<{ notifications: Notification[]; limit: number; offset: number }>>;
}

export async function markNotificationRead(
  organizationId: string,
  notificationId: string,
): Promise<ApiResponse<{ updated: boolean }>> {
  const res = await fetch(
    `${API_BASE}/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH", headers: headers(organizationId) },
  );
  return res.json() as Promise<ApiResponse<{ updated: boolean }>>;
}
