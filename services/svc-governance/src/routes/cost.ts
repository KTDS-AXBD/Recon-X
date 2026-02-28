import { ok } from "@ai-foundry/utils";
import type { Env } from "../env.js";

/** GET /cost — cost monitoring summary (stub) */
export async function handleGetCost(
  _request: Request,
  _env: Env,
): Promise<Response> {
  // TODO: Implement real cost aggregation via service binding to svc-llm-router
  // or cross-DB query to db-llm once service bindings support D1 forwarding.
  // Current stub returns zeroed summary for API contract compliance.
  return ok({
    totalRequests: 0,
    totalTokens: 0,
    estimatedCost: 0,
    byTier: {},
    byService: {},
    period: "last-24h",
  });
}
