import { type Role, type Resource, type Action, RoleSchema } from "@ai-foundry/types";
import { forbidden } from "./response.js";

export interface RbacEnv {
  SECURITY: Fetcher;
  INTERNAL_API_SECRET: string;
}

export interface RbacContext {
  userId: string;
  role: Role;
  organizationId: string;
}

/**
 * Extract RBAC context from request headers.
 * Returns null if headers are missing (caller should skip RBAC check).
 */
export function extractRbacContext(request: Request): RbacContext | null {
  const userId = request.headers.get("X-User-Id");
  const roleRaw = request.headers.get("X-User-Role");
  const organizationId = request.headers.get("X-Organization-Id");

  if (!userId || !roleRaw || !organizationId) {
    return null;
  }

  const parsed = RoleSchema.safeParse(roleRaw);
  if (!parsed.success) {
    return null;
  }

  return { userId, role: parsed.data, organizationId };
}

/**
 * Check if the given role has permission for the resource/action.
 * Calls svc-security's POST /rbac/check via service binding.
 * Returns null if allowed, or a 403 Response if denied.
 */
export async function checkPermission(
  env: RbacEnv,
  role: Role,
  resource: Resource,
  action: Action,
): Promise<Response | null> {
  const res = await env.SECURITY.fetch("https://svc-security/rbac/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": env.INTERNAL_API_SECRET,
    },
    body: JSON.stringify({ role, resource, action }),
  });

  if (!res.ok) {
    return forbidden("Permission check failed");
  }

  const body = (await res.json()) as {
    success: boolean;
    data?: { allowed: boolean };
  };
  if (!body.success || !body.data?.allowed) {
    return forbidden(`Role '${role}' cannot '${action}' on '${resource}'`);
  }

  return null; // allowed
}

/**
 * Log an action to the audit trail via svc-security.
 * Non-blocking — designed to be used with ctx.waitUntil().
 */
export async function logAudit(
  env: RbacEnv,
  entry: {
    userId: string;
    organizationId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  },
): Promise<void> {
  await env.SECURITY.fetch("https://svc-security/audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": env.INTERNAL_API_SECRET,
    },
    body: JSON.stringify(entry),
  });
}
