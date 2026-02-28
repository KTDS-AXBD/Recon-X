import { CreatePromptVersionSchema } from "@ai-foundry/types";
import type { PromptVersionRecord } from "@ai-foundry/types";
import { ok, created, badRequest, notFound, createLogger } from "@ai-foundry/utils";
import type { Env } from "../env.js";

const logger = createLogger("svc-governance:prompts");

/** POST /prompts — register a new prompt version */
export async function handleCreatePrompt(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = CreatePromptVersionSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const { promptName, version, stage, content, rolloutPct, createdBy } = parsed.data;
  const promptVersionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await env.DB_GOVERNANCE.prepare(
    `INSERT INTO prompt_versions
      (prompt_version_id, prompt_name, version, stage, content, rollout_pct, is_active, golden_test_passed, created_by, created_at, activated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, NULL)`,
  )
    .bind(promptVersionId, promptName, version, stage, content, rolloutPct, createdBy, createdAt)
    .run();

  const record: PromptVersionRecord = {
    promptVersionId,
    promptName,
    version,
    stage,
    content,
    rolloutPct,
    isActive: false,
    goldenTestPassed: false,
    createdBy,
    createdAt,
    activatedAt: null,
  };

  // Cache in KV (non-blocking)
  ctx.waitUntil(
    Promise.all([
      env.KV_PROMPTS.put(`prompt:${promptName}:${version}`, JSON.stringify(record)),
      env.KV_PROMPTS.put(`prompt-id:${promptVersionId}`, JSON.stringify(record)),
    ]),
  );

  logger.info("Prompt version created", { promptVersionId, promptName, version, stage });

  return created(record);
}

/** GET /prompts — list prompt versions with optional filters */
export async function handleListPrompts(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  const active = url.searchParams.get("active");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

  let query = "SELECT * FROM prompt_versions WHERE 1=1";
  const bindings: (string | number)[] = [];

  if (name) {
    query += " AND prompt_name = ?";
    bindings.push(name);
  }
  if (active === "true") {
    query += " AND is_active = 1";
  } else if (active === "false") {
    query += " AND is_active = 0";
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  bindings.push(limit, offset);

  const result = await env.DB_GOVERNANCE.prepare(query).bind(...bindings).all();

  const items = (result.results ?? []).map(toPromptVersionRecord);

  return ok({ items, limit, offset, total: items.length });
}

/** GET /prompts/:id — get a specific prompt version */
export async function handleGetPrompt(
  _request: Request,
  env: Env,
  promptVersionId: string,
): Promise<Response> {
  // Try KV cache first
  const cached = await env.KV_PROMPTS.get(`prompt-id:${promptVersionId}`);
  if (cached) {
    const record = JSON.parse(cached) as PromptVersionRecord;
    return ok(record);
  }

  // Fallback to DB
  const row = await env.DB_GOVERNANCE.prepare(
    "SELECT * FROM prompt_versions WHERE prompt_version_id = ?",
  )
    .bind(promptVersionId)
    .first();

  if (!row) {
    return notFound("PromptVersion", promptVersionId);
  }

  return ok(toPromptVersionRecord(row));
}

/** Map a D1 row (snake_case) to PromptVersionRecord (camelCase) */
function toPromptVersionRecord(row: Record<string, unknown>): PromptVersionRecord {
  return {
    promptVersionId: row["prompt_version_id"] as string,
    promptName: row["prompt_name"] as string,
    version: row["version"] as string,
    stage: row["stage"] as string,
    content: row["content"] as string,
    rolloutPct: row["rollout_pct"] as number,
    isActive: (row["is_active"] as number) === 1,
    goldenTestPassed: (row["golden_test_passed"] as number) === 1,
    createdBy: row["created_by"] as string,
    createdAt: row["created_at"] as string,
    activatedAt: (row["activated_at"] as string) ?? null,
  };
}
