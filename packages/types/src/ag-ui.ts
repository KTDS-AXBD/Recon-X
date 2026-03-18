/**
 * AG-UI Protocol — Agent-UI 실시간 스트리밍 이벤트 타입.
 * Design Doc: AIF-DSGN-024 §4 AG-UI Protocol
 *
 * SSE 기반으로 에이전트 실행 상태를 프론트엔드에 스트리밍한다.
 * 각 이벤트는 discriminated union으로 type 필드로 구분.
 */

import { z } from "zod";

// ── Event Type Enum ─────────────────────────────────────────────────

export const AgUiEventTypeSchema = z.enum([
  "RUN_STARTED",
  "TEXT_MESSAGE_CONTENT",
  "TOOL_CALL_START",
  "TOOL_CALL_END",
  "STATE_SYNC",
  "CUSTOM",
  "RUN_FINISHED",
  "RUN_ERROR",
]);

export type AgUiEventType = z.infer<typeof AgUiEventTypeSchema>;

// ── Base Schema ─────────────────────────────────────────────────────

export const AgUiEventBaseSchema = z.object({
  type: AgUiEventTypeSchema,
  timestamp: z.number(),
  runId: z.string(),
});

// ── Individual Event Schemas ────────────────────────────────────────

export const RunStartedEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("RUN_STARTED"),
  agentName: z.string(),
  taskDescription: z.string(),
});
export type RunStartedEvent = z.infer<typeof RunStartedEventSchema>;

export const TextMessageEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("TEXT_MESSAGE_CONTENT"),
  delta: z.string(),
});
export type TextMessageEvent = z.infer<typeof TextMessageEventSchema>;

export const ToolCallStartEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("TOOL_CALL_START"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
});
export type ToolCallStartEvent = z.infer<typeof ToolCallStartEventSchema>;

export const ToolCallEndEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("TOOL_CALL_END"),
  toolCallId: z.string(),
  result: z.unknown(),
});
export type ToolCallEndEvent = z.infer<typeof ToolCallEndEventSchema>;

export const VisualizationTypeSchema = z.enum([
  "chart",
  "graph",
  "diagram",
  "table",
  "form",
  "markdown",
]);
export type VisualizationType = z.infer<typeof VisualizationTypeSchema>;

export const StateSyncEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("STATE_SYNC"),
  widgetHtml: z.string(),
  visualizationType: VisualizationTypeSchema,
});
export type StateSyncEvent = z.infer<typeof StateSyncEventSchema>;

export const HitlRequestEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("CUSTOM"),
  subType: z.literal("HITL_REQUEST"),
  componentType: z.enum([
    "PolicyApprovalCard",
    "EntityConfirmation",
    "ParameterInput",
  ]),
  props: z.record(z.unknown()),
  resumeToken: z.string(),
});
export type HitlRequestEvent = z.infer<typeof HitlRequestEventSchema>;

export const RunFinishedEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("RUN_FINISHED"),
  summary: z.string(),
});
export type RunFinishedEvent = z.infer<typeof RunFinishedEventSchema>;

export const RunErrorEventSchema = AgUiEventBaseSchema.extend({
  type: z.literal("RUN_ERROR"),
  error: z.string(),
});
export type RunErrorEvent = z.infer<typeof RunErrorEventSchema>;

// ── Discriminated Union ─────────────────────────────────────────────

export const AgUiEventSchema = z.discriminatedUnion("type", [
  RunStartedEventSchema,
  TextMessageEventSchema,
  ToolCallStartEventSchema,
  ToolCallEndEventSchema,
  StateSyncEventSchema,
  RunFinishedEventSchema,
  RunErrorEventSchema,
]);
export type AgUiEvent = z.infer<typeof AgUiEventSchema>;

// ── Request Schemas ─────────────────────────────────────────────────

export const AgentRunRequestSchema = z.object({
  task: z.string().min(1).max(2000),
  organizationId: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});
export type AgentRunRequest = z.infer<typeof AgentRunRequestSchema>;

export const AgentResumeRequestSchema = z.object({
  resumeToken: z.string().min(1),
  decision: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});
export type AgentResumeRequest = z.infer<typeof AgentResumeRequestSchema>;
