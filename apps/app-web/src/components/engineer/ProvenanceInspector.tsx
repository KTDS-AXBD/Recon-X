import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GitBranch,
  FileText,
  Layers,
  Link2,
  AlertCircle,
} from "lucide-react";
import type { ProvenanceResolveData } from "@/api/provenance";

interface ProvenanceInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProvenanceResolveData | null;
  selectedPolicyCode?: string;
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const variant = pct >= 80 ? "secondary" : pct >= 60 ? "outline" : "destructive";
  return <Badge variant={variant}>{pct}%</Badge>;
}

function SourceNode({ source }: { source: ProvenanceResolveData["sources"][number] }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {source.type === "reverse-engineering" ? "역공학" : "추론"}
          </Badge>
          <ConfidenceBadge value={source.confidence} />
        </div>
        {source.path && (
          <p className="text-xs text-muted-foreground mt-1 break-all">{source.path}</p>
        )}
        {source.section && (
          <p className="text-xs font-medium mt-1 truncate">{source.section}</p>
        )}
      </div>
    </div>
  );
}

export function ProvenanceInspector({
  open,
  onOpenChange,
  data,
  selectedPolicyCode,
}: ProvenanceInspectorProps) {
  const [activeTab, setActiveTab] = useState<"sources" | "pipeline" | "terms">("sources");

  const selectedPolicy = data?.policies.find((p) => p.code === selectedPolicyCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Provenance Inspector
          </DialogTitle>
          {selectedPolicy && (
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{selectedPolicy.code}</span> — {selectedPolicy.title}
            </p>
          )}
        </DialogHeader>

        {!data ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm">Provenance 데이터 없음</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex border-b">
              {(["sources", "pipeline", "terms"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "sources" ? "소스" : tab === "pipeline" ? "파이프라인" : "용어"}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {activeTab === "sources" && (
                  <>
                    {data.documentIds.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">원본 문서</p>
                        {data.documentIds.map((id) => (
                          <div key={id} className="flex items-center gap-2 text-xs">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                            <span className="font-mono break-all">{id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Separator />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      소스 섹션 ({data.sources.length})
                    </p>
                    {data.sources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">소스 정보 없음</p>
                    ) : (
                      data.sources.map((src, i) => <SourceNode key={i} source={src} />)
                    )}
                  </>
                )}

                {activeTab === "pipeline" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">파이프라인 스테이지</p>
                    {data.pipelineStages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">스테이지 정보 없음</p>
                    ) : (
                      <div className="relative pl-4">
                        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                        {data.pipelineStages.map((stage, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 relative">
                            <div className="w-2 h-2 rounded-full bg-primary absolute -left-0.5 top-3.5" />
                            <div className="flex items-center gap-2 pl-2">
                              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{stage}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">추출 시각</p>
                      <p className="text-sm font-mono">{data.extractedAt}</p>
                    </div>
                  </div>
                )}

                {activeTab === "terms" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      온톨로지 용어 ({data.terms.length})
                    </p>
                    {data.terms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">연결된 용어 없음</p>
                    ) : (
                      data.terms.map((term) => (
                        <div key={term.termId} className="flex items-start gap-2 p-2 rounded border bg-card">
                          <GitBranch className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{term.label}</p>
                            {term.definition && (
                              <p className="text-xs text-muted-foreground">{term.definition}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
