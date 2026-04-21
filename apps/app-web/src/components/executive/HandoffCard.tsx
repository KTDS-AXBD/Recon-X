// F376: Foundry-X 핸드오프 서비스별 타임라인 카드
import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { ComplianceBadge, type ComplianceItem } from "./ComplianceBadge";

export type HandoffStatus = "completed" | "failed" | "pending";

export interface HandoffService {
  id: string;
  name: string;
  nameKo: string;
  status: HandoffStatus;
  completedAt?: string;
  aiReadyScore?: number;
  driftSelfReport?: number;
  driftIndependent?: number;
  reviewer?: string;
  policyCount?: number;
  skillId?: string | undefined;
  compliance: ComplianceItem[];
  roundTripSummary?: string;
}

interface HandoffCardProps {
  service: HandoffService;
  index: number;
}

const STATUS_CONFIG: Record<HandoffStatus, { icon: React.ReactNode; label: string; color: string }> = {
  completed: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "완료",
    color: "text-green-600 dark:text-green-400",
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    label: "실패",
    color: "text-red-600 dark:text-red-400",
  },
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: "진행중",
    color: "text-amber-600 dark:text-amber-400",
  },
};

export function HandoffCard({ service, index }: HandoffCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[service.status];

  return (
    <div
      className={`relative flex-shrink-0 w-56 rounded-lg border bg-card shadow-sm transition-all duration-200 ${
        service.status === "completed"
          ? "border-green-200 dark:border-green-800"
          : service.status === "failed"
          ? "border-red-200 dark:border-red-800"
          : "border-amber-200 dark:border-amber-800"
      } ${expanded ? "ring-2 ring-primary/30" : "hover:border-primary/40 hover:shadow-md"}`}
    >
      {/* Timeline connector (except first) */}
      {index > 0 && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-px bg-border" />
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{service.name}</p>
            <p className="text-sm font-semibold leading-tight truncate">{service.nameKo}</p>
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>

        {service.aiReadyScore !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">AI-Ready</span>
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${service.aiReadyScore * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium">
              {(service.aiReadyScore * 100).toFixed(0)}%
            </span>
          </div>
        )}

        <ComplianceBadge items={service.compliance} compact />

        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors pt-1 border-t"
        >
          <span>상세 보기</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs border-t pt-2">
          {service.completedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">완료일</span>
              <span className="font-mono">{service.completedAt}</span>
            </div>
          )}
          {service.driftSelfReport !== undefined && service.driftIndependent !== undefined && (
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">자가보고</span>
                <span className="font-mono text-green-600">{service.driftSelfReport}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">독립 검증</span>
                <span className="font-mono text-amber-600">{service.driftIndependent}%</span>
              </div>
            </div>
          )}
          {service.reviewer && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">담당자</span>
              <span>{service.reviewer}</span>
            </div>
          )}
          {service.policyCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">주요 정책</span>
              <span>{service.policyCount}건</span>
            </div>
          )}
          {service.roundTripSummary && (
            <p className="text-muted-foreground leading-relaxed pt-1 border-t">
              {service.roundTripSummary}
            </p>
          )}
          {service.compliance.length > 0 && (
            <div className="pt-1 border-t">
              <p className="text-muted-foreground mb-1">규제 준수</p>
              <ComplianceBadge items={service.compliance} />
            </div>
          )}
          {service.skillId && (
            <a
              href={`/skills/${service.skillId}`}
              className="flex items-center gap-1 text-primary hover:underline pt-1 border-t"
            >
              <ExternalLink className="w-3 h-3" />
              Engineer View에서 자세히 →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
