import { type Role, type Resource, type Action, RoleSchema, hasPermission } from "@ai-foundry/types";
import { forbidden } from "./response.js";

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
 * Uses local RBAC matrix (no network call).
 * Returns null if allowed, or a 403 Response if denied.
 */
export function checkPermission(
  role: Role,
  resource: Resource,
  action: Action,
): Response | null {
  if (!hasPermission(role, resource, action)) {
    return forbidden(`Role '${role}' cannot '${action}' on '${resource}'`);
  }
  return null;
}
