import { describe, it, expect, vi, afterEach } from "vitest";
import { callOpusLlm } from "./caller.js";
import type { LlmClientEnv } from "@ai-foundry/utils";

function makeEnv(): LlmClientEnv {
  return {
    LLM_ROUTER_URL: "http://test-llm-router",
    INTERNAL_API_SECRET: "test-secret",
  };
}

describe("callOpusLlm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns content on successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { content: "test-content", provider: "anthropic", model: "opus" } }),
          { status: 200 },
        ),
      ),
    );

    const result = await callOpusLlm("system", "user", makeEnv());
    expect(result).toBe("test-content");
  });

  it("sends correct request to LLM_ROUTER_URL/complete", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { content: "ok", provider: "anthropic", model: "opus" } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchFn);

    await callOpusLlm("sys-prompt", "user-msg", makeEnv());

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, opts] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://test-llm-router/complete");
    expect(opts.method).toBe("POST");

    const headers = opts.headers as Record<string, string>;
    expect(headers["X-Internal-Secret"]).toBe("test-secret");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body["tier"]).toBe("opus");
    expect(body["system"]).toBe("sys-prompt");
    expect(body["callerService"]).toBe("svc-policy");
    expect(body["maxTokens"]).toBe(4096);
    expect(body["temperature"]).toBe(0.3);
  });

  it("throws on non-OK HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Bad Request", { status: 400 }),
      ),
    );

    await expect(
      callOpusLlm("sys", "user", makeEnv()),
    ).rejects.toThrow("LLM Router error 400: Bad Request");
  });

  it("throws when API returns success: false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { message: "quota exceeded" } }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      callOpusLlm("sys", "user", makeEnv()),
    ).rejects.toThrow("quota exceeded");
  });
});
