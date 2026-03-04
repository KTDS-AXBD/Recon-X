import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineFlowchart } from '@/components/guide/PipelineFlowchart';
import { QuickStartWizard } from '@/components/guide/QuickStartWizard';
import { PageGuideList } from '@/components/guide/PageGuideList';
import { RoleGuide } from '@/components/guide/RoleGuide';
import { FaqSection } from '@/components/guide/FaqSection';
import {
  Workflow,
  Rocket,
  LayoutList,
  Users,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

type GuideTab = 'pipeline' | 'quickstart' | 'pages' | 'roles' | 'faq';

export default function GuidePage() {
  const [params, setParams] = useSearchParams();
  const activeTab = (params.get('tab') as GuideTab) || 'pipeline';

  const handleTabChange = (value: string) => {
    setParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
        >
          <BookOpen className="w-5 h-5" style={{ color: '#3B82F6' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            이용 가이드 User Guide
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            AI Foundry 플랫폼 사용법과 데이터 해석 가이드
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="pipeline" className="flex items-center gap-1.5">
            <Workflow className="w-4 h-4" />
            파이프라인 총괄
          </TabsTrigger>
          <TabsTrigger value="quickstart" className="flex items-center gap-1.5">
            <Rocket className="w-4 h-4" />
            빠른 시작
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-1.5">
            <LayoutList className="w-4 h-4" />
            페이지 안내
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            역할별 가이드
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            자주 묻는 질문
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineFlowchart />
        </TabsContent>

        <TabsContent value="quickstart" className="mt-4">
          <QuickStartWizard />
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          <PageGuideList />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <RoleGuide />
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <FaqSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
