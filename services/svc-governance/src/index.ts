/**
 * svc-governance — SVC-08
 * Governance: Prompt Registry, cost monitoring, trust dashboard
 */

import { createLogger, unauthorized, verifyInternalSecret, errFromUnknown, extractRbacContext, checkPermission, logAudit } from "@ai-foundry/utils";
import type { ExportedHandler } from "@cloudflare/workers-types";
import type { Env } from "./env.js";
import { handleCreatePrompt, handleListPrompts, handleGetPrompt } from "./routes/prompts.js";
import { handleGetCost } from "./routes/cost.js";
import { handleGetTrust, handleCreateTrustEvaluation } from "./routes/trust.js";
import { handleGetGoldenTests } from "./routes/golden-tests.js";
import { handleCreateQualityEvaluation, handleListQualityEvaluations, handleQualityEvaluationsSummary } from "./routes/quality-evaluations.js";
import { handleAutoEvaluate, handleListPipelineEvaluations, handlePipelineEvaluationsSummary } from "./routes/pipeline-evaluations.js";
import { handleChat } from "./routes/chat.js";
import { PipelineEventSchema, SkillPackageSchema } from "@ai-foundry/types";
import { runAutoEvaluate } from "./evaluators/index.js";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = createLogger("svc-governance");
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Health check — no auth required
    if (method === "GET" && path === "/health") {
      return new Response(
        JSON.stringify({
          service: env.SERVICE_NAME,
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // All other routes require inter-service secret
    if (!verifyInternalSecret(request, env.INTERNAL_API_SECRET)) {
      logger.warn("Unauthorized request", { path, method });
      return unauthorized("Missing or invalid X-Internal-Secret");
    }

    try {
      // Prompt Registry
      if (method === "POST" && path === "/prompts") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "create");
          if (denied) return denied;
          ctx.waitUntil(logAudit(env, {
            userId: rbacCtx.userId,
            organizationId: rbacCtx.organizationId,
            action: "create",
            resource: "governance",
          }));
        }
        return await handleCreatePrompt(request, env, ctx);
      }
      if (method === "GET" && path === "/prompts") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handleListPrompts(request, env);
      }
      const promptMatch = path.match(/^\/prompts\/([^/]+)$/);
      if (method === "GET" && promptMatch) {
        const id = promptMatch[1];
        if (!id) return new Response("Not Found", { status: 404 });
        return await handleGetPrompt(request, env, id);
      }

      // Cost monitoring
      if (method === "GET" && path === "/cost") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handleGetCost(request, env);
      }

      // Golden test history
      if (method === "GET" && path === "/golden-tests") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handleGetGoldenTests(request, env);
      }

      // Trust dashboard
      if (method === "GET" && path === "/trust") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handleGetTrust(request, env);
      }
      if (method === "POST" && path === "/trust") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "create");
          if (denied) return denied;
          ctx.waitUntil(logAudit(env, {
            userId: rbacCtx.userId,
            organizationId: rbacCtx.organizationId,
            action: "create",
            resource: "governance",
          }));
        }
        return await handleCreateTrustEvaluation(request, env);
      }

      // Quality Evaluations
      if (method === "GET" && path === "/quality-evaluations/summary") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handleQualityEvaluationsSummary(request, env);
      }
      if (method === "GET" && path === "/quality-evaluations") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handleListQualityEvaluations(request, env);
      }
      if (method === "POST" && path === "/quality-evaluations") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "create");
          if (denied) return denied;
          ctx.waitUntil(logAudit(env, {
            userId: rbacCtx.userId,
            organizationId: rbacCtx.organizationId,
            action: "create",
            resource: "governance",
          }));
        }
        return await handleCreateQualityEvaluation(request, env);
      }

      // Pipeline Evaluations (3-Stage Auto Eval)
      if (method === "POST" && path === "/pipeline-evaluations/auto") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "create");
          if (denied) return denied;
          ctx.waitUntil(logAudit(env, {
            userId: rbacCtx.userId,
            organizationId: rbacCtx.organizationId,
            action: "create",
            resource: "governance",
          }));
        }
        return await handleAutoEvaluate(request, env, ctx);
      }
      if (method === "GET" && path === "/pipeline-evaluations/summary") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handlePipelineEvaluationsSummary(request, env);
      }
      if (method === "GET" && path === "/pipeline-evaluations") {
        const rbacCtx = extractRbacContext(request);
        if (rbacCtx) {
          const denied = await checkPermission(env, rbacCtx.role, "governance", "read");
          if (denied) return denied;
        }
        return await handleListPipelineEvaluations(request, env);
      }

      // Internal queue event handler (from svc-queue-router)
      if (method === "POST" && path === "/internal/queue-event") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = PipelineEventSchema.safeParse(body);
        if (!parsed.success) {
          logger.warn("Invalid queue event", { error: parsed.error.message });
          return new Response(JSON.stringify({ success: true, skipped: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        const event = parsed.data;
        if (event.type === "skill.packaged") {
          const { skillId, organizationId } = event.payload;
          logger.info("Auto-evaluate triggered by skill.packaged", { skillId, organizationId });
          // Fetch skill package from SVC_SKILL
          try {
            const resp = await env.SVC_SKILL.fetch(
              `https://svc-skill.internal/skills/${skillId}`,
              {
                headers: {
                  "X-Internal-Secret": env.INTERNAL_API_SECRET,
                  "X-Organization-Id": organizationId,
                },
              },
            );
            if (resp.ok) {
              const skillResp = (await resp.json()) as { data?: unknown };
              const pkgParsed = SkillPackageSchema.safeParse(skillResp.data);
              if (pkgParsed.success) {
                ctx.waitUntil(
                  runAutoEvaluate(pkgParsed.data, skillId, organizationId, env, ctx)
                    .then((result) => {
                      logger.info("Auto-evaluate from queue complete", {
                        skillId,
                        finalVerdict: result.finalVerdict,
                        finalScore: result.finalScore,
                      });
                    })
                    .catch((e) => {
                      logger.error("Auto-evaluate from queue failed", { skillId, error: String(e) });
                    }),
                );
              } else {
                logger.warn("Skill package parse failed", { skillId });
              }
            } else {
              logger.warn("Failed to fetch skill for auto-eval", { skillId, status: resp.status });
            }
          } catch (e) {
            logger.error("Queue event skill fetch error", { skillId, error: String(e) });
          }
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // AI Chat Agent (guide assistant)
      if (method === "POST" && path === "/chat") {
        return await handleChat(request, env, ctx);
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      logger.error("Unhandled error", { error: String(e), path, method });
      return errFromUnknown(e);
    }
  },
} satisfies ExportedHandler<Env>;
