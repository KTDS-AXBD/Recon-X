/**
 * AG-UI Protocol — SSE 기반 Agent 실행 스트리밍 엔드포인트.
 * Design Doc: AIF-DSGN-024 §4 AG-UI Protocol
 *
 * POST /agent/run   → SSE 스트림으로 에이전트 실행 이벤트 전송
 * POST /agent/resume → HITL 응답 후 에이전트 재개 (stub)
 */

import {
  AgentRunRequestSchema,
  AgentResumeRequestSchema,
} from "@ai-foundry/types";
import type {
  RunStartedEvent,
  ToolCallStartEvent,
  ToolCallEndEvent,
  StateSyncEvent,
  RunFinishedEvent,
} from "@ai-foundry/types";
import { ok, badRequest } from "@ai-foundry/utils";

// ── SSE Helpers ─────────────────────────────────────────────────────

function sseEncode(event: Record<string, unknown>): string {
  return `event: ag-ui\ndata: ${JSON.stringify(event)}\n\n`;
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Internal-Secret, Mcp-Session-Id",
  };
}

// ── Sample Widget SVG ───────────────────────────────────────────────

const SAMPLE_WIDGET_HTML = `
<div style="padding: 16px; font-family: system-ui, sans-serif;">
  <h3 style="color: var(--aif-primary, #3b82f6); margin: 0 0 12px 0; font-size: 15px;">정책 분석 결과</h3>
  <svg viewBox="0 0 400 180" style="width: 100%; max-width: 450px;">
    <rect x="30" y="10" width="80" height="120" rx="4" fill="#3b82f6" opacity="0.85"/>
    <rect x="130" y="40" width="80" height="90" rx="4" fill="#8b5cf6" opacity="0.85"/>
    <rect x="230" y="70" width="80" height="60" rx="4" fill="#06b6d4" opacity="0.85"/>
    <text x="70" y="150" text-anchor="middle" font-size="11" fill="#6b7280">승인</text>
    <text x="170" y="150" text-anchor="middle" font-size="11" fill="#6b7280">검토중</text>
    <text x="270" y="150" text-anchor="middle" font-size="11" fill="#6b7280">보류</text>
    <text x="70" y="170" text-anchor="middle" font-size="10" fill="#9ca3af">2,827</text>
    <text x="170" y="170" text-anchor="middle" font-size="10" fill="#9ca3af">148</text>
    <text x="270" y="170" text-anchor="middle" font-size="10" fill="#9ca3af">42</text>
  </svg>
</div>`.trim();

// ── Handlers ────────────────────────────────────────────────────────

export async function handleAgentRun(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = AgentRunRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "Invalid request body",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { task, organizationId } = parsed.data;
  const runId = crypto.randomUUID();
  const toolCallId = crypto.randomUUID();

  // TransformStream for Cloudflare Workers SSE
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Simulate agent flow asynchronously
  const streamEvents = async () => {
    try {
      // 1. RUN_STARTED
      const startEvent: RunStartedEvent = {
        type: "RUN_STARTED",
        timestamp: Date.now(),
        runId,
        agentName: "ai-foundry-agent",
        taskDescription: task,
      };
      await writer.write(encoder.encode(sseEncode(startEvent)));

      // 2. TOOL_CALL_START
      const toolStartEvent: ToolCallStartEvent = {
        type: "TOOL_CALL_START",
        timestamp: Date.now(),
        runId,
        toolCallId,
        toolName: "query-policies",
        args: { organizationId, query: task },
      };
      await writer.write(encoder.encode(sseEncode(toolStartEvent)));

      // 3. Delay 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 4. TOOL_CALL_END
      const toolEndEvent: ToolCallEndEvent = {
        type: "TOOL_CALL_END",
        timestamp: Date.now(),
        runId,
        toolCallId,
        result: {
          policiesFound: 6,
          topPolicy: "POL-PENSION-WD-HOUSING-001",
          confidence: 0.87,
        },
      };
      await writer.write(encoder.encode(sseEncode(toolEndEvent)));

      // 5. STATE_SYNC (widget HTML)
      const stateSyncEvent: StateSyncEvent = {
        type: "STATE_SYNC",
        timestamp: Date.now(),
        runId,
        widgetHtml: SAMPLE_WIDGET_HTML,
        visualizationType: "chart",
      };
      await writer.write(encoder.encode(sseEncode(stateSyncEvent)));

      // 6. RUN_FINISHED
      const finishEvent: RunFinishedEvent = {
        type: "RUN_FINISHED",
        timestamp: Date.now(),
        runId,
        summary: `분석 완료: "${task}" — 6개 정책 발견, 시각화 생성됨`,
      };
      await writer.write(encoder.encode(sseEncode(finishEvent)));
    } catch {
      // Stream may be closed by client — ignore write errors
    } finally {
      try {
        await writer.close();
      } catch {
        // Already closed
      }
    }
  };

  // Fire and forget — the stream will be consumed by the client
  void streamEvents();

  return new Response(readable, {
    status: 200,
    headers: sseHeaders(),
  });
}

export async function handleAgentResume(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = AgentResumeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "Invalid request body",
      parsed.error.flatten().fieldErrors,
    );
  }

  return ok({ status: "resumed", resumeToken: parsed.data.resumeToken });
}
