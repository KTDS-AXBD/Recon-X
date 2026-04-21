// F375 + F376: Executive View Overview 페이지
// KPI-1: 본부장 3분 파악 — 4 Group 요약 + Foundry-X 실사례 타임라인
import { ExecutiveOverview } from "@/components/executive/ExecutiveOverview";
import { FoundryXTimeline } from "@/components/executive/FoundryXTimeline";

export default function ExecutiveOverviewPage() {
  return (
    <div className="space-y-8 p-6">
      <ExecutiveOverview />
      <div className="border-t pt-6">
        <FoundryXTimeline />
      </div>
    </div>
  );
}
