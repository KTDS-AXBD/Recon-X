import { describe, it, expect, vi } from "vitest";
import { callSonnetLlm } from "./caller.js";
import type { LlmClientEnv } from "@ai-foundry/utils";

function mockEnv(content: string, ok = true): LlmClientEnv {
  const response = ok
    ? new Response(
        JSON.stringify({ success: true, data: { content } }),
        { status: 200 },
      )
    : new Response("Server Error", { status: 500 });

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

  return {
    LLM_ROUTER_URL: "http://test-llm-router",
    INTERNAL_API_SECRET: "secret",
  };
}

describe("callSonnetLlm", () => {
  it("returns content on successful response", async () => {
    const env = mockEnv("generated-doc");
    const result = await callSonnetLlm("sys", "user", env);
    expect(result).toBe("generated-doc");
  });

  it("sends sonnet tier in request", async () => {
    const env = mockEnv("ok");

    await callSonnetLlm("sys", "user", env);

    const fetchFn = globalThis.fetch as ReturnType<typeof vi.fn>;
    const [url, opts] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://test-llm-router/complete");
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body["tier"]).toBe("sonnet");
    expect(body["callerService"]).toBe("svc-skill");
    expect(body["maxTokens"]).toBe(2048);
  });

  it("throws on non-OK HTTP status", async () => {
    const env = mockEnv("", false);
    await expect(
      callSonnetLlm("sys", "user", env),
    ).rejects.toThrow("LLM Router error 500");
  });

  it("throws when API returns failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { message: "rate limited" } }),
        { status: 200 },
      ),
    ));
    const env: LlmClientEnv = {
      LLM_ROUTER_URL: "http://test-llm-router",
      INTERNAL_API_SECRET: "secret",
    };
    await expect(
      callSonnetLlm("sys", "user", env),
    ).rejects.toThrow("rate limited");
  });
});
