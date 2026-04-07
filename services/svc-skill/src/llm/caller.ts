/**
 * LLM Router caller — HTTP REST to external svc-llm-router.
 * Uses Sonnet tier for Stage 5 skill description generation.
 */

import { callLlmRouter, type LlmClientEnv } from "@ai-foundry/utils";

export async function callSonnetLlm(
  system: string,
  userContent: string,
  env: LlmClientEnv,
): Promise<string> {
  return callLlmRouter(env, "svc-skill", "sonnet", userContent, {
    system,
    maxTokens: 2048,
    temperature: 0.3,
  });
}
