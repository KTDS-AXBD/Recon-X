/**
 * Spec Document routes — B/T/Q Spec 문서 생성 API
 *
 * GET /skills/:id/spec/:type  — Skill 단위 Spec 생성
 *   type = business | technical | quality | all
 *   ?format=json|markdown (default: json)
 *   ?llm=true|false (default: true)
 */
import { ok, badRequest, notFound, createLogger } from "@ai-foundry/utils";
import type { Env } from "../env.js";
import { generateSpec, generateAllSpecs, type SpecType } from "../spec-gen/index.js";
import { renderSpecToMarkdown } from "../spec-gen/markdown-renderer.js";

const logger = createLogger("svc-skill:spec");

const VALID_TYPES = new Set<string>(["business", "technical", "quality", "all"]);

export async function handleSkillSpec(
  request: Request,
  env: Env,
  skillId: string,
  type: string,
): Promise<Response> {
  if (!VALID_TYPES.has(type)) {
    return badRequest(`Invalid spec type: ${type}. Must be one of: business, technical, quality, all`);
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const useLlm = url.searchParams.get("llm") !== "false";

  logger.info("Generating spec", { skillId, type, format, useLlm });

  if (type === "all") {
    const docs = await generateAllSpecs(env, skillId, { useLlm });
    if (!docs) {
      return notFound("Skill not found or no data available");
    }

    if (format === "markdown") {
      const md = docs.map((d) => renderSpecToMarkdown(d)).join("\n\n===\n\n");
      return new Response(md, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${skillId}-all-spec.md"`,
        },
      });
    }

    return ok({ skillId, specs: docs });
  }

  const doc = await generateSpec(env, skillId, type as SpecType, { useLlm });
  if (!doc) {
    return notFound("Skill not found or no data available");
  }

  if (format === "markdown") {
    const md = renderSpecToMarkdown(doc);
    return new Response(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${skillId}-${type}-spec.md"`,
      },
    });
  }

  return ok(doc);
}
