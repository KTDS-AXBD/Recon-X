import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleWriteAudit, handleQueryAudit } from "../routes/audit.js";
import type { Env } from "../env.js";

// ── Helpers ──────────────────────────────────────────────────────

function mockDb(overrides?: {
  allResults?: Record<string, unknown>[];
}) {
  const rowCount = overrides?.allResults?.length ?? 0;
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({
          results: overrides?.allResults ?? [],
        }),
        first: vi.fn().mockResolvedValue({ cnt: rowCount }),
      }),
    }),
  } as unknown as D1Database;
}

function mockEnv(dbOverrides?: Parameters<typeof mockDb>[0]): Env {
  return {
    DB_SECURITY: mockDb(dbOverrides),
    ENVIRONMENT: "development",
    SERVICE_NAME: "svc-security",
    INTERNAL_API_SECRET: "test-secret",
    JWT_SECRET: "jwt-test-secret",
  };
}

function mockCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

function createWriteRequest(body: unknown): Request {
  return new Request("https://test.internal/audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": "test-secret",
    },
    body: JSON.stringify(body),
  });
}

function createQueryRequest(params: Record<string, string> = {}): Request {
  const url = new URL("https://test.internal/audit");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), {
    method: "GET",
    headers: { "X-Internal-Secret": "test-secret" },
  });
}

// ── handleWriteAudit ────────────────────────────────────────────

describe("handleWriteAudit", () => {
  let env: Env;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = mockEnv();
    ctx = mockCtx();
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("https://test.internal/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json!",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain("Invalid JSON body");
  });

  it("returns 400 when userId is missing", async () => {
    const req = createWriteRequest({
      organizationId: "org-1",
      action: "read",
      resource: "document",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when organizationId is missing", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      action: "read",
      resource: "document",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is missing", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      resource: "document",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when resource is missing", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      action: "read",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 201 with auditId and occurredAt for valid entry", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      action: "read",
      resource: "document",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { auditId: string; occurredAt: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.auditId).toBeDefined();
    expect(typeof body.data.auditId).toBe("string");
    expect(body.data.occurredAt).toBeDefined();
    // ISO date format check
    expect(body.data.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("calls ctx.waitUntil to write audit asynchronously", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      action: "upload",
      resource: "document",
    });
    await handleWriteAudit(req, env, ctx);
    expect(ctx.waitUntil).toHaveBeenCalledOnce();
    // The argument should be a Promise
    const waitUntilCall = (ctx.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(waitUntilCall?.[0]).toBeInstanceOf(Promise);
  });

  it("accepts optional resourceId field", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      action: "read",
      resource: "document",
      resourceId: "doc-42",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(201);
  });

  it("accepts optional details field", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      action: "update",
      resource: "policy",
      details: { previousStatus: "draft", newStatus: "reviewed" },
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(201);
  });

  it("accepts optional ipAddress field", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      action: "read",
      resource: "document",
      ipAddress: "10.0.0.1",
    });
    const res = await handleWriteAudit(req, env, ctx);
    expect(res.status).toBe(201);
  });

  it("the async D1 write uses correct INSERT INTO audit_log", async () => {
    const req = createWriteRequest({
      userId: "user-1",
      organizationId: "org-1",
      action: "delete",
      resource: "document",
      resourceId: "doc-99",
      details: { reason: "expired" },
      ipAddress: "192.168.1.1",
    });
    await handleWriteAudit(req, env, ctx);

    // Resolve the waitUntil promise to trigger the actual DB write
    const waitUntilFn = ctx.waitUntil as ReturnType<typeof vi.fn>;
    const promise = waitUntilFn.mock.calls[0]?.[0] as Promise<void>;
    await promise;

    expect(env.DB_SECURITY.prepare).toHaveBeenCalledOnce();
    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("INSERT INTO audit_log");
    expect(sql).toContain("audit_id");
    expect(sql).toContain("user_id");
  });
});

// ── handleQueryAudit ────────────────────────────────────────────

describe("handleQueryAudit", () => {
  it("returns 200 with items and pagination for valid query", async () => {
    const env = mockEnv({ allResults: [] });
    const req = createQueryRequest();
    const res = await handleQueryAudit(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        items: unknown[];
        pagination: { page: number; limit: number; total: number };
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.items).toEqual([]);
    expect(body.data.pagination).toBeDefined();
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
  });

  it("returns results from D1", async () => {
    const mockRows = [
      { audit_id: "a-1", user_id: "user-1", action: "read", resource: "document" },
      { audit_id: "a-2", user_id: "user-2", action: "upload", resource: "document" },
    ];
    const env = mockEnv({ allResults: mockRows });
    const req = createQueryRequest();
    const res = await handleQueryAudit(req, env);
    const body = (await res.json()) as {
      data: { items: typeof mockRows; pagination: { total: number } };
    };
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0]?.audit_id).toBe("a-1");
    expect(body.data.pagination.total).toBe(2);
  });

  it("passes userId filter to SQL query", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ userId: "user-42" });
    await handleQueryAudit(req, env);

    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("user_id = ?");
  });

  it("passes organizationId filter to SQL query", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ organizationId: "org-100" });
    await handleQueryAudit(req, env);

    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("organization_id = ?");
  });

  it("passes resource filter to SQL query", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ resource: "policy" });
    await handleQueryAudit(req, env);

    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("resource = ?");
  });

  it("passes date range filters to SQL query", async () => {
    const env = mockEnv();
    const req = createQueryRequest({
      fromDate: "2026-01-01T00:00:00Z",
      toDate: "2026-12-31T23:59:59Z",
    });
    await handleQueryAudit(req, env);

    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("occurred_at >= ?");
    expect(sql).toContain("occurred_at <= ?");
  });

  it("respects custom limit parameter", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ limit: "50" });
    await handleQueryAudit(req, env);

    // calls[0] = COUNT query, calls[1] = SELECT with LIMIT/OFFSET
    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[1];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("LIMIT ? OFFSET ?");
  });

  it("respects custom offset parameter", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ limit: "10", offset: "30" });
    const res = await handleQueryAudit(req, env);

    // Pagination should show page 4 (offset 30 / limit 10 + 1)
    const body = (await res.json()) as {
      data: { pagination: { page: number; limit: number } };
    };
    expect(body.data.pagination.page).toBe(4);
    expect(body.data.pagination.limit).toBe(10);
  });

  it("returns 400 for limit exceeding 100", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ limit: "200" });
    const res = await handleQueryAudit(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for limit of 0", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ limit: "0" });
    const res = await handleQueryAudit(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative offset", async () => {
    const env = mockEnv();
    const req = createQueryRequest({ offset: "-1" });
    const res = await handleQueryAudit(req, env);
    expect(res.status).toBe(400);
  });

  it("uses ORDER BY occurred_at DESC in query", async () => {
    const env = mockEnv();
    const req = createQueryRequest();
    await handleQueryAudit(req, env);

    // calls[0] = COUNT query, calls[1] = SELECT with ORDER BY
    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[1];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("ORDER BY occurred_at DESC");
  });

  it("combines multiple filters correctly", async () => {
    const env = mockEnv();
    const req = createQueryRequest({
      userId: "user-1",
      resource: "document",
      fromDate: "2026-01-01",
    });
    await handleQueryAudit(req, env);

    const prepareCall = (env.DB_SECURITY.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
    const sql = prepareCall?.[0] as string;
    expect(sql).toContain("user_id = ?");
    expect(sql).toContain("resource = ?");
    expect(sql).toContain("occurred_at >= ?");
  });
});
