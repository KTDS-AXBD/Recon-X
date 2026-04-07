/**
 * LLM Router caller — HTTP REST to external svc-llm-router.
 * Uses Opus tier for Stage 3 policy inference.
 */

import { callLlmRouter, type LlmClientEnv } from "@ai-foundry/utils";

export async function callOpusLlm(
  system: string,
  userContent: string,
  env: LlmClientEnv,
): Promise<string> {
  return callLlmRouter(env, "svc-policy", "opus", userContent, {
    system,
    maxTokens: 4096,
    temperature: 0.3,
  });
}
