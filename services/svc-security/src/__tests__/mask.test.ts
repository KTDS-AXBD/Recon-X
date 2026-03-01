import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMask } from "../routes/mask.js";
import type { Env } from "../env.js";

// ── Helpers ──────────────────────────────────────────────────────

function mockDb() {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        first: vi.fn().mockResolvedValue(null),
      }),
    }),
    batch: vi.fn().mockResolvedValue([]),
  } as unknown as D1Database;
}

function mockEnv(): Env {
  return {
    DB_SECURITY: mockDb(),
    ENVIRONMENT: "development",
    SERVICE_NAME: "svc-security",
    INTERNAL_API_SECRET: "test-secret",
    JWT_SECRET: "jwt-test-secret",
  };
}

function createMaskRequest(body: unknown): Request {
  return new Request("https://test.internal/mask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": "test-secret",
    },
    body: JSON.stringify(body),
  });
}

// ── handleMask ──────────────────────────────────────────────────

describe("handleMask", () => {
  let env: Env;

  beforeEach(() => {
    env = mockEnv();
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("https://test.internal/mask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json{{{",
    });
    const res = await handleMask(req, env);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain("Invalid JSON body");
  });

  it("returns 400 when documentId is missing", async () => {
    const req = createMaskRequest({ text: "hello", dataClassification: "internal" });
    const res = await handleMask(req, env);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when text is missing", async () => {
    const req = createMaskRequest({ documentId: "doc-1", dataClassification: "internal" });
    const res = await handleMask(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is empty string", async () => {
    const req = createMaskRequest({ documentId: "doc-1", text: "", dataClassification: "internal" });
    const res = await handleMask(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid dataClassification value", async () => {
    const req = createMaskRequest({
      documentId: "doc-1",
      text: "some text",
      dataClassification: "top-secret",
    });
    const res = await handleMask(req, env);
    expect(res.status).toBe(400);
  });

  it("masks PII in 'internal' text and returns 200", async () => {
    const req = createMaskRequest({
      documentId: "doc-1",
      text: "주민번호: 901231-1234567 입니다.",
      dataClassification: "internal",
    });
    const res = await handleMask(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { documentId: string; maskedText: string; tokenCount: number; tokens: unknown[]; dataClassification: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.documentId).toBe("doc-1");
    expect(body.data.maskedText).not.toContain("901231-1234567");
    expect(body.data.maskedText).toContain("[PII:SSN:");
    expect(body.data.tokenCount).toBe(1);
    expect(body.data.tokens).toHaveLength(1);
    expect(body.data.dataClassification).toBe("internal");
  });

  it("passes through 'public' text without masking", async () => {
    const req = createMaskRequest({
      documentId: "doc-pub",
      text: "주민번호: 901231-1234567",
      dataClassification: "public",
    });
    const res = await handleMask(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { maskedText: string; tokenCount: number; tokens: unknown[] };
    };
    expect(body.data.maskedText).toBe("주민번호: 901231-1234567");
    expect(body.data.tokenCount).toBe(0);
    expect(body.data.tokens).toHaveLength(0);
  });

  it("masks PII in 'confidential' text", async () => {
    const req = createMaskRequest({
      documentId: "doc-conf",
      text: "이메일: admin@corp.com",
      dataClassification: "confidential",
    });
    const res = await handleMask(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { maskedText: string; tokenCount: number; dataClassification: string };
    };
    expect(body.data.maskedText).not.toContain("admin@corp.com");
    expect(body.data.tokenCount).toBe(1);
    expect(body.data.dataClassification).toBe("confidential");
  });

  it("defaults dataClassification to 'internal' when not provided", async () => {
    const req = createMaskRequest({
      documentId: "doc-default",
      text: "010-1234-5678 번호입니다.",
    });
    const res = await handleMask(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { dataClassification: string; tokenCount: number };
    };
    expect(body.data.dataClassification).toBe("internal");
    expect(body.data.tokenCount).toBe(1);
  });

  it("stores tokens in D1 for internal classification with PII", async () => {
    const req = createMaskRequest({
      documentId: "doc-db",
      text: "901231-1234567",
      dataClassification: "internal",
    });
    await handleMask(req, env);
    expect(env.DB_SECURITY.batch).toHaveBeenCalledOnce();
  });

  it("does not call D1 batch for text with no PII", async () => {
    const req = createMaskRequest({
      documentId: "doc-nopii",
      text: "개인정보가 없는 일반 텍스트입니다.",
      dataClassification: "internal",
    });
    await handleMask(req, env);
    expect(env.DB_SECURITY.batch).not.toHaveBeenCalled();
  });

  it("handles text with multiple PII types", async () => {
    const req = createMaskRequest({
      documentId: "doc-multi",
      text: "주민번호: 901231-1234567, 이메일: user@test.com, 전화: 010-8888-7777",
      dataClassification: "internal",
    });
    const res = await handleMask(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { tokenCount: number; maskedText: string };
    };
    expect(body.data.tokenCount).toBeGreaterThanOrEqual(3);
    expect(body.data.maskedText).not.toContain("901231-1234567");
    expect(body.data.maskedText).not.toContain("user@test.com");
    expect(body.data.maskedText).not.toContain("010-8888-7777");
  });
});
