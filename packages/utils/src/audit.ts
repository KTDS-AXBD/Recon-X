/**
 * Lightweight audit logging — replaces svc-security audit endpoint.
 *
 * After MSA restructuring, audit logs are written as structured console output.
 * The external audit service (portal) will collect these via Cloudflare Logpush.
 */

export interface AuditEntry {
  userId: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an audit entry as structured JSON.
 * Non-blocking — designed to be used with ctx.waitUntil() or fire-and-forget.
 */
export function logAuditLocal(entry: AuditEntry): void {
  console.log(
    JSON.stringify({
      type: "audit",
      timestamp: new Date().toISOString(),
      ...entry,
    }),
  );
}
