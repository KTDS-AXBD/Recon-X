import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { SpecSourceSplitView } from "@/components/engineer/SpecSourceSplitView";
import { fetchProvenanceResolve, type ProvenanceResolveData } from "@/api/provenance";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function EngineerWorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [data, setData] = useState<ProvenanceResolveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState(id ?? "");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    void fetchProvenanceResolve(organizationId, id).then((res) => {
      setLoading(false);
      if (res.success) {
        setData(res.data);
      } else {
        setError(`Provenance 로드 실패: ${res.error}`);
      }
    });
  }, [id, organizationId]);

  const handleSearch = () => {
    if (searchId.trim()) {
      void navigate(`/engineer/workbench/${searchId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold">Engineer Workbench</h1>
          <p className="text-xs text-muted-foreground">Spec → Source 역추적 Split View</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Input
            className="w-56 h-8 text-xs"
            placeholder="Skill ID 입력..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" size="sm" className="h-8" onClick={handleSearch}>
            <Search className="w-3.5 h-3.5 mr-1" />
            이동
          </Button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 overflow-hidden">
        {!id ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <Search className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm">Skill ID를 입력하여 Workbench를 시작하세요</p>
              <p className="text-xs">예: Skill 카탈로그에서 Skill 선택 후 "Workbench에서 보기" 클릭</p>
            </div>
          </div>
        ) : (
          <SpecSourceSplitView
            data={data}
            loading={loading}
            {...(error !== null ? { error } : {})}
          />
        )}
      </div>
    </div>
  );
}
