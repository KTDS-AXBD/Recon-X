import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileUp,
  Search,
  Scale,
  Network,
  Package,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface StageInfo {
  id: number;
  title: string;
  titleEn: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  description: string;
  engine: string;
  output: string;
  pages: { label: string; path: string }[];
}

const STAGES: StageInfo[] = [
  {
    id: 1,
    title: '문서 수집',
    titleEn: 'Document Ingestion',
    icon: <FileUp className="w-6 h-6" />,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.1)',
    description: 'PDF, DOCX, PPTX, XLSX, 이미지(ERD) 등 SI 프로젝트 산출물을 업로드하면 자동으로 텍스트를 추출하고 구조화된 청크로 분리합니다.',
    engine: 'Unstructured.io + Claude Vision (ERD) + Custom Excel Parser',
    output: '구조화된 텍스트 청크 + 분류 레이블',
    pages: [
      { label: '문서 업로드', path: '/upload' },
      { label: '분석 결과', path: '/analysis' },
    ],
  },
  {
    id: 2,
    title: '구조 추출',
    titleEn: 'Structure Extraction',
    icon: <Search className="w-6 h-6" />,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    description: '문서에서 프로세스 흐름, 엔티티 관계, 업무 규칙을 AI가 자동으로 추출합니다. 복잡한 문서는 Claude Sonnet, 단순 문서는 Haiku가 처리합니다.',
    engine: 'Claude Sonnet (복잡) / Haiku (단순)',
    output: '프로세스 그래프 + 엔티티 관계 맵 + 추적 매트릭스',
    pages: [
      { label: '분석 결과', path: '/analysis' },
      { label: '분석 리포트', path: '/analysis-report' },
    ],
  },
  {
    id: 3,
    title: '정책 추론',
    titleEn: 'Policy Inference',
    icon: <Scale className="w-6 h-6" />,
    color: 'var(--accent)',
    bg: 'rgba(246, 173, 85, 0.1)',
    description: '추출된 업무 규칙에서 조건-기준-결과(Condition-Criteria-Outcome) 형태의 정책을 추론합니다. HITL(Human-in-the-Loop) 검토를 통해 전문가가 검증합니다.',
    engine: 'Claude Opus (정책 생성) + HITL 워크플로우',
    output: '정책 후보 → HITL 검토 → 확정 정책',
    pages: [
      { label: 'HITL 검토', path: '/hitl' },
    ],
  },
  {
    id: 4,
    title: '온톨로지 정규화',
    titleEn: 'Ontology Normalization',
    icon: <Network className="w-6 h-6" />,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    description: '도메인 용어를 SKOS/JSON-LD 표준으로 정규화하고, Neo4j 그래프 DB에 지식 그래프를 구축합니다. 조직 간 용어 매핑도 처리합니다.',
    engine: 'SKOS/JSON-LD + Neo4j Aura + Workers AI (임베딩)',
    output: '도메인 온톨로지 그래프 + 용어 사전',
    pages: [
      { label: '온톨로지', path: '/ontology' },
    ],
  },
  {
    id: 5,
    title: 'Skill 패키징',
    titleEn: 'Skill Packaging',
    icon: <Package className="w-6 h-6" />,
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.1)',
    description: '추출된 지식(정책, 용어, 프로세스)을 재사용 가능한 AI Skill 패키지(.skill.json)로 패키징합니다. MCP 어댑터로 Claude Desktop에서 바로 사용 가능합니다.',
    engine: 'Custom Skill Spec + Claude Sonnet (문서화)',
    output: '.skill.json 패키지 + MCP 어댑터',
    pages: [
      { label: 'Skill 카탈로그', path: '/skills' },
      { label: 'API 연결', path: '/api-console' },
    ],
  },
];

export function PipelineFlowchart() {
  const [selected, setSelected] = useState<number | null>(null);
  const activeStage = selected !== null ? STAGES[selected] : null;

  return (
    <div className="space-y-6">
      {/* Pipeline Flow */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {STAGES.map((stage, i) => (
          <div key={stage.id} className="flex items-center shrink-0">
            <button
              onClick={() => setSelected(selected === i ? null : i)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 min-w-[140px]"
              style={{
                borderColor: selected === i ? stage.color : 'var(--border)',
                backgroundColor: selected === i ? stage.bg : 'var(--surface)',
                boxShadow: selected === i ? `0 4px 12px ${stage.bg}` : 'none',
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: stage.bg, color: stage.color }}
              >
                {stage.icon}
              </div>
              <Badge
                className="text-xs"
                style={{ backgroundColor: stage.bg, color: stage.color, border: 'none' }}
              >
                Stage {stage.id}
              </Badge>
              <span className="text-sm font-medium text-center" style={{ color: 'var(--text-primary)' }}>
                {stage.title}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {stage.titleEn}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <ArrowRight className="w-5 h-5 mx-1 shrink-0" style={{ color: 'var(--text-secondary)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Stage Detail */}
      {activeStage && (
        <Card style={{ borderRadius: 'var(--radius-lg)', borderLeft: `4px solid ${activeStage.color}` }}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: activeStage.bg, color: activeStage.color }}
              >
                {activeStage.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Stage {activeStage.id}: {activeStage.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {activeStage.titleEn}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {activeStage.description}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  처리 엔진
                </div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {activeStage.engine}
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  산출물
                </div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {activeStage.output}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                관련 페이지
              </div>
              <div className="flex gap-2">
                {activeStage.pages.map((p) => (
                  <Link
                    key={p.path}
                    to={p.path}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: activeStage.bg, color: activeStage.color }}
                  >
                    {p.label}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!activeStage && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            위 Stage를 클릭하면 상세 설명을 볼 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
