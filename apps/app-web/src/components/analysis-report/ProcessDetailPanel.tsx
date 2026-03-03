import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CoreJudgment, ProcessTreeNode } from "@ai-foundry/types";
import { RadarChart } from "./RadarChart";
import { CategoryBadge } from "./CategoryBadge";

interface ProcessDetailPanelProps {
  judgment: CoreJudgment | null;
  treeNode: ProcessTreeNode | null;
}

export function ProcessDetailPanel({
  judgment,
  treeNode,
}: ProcessDetailPanelProps) {
  if (!judgment && !treeNode) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--text-secondary)" }}>
        좌측 트리에서 프로세스를 선택하세요
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Radar Chart */}
      {judgment && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{judgment.processName}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  style={{
                    backgroundColor: judgment.isCore ? "rgba(59, 130, 246, 0.15)" : "rgba(156, 163, 175, 0.2)",
                    color: judgment.isCore ? "#3B82F6" : "#9CA3AF",
                    borderColor: judgment.isCore ? "#3B82F6" : "#9CA3AF",
                  }}
                  variant="outline"
                >
                  {judgment.isCore ? "핵심" : "비핵심"}
                </Badge>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {(judgment.score * 100).toFixed(0)}점
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <RadarChart factors={judgment.factors} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reasoning */}
      {judgment && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">왜 핵심인가?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {judgment.reasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tree Node Detail */}
      {treeNode && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">상세 정보</CardTitle>
              <CategoryBadge category={treeNode.type} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {treeNode.actors.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  수행자 (Actors)
                </div>
                <div className="flex flex-wrap gap-1">
                  {treeNode.actors.map((a) => (
                    <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
            {treeNode.dataInputs.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  입력 데이터
                </div>
                <div className="flex flex-wrap gap-1">
                  {treeNode.dataInputs.map((d) => (
                    <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
            {treeNode.dataOutputs.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  출력 데이터
                </div>
                <div className="flex flex-wrap gap-1">
                  {treeNode.dataOutputs.map((d) => (
                    <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
            {treeNode.methods.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  메서드
                </div>
                <div className="space-y-1">
                  {treeNode.methods.map((m) => (
                    <div key={m.name} className="text-xs" style={{ color: "var(--text-primary)" }}>
                      <span className="font-medium">{m.name}</span>
                      <span style={{ color: "var(--text-secondary)" }}> — {m.triggerCondition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
