/**
 * Queue event handler for svc-notification.
 * Receives: policy.candidate_ready, skill.packaged from svc-queue-router.
 */

import {
  PipelineEventSchema,
  type PolicyCandidateReadyEvent,
  type SkillPackagedEvent,
} from "@ai-foundry/types";
import { createLogger, ok, badRequest, err } from "@ai-foundry/utils";
import type { Env } from "../env.js";

const logger = createLogger("svc-notification:queue");

/** Create a notification row in D1. */
async function insertNotification(
  db: D1Database,
  params: {
    notificationId: string;
    recipientId: string;
    type: string;
    title: string;
    body: string;
    metadata: Record<string, unknown>;
    channel?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO notifications
         (notification_id, recipient_id, type, title, body, metadata, channel, status, created_at, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?)`,
    )
    .bind(
      params.notificationId,
      params.recipientId,
      params.type,
      params.title,
      params.body,
      JSON.stringify(params.metadata),
      params.channel ?? "internal",
      now,
      now,
    )
    .run();
}

function generateId(): string {
  return `ntf-${crypto.randomUUID().slice(0, 8)}`;
}

async function handlePolicyCandidateReady(
  event: PolicyCandidateReadyEvent,
  env: Env,
): Promise<void> {
  const { policyId, hitlSessionId, candidateCount, reviewerId } = event.payload;
  const recipientId = reviewerId ?? "reviewer-pool";

  await insertNotification(env.DB_NOTIFICATION, {
    notificationId: generateId(),
    recipientId,
    type: "hitl_review_needed",
    title: `Policy review requested`,
    body: `${candidateCount} policy candidate(s) ready for HITL review. Policy: ${policyId}, Session: ${hitlSessionId}`,
    metadata: { policyId, hitlSessionId, candidateCount, eventId: event.eventId },
  });
  logger.info("Notification created", { type: "hitl_review_needed", policyId, recipientId });
}

async function handleSkillPackaged(
  event: SkillPackagedEvent,
  env: Env,
): Promise<void> {
  const { skillId, policyCount, trustScore } = event.payload;

  await insertNotification(env.DB_NOTIFICATION, {
    notificationId: generateId(),
    recipientId: "developer-pool",
    type: "skill_ready",
    title: `New Skill package ready`,
    body: `Skill ${skillId} packaged with ${policyCount} policies (trust: ${(trustScore * 100).toFixed(0)}%)`,
    metadata: { skillId, policyCount, trustScore, eventId: event.eventId },
  });
  logger.info("Notification created", { type: "skill_ready", skillId });
}

export async function processQueueEvent(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = PipelineEventSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn("Invalid pipeline event", { error: parsed.error.message });
    return badRequest("Invalid pipeline event");
  }

  const event = parsed.data;

  try {
    switch (event.type) {
      case "policy.candidate_ready":
        await handlePolicyCandidateReady(event, env);
        break;
      case "skill.packaged":
        await handleSkillPackaged(event, env);
        break;
      default:
        logger.info("Ignoring unhandled event type", { type: event.type });
    }
  } catch (e) {
    logger.error("Failed to process notification event", { error: String(e), type: event.type });
    return err({ code: "INTERNAL_ERROR", message: `Notification write failed: ${String(e)}` }, 500);
  }

  return ok({ status: "processed", eventType: event.type });
}
