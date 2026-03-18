/**
 * AgentRunPanel — AG-UI 에이전트 실행 패널.
 * Design Doc: AIF-DSGN-024 §4.3 AgentRunPanel
 *
 * 에이전트 실행 상태, 이벤트 로그, 위젯 렌더링을 통합 표시.
 */

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { WidgetRenderer } from "./WidgetRenderer";
import { useAgentStream } from "@/lib/use-agent-stream";
import type { AgentStreamStatus } from "@/lib/use-agent-stream";
import type { AgUiEvent } from "@ai-foundry/types";
import type { BridgeAction, WidgetType } from "@/lib/widget-bridge";
import type { ThemeVariables } from "@/lib/widget-theme";

interface AgentRunPanelProps {
  organizationId: string;
  themeVariables: ThemeVariables;
  isDark: boolean;
}

const STATUS_CONFIG: Record<AgentStreamStatus, { label: string; color: string; bg: string }> = {
  idle: { label: "대기중", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  running: { label: "실행중", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  completed: { label: "완료", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
  error: { label: "오류", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
};

function formatEventLog(event: AgUiEvent): string {
  switch (event.type) {
    case "RUN_STARTED":
      return `Agent "${event.agentName}" 시작 — ${event.taskDescription}`;
    case "TEXT_MESSAGE_CONTENT":
      return event.delta;
    case "TOOL_CALL_START":
      return `Tool: ${event.toolName}(${JSON.stringify(event.args).slice(0, 80)}...)`;
    case "TOOL_CALL_END":
      return `Tool 완료: ${JSON.stringify(event.result).slice(0, 100)}`;
    case "STATE_SYNC":
      return `위젯 업데이트 (${event.visualizationType})`;
    case "RUN_FINISHED":
      return `완료: ${event.summary}`;
    case "RUN_ERROR":
      return `오류: ${event.error}`;
    default:
      return JSON.stringify(event);
  }
}

function getEventIcon(type: AgUiEvent["type"]): string {
  switch (type) {
    case "RUN_STARTED": return "▶";
    case "TEXT_MESSAGE_CONTENT": return "💬";
    case "TOOL_CALL_START": return "🔧";
    case "TOOL_CALL_END": return "✅";
    case "STATE_SYNC": return "📊";
    case "RUN_FINISHED": return "🏁";
    case "RUN_ERROR": return "❌";
    default: return "•";
  }
}

export function AgentRunPanel({
  organizationId,
  themeVariables,
  isDark,
}: AgentRunPanelProps) {
  const [task, setTask] = useState("");
  const { events, status, widgetHtml, error, startRun, cancelRun } = useAgentStream();
  const logEndRef = useRef<HTMLDivElement>(null);

  const statusCfg = STATUS_CONFIG[status];

  const handleRun = useCallback(() => {
    if (!task.trim()) return;
    void startRun(task, organizationId);
  }, [task, organizationId, startRun]);

  const handleWidgetAction = useCallback((_action: BridgeAction) => {
    // Log bridge actions — no-op for now
  }, []);

  // Determine widget type from latest STATE_SYNC event
  const latestStateSync = [...events].reverse().find((e) => e.type === "STATE_SYNC");
  const widgetType: WidgetType = latestStateSync?.type === "STATE_SYNC"
    ? latestStateSync.visualizationType
    : "chart";

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className={cn("rounded-lg px-4 py-3 flex items-center justify-between", statusCfg.bg)}>
        <div className="flex items-center gap-2">
          {status === "running" && (
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
          <span className={cn("text-sm font-medium", statusCfg.color)}>
            {statusCfg.label}
          </span>
          {status === "running" && (
            <span className="text-xs text-gray-400">
              ({String(events.length)} events)
            </span>
          )}
        </div>
        {status === "running" && (
          <button
            type="button"
            onClick={cancelRun}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            취소
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="에이전트에게 요청할 작업을 입력하세요..."
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && status !== "running") handleRun();
          }}
          disabled={status === "running"}
        />
        <button
          type="button"
          onClick={handleRun}
          disabled={status === "running" || !task.trim()}
          className={cn(
            "rounded-md px-5 py-2 text-sm font-medium text-white transition-colors",
            status === "running" || !task.trim()
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          Run
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Widget Area */}
      {widgetHtml && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            생성된 시각화
          </h4>
          <WidgetRenderer
            content={widgetHtml}
            type={widgetType}
            themeVariables={themeVariables}
            isDark={isDark}
            onAction={handleWidgetAction}
            maxHeight={400}
          />
        </div>
      )}

      {/* Event Log */}
      {events.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              이벤트 로그
            </h4>
          </div>
          <div className="max-h-60 overflow-y-auto p-3 space-y-1.5">
            {events.map((event, i) => (
              <div
                key={`${event.type}-${String(i)}`}
                className="flex items-start gap-2 text-xs font-mono"
              >
                <span className="flex-shrink-0 w-4 text-center">
                  {getEventIcon(event.type)}
                </span>
                <span className="text-gray-400 flex-shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn(
                  "break-all",
                  event.type === "RUN_ERROR"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400",
                )}>
                  {formatEventLog(event)}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
