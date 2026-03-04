import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Upload,
  Zap,
  Package,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  details: string[];
  action: { label: string; path: string } | null;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: '조직 선택',
    description: '좌측 사이드바에서 분석 대상 조직을 선택합니다.',
    icon: <Building2 className="w-6 h-6" />,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.1)',
    details: [
      '사이드바 상단의 "조직 선택" 드롭다운에서 조직을 선택합니다',
      '조직별로 업로드된 문서, 분석 결과, Skill이 분리됩니다',
      '데모 환경에서는 "미래에셋 퇴직연금" 조직에 데이터가 있습니다',
    ],
    action: null,
  },
  {
    id: 2,
    title: '문서 업로드',
    description: 'SI 프로젝트 산출물(PDF, DOCX, PPTX, XLSX)을 업로드합니다.',
    icon: <Upload className="w-6 h-6" />,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    details: [
      '지원 형식: PDF, DOCX, PPTX, XLSX, PNG/JPG (ERD 이미지)',
      '"문서 업로드" 페이지에서 파일을 선택하여 업로드합니다',
      '업로드 완료 후 자동으로 5-Stage 파이프라인이 실행됩니다',
      '대량 배치 업로드도 지원됩니다 (순차 처리)',
    ],
    action: { label: '문서 업로드 페이지로', path: '/upload' },
  },
  {
    id: 3,
    title: '자동 분석 대기',
    description: '파이프라인이 자동으로 문서를 분석합니다. 진행 상황을 확인하세요.',
    icon: <Zap className="w-6 h-6" />,
    color: 'var(--accent)',
    bg: 'rgba(246, 173, 85, 0.1)',
    details: [
      '업로드 후 수집 → 추출 → 정책 추론 → 온톨로지 → Skill 패키징 순서로 진행',
      '"분석 결과" 페이지에서 문서별 분석 상태를 확인할 수 있습니다',
      '상태: pending(대기) → processing(처리중) → completed(완료) / failed(실패)',
      '정책 추론 단계에서는 HITL 검토 알림이 발생할 수 있습니다',
    ],
    action: { label: '분석 결과 페이지로', path: '/analysis' },
  },
  {
    id: 4,
    title: '결과 활용',
    description: '생성된 Skill 패키지를 활용하여 AI 서비스에 통합합니다.',
    icon: <Package className="w-6 h-6" />,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    details: [
      'Skill 카탈로그에서 생성된 AI Skill 패키지를 검색/조회합니다',
      '각 Skill의 정책, 신뢰도 점수, 출처 문서를 확인할 수 있습니다',
      'MCP 어댑터로 Claude Desktop에서 바로 활용 가능합니다',
      'API 콘솔에서 OpenAPI 형식으로 외부 시스템과 연동할 수 있습니다',
    ],
    action: { label: 'Skill 카탈로그로', path: '/skills' },
  },
];

export function QuickStartWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep]!;

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(i)}
            className="flex items-center gap-2"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: i === currentStep ? s.bg : i < currentStep ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface)',
                border: i === currentStep ? `2px solid ${s.color}` : '2px solid transparent',
              }}
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: i === currentStep ? s.color : 'var(--border)',
                    color: i === currentStep ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {s.id}
                </div>
              )}
              <span
                className="text-sm font-medium"
                style={{ color: i === currentStep ? s.color : 'var(--text-secondary)' }}
              >
                {s.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <Card style={{ borderRadius: 'var(--radius-lg)', borderTop: `3px solid ${step.color}` }}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: step.bg, color: step.color }}
            >
              {step.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Step {step.id}: {step.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {step.description}
              </p>
            </div>
          </div>

          <ul className="space-y-2 ml-2">
            {step.details.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                {d}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>

            <div className="flex gap-2">
              {step.action && (
                <Link to={step.action.path}>
                  <Button
                    size="sm"
                    style={{ backgroundColor: step.color, color: '#fff' }}
                  >
                    {step.action.label}
                  </Button>
                </Link>
              )}
              {currentStep < STEPS.length - 1 && (
                <Button
                  size="sm"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  다음
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
