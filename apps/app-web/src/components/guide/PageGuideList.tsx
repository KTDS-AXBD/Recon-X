import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Upload,
  FileSearch,
  BarChart3,
  CheckSquare,
  Network,
  Package,
  Plug,
  ShieldCheck,
  FileText,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface PageInfo {
  path: string;
  icon: React.ReactNode;
  title: string;
  titleEn: string;
  stage: string | null;
  color: string;
  description: string;
  capabilities: string[];
  dataInterpretation: string;
}

const PAGES: PageInfo[] = [
  {
    path: '/',
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: '대시보드',
    titleEn: 'Dashboard',
    stage: null,
    color: '#3B82F6',
    description: '시스템 전체 현황을 한눈에 볼 수 있는 메인 페이지입니다.',
    capabilities: ['등록 문서/정책/Skill 수 확인', '빠른 실행 바로가기', '최근 활동 및 알림 확인'],
    dataInterpretation: '수치는 현재 선택된 조직의 데이터를 보여줍니다. "검토 대기"는 HITL 리뷰가 필요한 정책 후보 수입니다.',
  },
  {
    path: '/upload',
    icon: <Upload className="w-5 h-5" />,
    title: '문서 업로드',
    titleEn: 'Document Upload',
    stage: 'Stage 1',
    color: '#3B82F6',
    description: 'SI 프로젝트 산출물을 업로드하여 분석 파이프라인을 시작합니다.',
    capabilities: ['PDF/DOCX/PPTX/XLSX/이미지 업로드', '업로드 상태 확인', '자동 파이프라인 트리거'],
    dataInterpretation: '업로드 후 상태가 "parsed"로 바뀌면 텍스트 추출이 완료된 것입니다. "parse_failed"는 파일 형식 문제입니다.',
  },
  {
    path: '/analysis',
    icon: <FileSearch className="w-5 h-5" />,
    title: '분석 결과',
    titleEn: 'Analysis',
    stage: 'Stage 2',
    color: '#10B981',
    description: '문서별 분석 상태와 추출된 구조 데이터를 확인합니다.',
    capabilities: ['문서별 분석 상태 조회', '추출된 프로세스/엔티티/규칙 확인', '수동 분석 트리거'],
    dataInterpretation: '"completed"=분석 완료, "processing"=진행중, "pending"=대기. 각 문서의 processes/entities/rules 수치가 추출 품질을 나타냅니다.',
  },
  {
    path: '/analysis-report',
    icon: <BarChart3 className="w-5 h-5" />,
    title: '분석 리포트',
    titleEn: 'Analysis Report',
    stage: 'Stage 2',
    color: '#10B981',
    description: '도메인 전체에 대한 종합 분석 리포트와 통계를 제공합니다.',
    capabilities: ['문서 선별(Triage) 관리', '도메인 종합 리포트', '문서 상세 분석', '진행 현황 대시보드'],
    dataInterpretation: 'Triage에서 priority(High/Medium/Low)로 분석 우선순위를 관리합니다. 리포트의 수치는 전체 조직 기준입니다.',
  },
  {
    path: '/hitl',
    icon: <CheckSquare className="w-5 h-5" />,
    title: 'HITL 검토',
    titleEn: 'HITL Review',
    stage: 'Stage 3',
    color: 'var(--accent)',
    description: 'AI가 추론한 정책 후보를 전문가가 검토(승인/거부/수정)합니다.',
    capabilities: ['정책 후보 목록 조회', '승인/거부/수정 액션', '검토 세션 관리'],
    dataInterpretation: '정책은 조건-기준-결과(CCO) 형태입니다. 예: "가입 5년 이상(조건) + 주택구입 목적(기준) → 중도인출 가능(결과)". Reviewer 역할만 승인/거부 가능합니다.',
  },
  {
    path: '/ontology',
    icon: <Network className="w-5 h-5" />,
    title: '온톨로지',
    titleEn: 'Ontology',
    stage: 'Stage 4',
    color: '#8B5CF6',
    description: '도메인 용어 사전과 지식 그래프를 시각화합니다.',
    capabilities: ['용어 사전 검색', '지식 그래프 시각화', '용어 간 관계 탐색'],
    dataInterpretation: '노드=개념(도메인/프로세스/정책 등), 엣지=관계. 용어 수가 많을수록 도메인 커버리지가 넓습니다.',
  },
  {
    path: '/skills',
    icon: <Package className="w-5 h-5" />,
    title: 'Skill 카탈로그',
    titleEn: 'Skill Catalog',
    stage: 'Stage 5',
    color: '#EC4899',
    description: '생성된 AI Skill 패키지를 검색하고 상세 정보를 확인합니다.',
    capabilities: ['Skill 검색 (키워드/태그/서브도메인)', 'Skill 상세 조회', '품질 필터링 (Rich/Medium/Thin)'],
    dataInterpretation: 'Trust Score: 0.7+=Rich(고품질), 0.49-0.70=Medium, 0.40-0.49=Thin. content_depth가 높을수록 정책이 풍부합니다.',
  },
  {
    path: '/api-console',
    icon: <Plug className="w-5 h-5" />,
    title: 'API 연결',
    titleEn: 'API Console',
    stage: 'Stage 5',
    color: '#EC4899',
    description: 'MCP 및 REST API를 통해 Skill을 외부 시스템과 연동합니다.',
    capabilities: ['MCP Server 연결 정보', 'API 엔드포인트 테스트', '연동 가이드'],
    dataInterpretation: 'MCP 어댑터는 Claude Desktop에서 직접 Skill을 도구로 사용할 수 있게 해줍니다.',
  },
  {
    path: '/trust',
    icon: <ShieldCheck className="w-5 h-5" />,
    title: '신뢰도 대시보드',
    titleEn: 'Trust Dashboard',
    stage: null,
    color: '#F59E0B',
    description: '정책과 Skill의 신뢰도 점수를 모니터링합니다.',
    capabilities: ['3-Level 신뢰도 평가', '품질 메트릭 조회', 'LLM 비용 모니터링'],
    dataInterpretation: '신뢰도 = baseTrust(레벨별 기본값) x qualityFactor(depth 기반). HITL 검토를 거친 정책일수록 높습니다.',
  },
  {
    path: '/audit',
    icon: <FileText className="w-5 h-5" />,
    title: '감사 로그',
    titleEn: 'Audit Log',
    stage: null,
    color: '#6B7280',
    description: '시스템 내 모든 활동의 감사 추적 기록을 조회합니다.',
    capabilities: ['활동 이력 검색', '사용자별 활동 추적', '리소스별 변경 이력'],
    dataInterpretation: '금융 규제 준수를 위해 5년간 보관됩니다. action/resource/user_id로 필터링 가능합니다.',
  },
  {
    path: '/settings',
    icon: <Settings className="w-5 h-5" />,
    title: '설정',
    titleEn: 'Settings',
    stage: null,
    color: '#6B7280',
    description: '시스템 및 사용자 설정을 관리합니다.',
    capabilities: ['프로필 설정', '알림 설정', '환경 설정'],
    dataInterpretation: '현재는 조직 선택과 테마(다크/라이트) 설정이 주요 기능입니다.',
  },
];

export function PageGuideList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PAGES.map((page) => (
        <Card
          key={page.path}
          className="transition-all hover:shadow-md"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${page.color}15`, color: page.color }}
                >
                  {page.icon}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {page.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {page.titleEn}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {page.stage && (
                  <Badge
                    className="text-xs"
                    style={{ backgroundColor: `${page.color}15`, color: page.color, border: 'none' }}
                  >
                    {page.stage}
                  </Badge>
                )}
                <Link to={page.path}>
                  <ExternalLink className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </Link>
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {page.description}
            </p>

            <div>
              <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                할 수 있는 것
              </div>
              <div className="flex flex-wrap gap-1">
                {page.capabilities.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}>
              <span className="font-semibold" style={{ color: page.color }}>데이터 해석: </span>
              {page.dataInterpretation}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
