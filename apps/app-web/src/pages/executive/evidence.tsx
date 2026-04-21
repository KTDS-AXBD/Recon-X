// F378: Evidence 서브메뉴 — analysis-report + org-spec + poc-report 재배치
// Executive View의 근거 자료 허브 페이지
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileBarChart2, Building2, FileText } from "lucide-react";

const AnalysisReportPage = lazy(() => import("@/pages/analysis-report"));
const OrgSpecPage = lazy(() => import("@/pages/org-spec"));
const PocReportPage = lazy(() => import("@/pages/poc-report"));

function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

type EvidenceTab = "analysis" | "org-spec" | "poc-report";

export default function EvidencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as EvidenceTab | null) ?? "analysis";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold">근거 자료 (Evidence)</h2>
        <p className="text-sm text-muted-foreground">
          분석 리포트 · 조직 종합 Spec · PoC 보고서를 한 곳에서 확인
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="analysis" className="flex items-center gap-1.5">
            <FileBarChart2 className="w-4 h-4" />
            분석 리포트
          </TabsTrigger>
          <TabsTrigger value="org-spec" className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            조직 종합 Spec
          </TabsTrigger>
          <TabsTrigger value="poc-report" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            PoC 보고서
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="mt-0">
          <Suspense fallback={<TabLoadingFallback />}>
            <AnalysisReportPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="org-spec" className="mt-0">
          <Suspense fallback={<TabLoadingFallback />}>
            <OrgSpecPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="poc-report" className="mt-0">
          <Suspense fallback={<TabLoadingFallback />}>
            <PocReportPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
