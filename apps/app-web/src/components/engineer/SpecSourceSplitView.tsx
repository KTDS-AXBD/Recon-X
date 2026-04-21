import { useState, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link2, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { ProvenanceInspector } from "./ProvenanceInspector";
import type { ProvenanceResolveData, ProvenancePolicy } from "@/api/provenance";

interface SpecSourceSplitViewProps {
  data: ProvenanceResolveData | null;
  loading?: boolean;
  error?: string;
}

function confidenceColor(v: number): string {
  if (v >= 0.8) return "text-emerald-600";
  if (v >= 0.6) return "text-amber-500";
  return "text-destructive";
}

function PolicyCard({
  policy,
  selected,
  onClick,
  onProvenance,
}: {
  policy: ProvenancePolicy;
  selected: boolean;
  onClick: () => void;
  onProvenance: () => void;
}) {
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
        selected ? "border-primary bg-accent/30" : "border-border bg-card"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-muted-foreground">{policy.code}</p>
          <p className="text-sm font-medium mt-0.5 leading-snug">{policy.title}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs font-medium ${confidenceColor(policy.confidence)}`}>
            {Math.round(policy.confidence * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onProvenance();
            }}
            title="Provenance 보기"
          >
            <Link2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
          <ChevronRight className="w-3 h-3" />
          <span>우측 패널에서 보기</span>
        </div>
      )}
    </div>
  );
}

function PolicyMarkdown({
  policy,
  sectionRef,
}: {
  policy: ProvenancePolicy;
  sectionRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div id={policy.code} ref={sectionRef} className="scroll-mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="font-mono text-xs">
          {policy.code}
        </Badge>
        <span className={`text-xs ${confidenceColor(policy.confidence)}`}>
          신뢰도 {Math.round(policy.confidence * 100)}%
        </span>
      </div>
      <h2 className="text-lg font-semibold mb-3">{policy.title}</h2>

      <div className="space-y-4 text-sm">
        <section>
          <h3 className="font-medium text-muted-foreground uppercase tracking-wide text-xs mb-1">
            적용 조건
          </h3>
          <p className="leading-relaxed">{policy.condition}</p>
        </section>
        <section>
          <h3 className="font-medium text-muted-foreground uppercase tracking-wide text-xs mb-1">
            판단 기준
          </h3>
          <p className="leading-relaxed">{policy.criteria}</p>
        </section>
        <section>
          <h3 className="font-medium text-muted-foreground uppercase tracking-wide text-xs mb-1">
            결과
          </h3>
          <p className="leading-relaxed">{policy.outcome}</p>
        </section>
      </div>
      <Separator className="mt-6" />
    </div>
  );
}

export function SpecSourceSplitView({ data, loading, error }: SpecSourceSplitViewProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorPolicyCode, setInspectorPolicyCode] = useState<string | undefined>();
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerRef = useCallback(
    (code: string) => (el: HTMLDivElement | null) => {
      if (el) {
        sectionRefs.current.set(code, el);
      } else {
        sectionRefs.current.delete(code);
      }
    },
    [],
  );

  const handlePolicyClick = useCallback((code: string) => {
    setSelectedCode(code);
    const el = sectionRefs.current.get(code);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleProvenanceClick = useCallback((code: string) => {
    setInspectorPolicyCode(code);
    setInspectorOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!data || data.policies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">정책 데이터 없음</span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[340px_1fr] h-full overflow-hidden">
        {/* Left: Spec panel */}
        <div className="border-r flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">정책 목록</h3>
            <p className="text-xs text-muted-foreground">{data.policies.length}건 · {data.domain}</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {data.policies.map((p) => (
                <PolicyCard
                  key={p.code}
                  policy={p}
                  selected={selectedCode === p.code}
                  onClick={() => handlePolicyClick(p.code)}
                  onProvenance={() => handleProvenanceClick(p.code)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Reconstructed markdown */}
        <ScrollArea className="flex-1">
          <div className="px-8 py-6 max-w-3xl space-y-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{data.domain} 정책 명세</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Skill ID: <span className="font-mono">{data.skillId}</span> · 추출일:{" "}
                {new Date(data.extractedAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
            {data.policies.map((p) => (
              <PolicyMarkdown
                key={p.code}
                policy={p}
                sectionRef={registerRef(p.code)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <ProvenanceInspector
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        data={data}
        {...(inspectorPolicyCode !== undefined ? { selectedPolicyCode: inspectorPolicyCode } : {})}
      />
    </>
  );
}
