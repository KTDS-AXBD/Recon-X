import { describe, it, expect, vi } from "vitest";
import { extractRbacContext, checkPermission } from "../rbac.js";
import { logAuditLocal } from "../audit.js";

// ── extractRbacContext ──────────────────────────────────────────

describe("extractRbacContext", () => {
  function reqWith(headers: Record<string, string>): Request {
    return new Request("https://test.internal/api", { headers });
  }

  it("returns context when all headers are present with valid role", () => {
    const ctx = extractRbacContext(
      reqWith({
        "X-User-Id": "user-1",
        "X-User-Role": "Analyst",
        "X-Organization-Id": "org-1",
      }),
    );
    expect(ctx).toEqual({
      userId: "user-1",
      role: "Analyst",
      organizationId: "org-1",
    });
  });

  it("returns null when X-User-Id is missing", () => {
    const ctx = extractRbacContext(
      reqWith({ "X-User-Role": "Analyst", "X-Organization-Id": "org-1" }),
    );
    expect(ctx).toBeNull();
  });

  it("returns null when X-User-Role is missing", () => {
    const ctx = extractRbacContext(
      reqWith({ "X-User-Id": "user-1", "X-Organization-Id": "org-1" }),
    );
    expect(ctx).toBeNull();
  });

  it("returns null when X-Organization-Id is missing", () => {
    const ctx = extractRbacContext(
      reqWith({ "X-User-Id": "user-1", "X-User-Role": "Analyst" }),
    );
    expect(ctx).toBeNull();
  });

  it("returns null when role is invalid", () => {
    const ctx = extractRbacContext(
      reqWith({
        "X-User-Id": "user-1",
        "X-User-Role": "SuperAdmin",
        "X-Organization-Id": "org-1",
      }),
    );
    expect(ctx).toBeNull();
  });

  it("accepts all valid roles", () => {
    const roles = ["Analyst", "Reviewer", "Developer", "Client", "Executive", "Admin"];
    for (const role of roles) {
      const ctx = extractRbacContext(
        reqWith({
          "X-User-Id": "user-1",
          "X-User-Role": role,
          "X-Organization-Id": "org-1",
        }),
      );
      expect(ctx).not.toBeNull();
      expect(ctx?.role).toBe(role);
    }
  });

  it("returns null when no headers are present", () => {
    const ctx = extractRbacContext(new Request("https://test.internal/api"));
    expect(ctx).toBeNull();
  });
});

// ── checkPermission (local) ────────────────────────────────────

describe("checkPermission", () => {
  it("returns null (allowed) when role has permission", () => {
    const result = checkPermission("Analyst", "document", "read");
    expect(result).toBeNull();
  });

  it("returns 403 when role lacks permission", () => {
    const result = checkPermission("Client", "document", "delete");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows Admin all actions", () => {
    const result = checkPermission("Admin", "document", "delete");
    expect(result).toBeNull();
  });

  it("allows Reviewer to approve policies", () => {
    const result = checkPermission("Reviewer", "policy", "approve");
    expect(result).toBeNull();
  });

  it("denies Analyst from deleting documents", () => {
    const result = checkPermission("Analyst", "document", "delete");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

// ── logAuditLocal ──────────────────────────────────────────────

describe("logAuditLocal", () => {
  it("logs audit entry as JSON to console", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logAuditLocal({
      userId: "user-1",
      organizationId: "org-1",
      action: "upload",
      resource: "document",
      resourceId: "doc-123",
      details: { fileName: "test.pdf" },
    });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(consoleSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(logged["type"]).toBe("audit");
    expect(logged["userId"]).toBe("user-1");
    expect(logged["action"]).toBe("upload");
    expect(logged["resource"]).toBe("document");
    expect(logged["timestamp"]).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("logs without optional fields", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logAuditLocal({
      userId: "user-1",
      organizationId: "org-1",
      action: "read",
      resource: "analytics",
    });

    const logged = JSON.parse(consoleSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(logged["resourceId"]).toBeUndefined();
    expect(logged["details"]).toBeUndefined();

    consoleSpy.mockRestore();
  });
});
