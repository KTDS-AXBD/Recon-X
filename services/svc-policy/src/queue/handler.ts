/**
 * Queue consumer — listens for extraction.completed events
 * and auto-triggers policy inference.
 */

import { PipelineEventSchema } from "@ai-foundry/types";
import { createLogger } from "@ai-foundry/utils";
import type { Env } from "../env.js";

const logger = createLogger("svc-policy:queue");

export async function handleQueueBatch(
  batch: MessageBatch,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  for (const message of batch.messages) {
    const parsed = PipelineEventSchema.safeParse(message.body);
    if (!parsed.success) {
      logger.warn("Invalid pipeline event, skipping", {
        error: parsed.error.message,
      });
      message.ack();
      continue;
    }

    const event = parsed.data;
    if (event.type !== "extraction.completed") {
      message.ack();
      continue;
    }

    logger.info("Received extraction.completed event", {
      extractionId: event.payload.extractionId,
      documentId: event.payload.documentId,
    });

    // TODO: Full integration — fetch extraction chunks from svc-extraction
    // and call handleInferPolicies internally. For now, log and ack.
    // Cross-service chunk retrieval requires svc-extraction GET /extractions/:id/chunks
    // endpoint (not yet implemented).

    message.ack();
  }
}
