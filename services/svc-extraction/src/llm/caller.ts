/**
 * LLM Router caller — HTTP REST to external svc-llm-router.
 */

import type { LlmProvider } from "@ai-foundry/types";
import { callLlmRouter, callLlmRouterWithMeta, type LlmCallResult, type LlmClientEnv } from "@ai-foundry/utils";

export type { LlmCallResult };

export interface LlmCallOptions {
  provider?: LlmProvider;
}

export async function callLlm(
  prompt: string,
  tier: "sonnet" | "haiku",
  env: LlmClientEnv,
  maxTokens = 8192,
  options?: LlmCallOptions,
): Promise<string> {
  const routerOpts: Parameters<typeof callLlmRouter>[4] = { maxTokens };
  if (options?.provider) routerOpts.provider = options.provider;
  return callLlmRouter(env, "svc-extraction", tier, prompt, routerOpts);
}

export async function callLlmWithMeta(
  prompt: string,
  tier: "sonnet" | "haiku",
  env: LlmClientEnv,
  maxTokens = 8192,
  options?: LlmCallOptions,
): Promise<LlmCallResult> {
  const routerOpts: Parameters<typeof callLlmRouterWithMeta>[4] = { maxTokens };
  if (options?.provider) routerOpts.provider = options.provider;
  return callLlmRouterWithMeta(env, "svc-extraction", tier, prompt, routerOpts);
}
