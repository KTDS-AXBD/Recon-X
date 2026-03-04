import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  // 업로드
  {
    category: '업로드',
    question: '어떤 파일 형식을 업로드할 수 있나요?',
    answer: 'PDF, DOCX, PPTX, XLSX, PNG/JPG(ERD 이미지)를 지원합니다. 각 파일은 업로드 시 자동으로 텍스트가 추출되며, Excel은 시트별로 파싱됩니다. 암호화된 파일(예: Samsung SDS SCDSA002)은 현재 지원하지 않습니다.',
  },
  {
    category: '업로드',
    question: '한 번에 여러 파일을 업로드할 수 있나요?',
    answer: '현재는 단건 업로드를 지원합니다. 대량 업로드는 관리자 배치 API를 통해 순차 처리됩니다. 업로드된 각 파일은 독립적으로 파이프라인을 통과합니다.',
  },
  {
    category: '업로드',
    question: '업로드 후 자동으로 분석이 시작되나요?',
    answer: '네, 업로드가 완료("parsed" 상태)되면 자동으로 5-Stage 파이프라인이 실행됩니다. 수집 → 구조 추출 → 정책 추론 → 온톨로지 정규화 → Skill 패키징 순서로 진행됩니다.',
  },
  // 분석 상태
  {
    category: '분석 상태',
    question: '분석 상태(status)는 어떤 것들이 있나요?',
    answer: 'pending(대기) → processing(처리중) → completed(완료) 또는 failed(실패)입니다. "분석 결과" 페이지에서 문서별 상태를 확인할 수 있습니다. failed인 경우 수동으로 재분석을 트리거할 수 있습니다.',
  },
  {
    category: '분석 상태',
    question: '분석에 얼마나 걸리나요?',
    answer: '텍스트 파일은 약 10초, 대용량 PDF는 30초~90초 정도 소요됩니다. 정책 추론(Stage 3)은 Claude Opus를 사용하므로 가장 오래 걸릴 수 있으며, HITL 검토 대기 시간은 별도입니다.',
  },
  {
    category: '분석 상태',
    question: '어디서 분석 진행 상태를 확인하나요?',
    answer: '"분석 결과" 페이지에서 문서별 상태를 확인하고, "분석 리포트 > 진행 현황" 탭에서 전체 파이프라인 진행률을 볼 수 있습니다. 대시보드의 시스템 현황 카드에서도 요약 수치를 확인할 수 있습니다.',
  },
  // 데이터 해석
  {
    category: '데이터 해석',
    question: 'Policy(정책)란 무엇인가요?',
    answer: '정책은 "조건(Condition) - 기준(Criteria) - 결과(Outcome)" 삼중항입니다. 예를 들어, "가입 5년 이상(조건) + 주택구입 목적(기준) → 중도인출 가능(결과)". 정책 코드는 POL-{도메인}-{유형}-{순번} 형태입니다 (예: POL-PENSION-WD-HOUSING-001).',
  },
  {
    category: '데이터 해석',
    question: 'Trust Score(신뢰도)는 어떻게 계산되나요?',
    answer: 'baseTrust(레벨별 기본값) x qualityFactor(content_depth 기반)로 계산됩니다. Rich(0.70+)=고품질, Medium(0.49~0.70)=보통, Thin(0.40~0.49)=경량. HITL 검토를 거친 정책이 포함될수록 점수가 높아집니다.',
  },
  {
    category: '데이터 해석',
    question: 'Skill이란 무엇인가요?',
    answer: 'Skill은 추출된 도메인 지식(정책, 용어, 프로세스)을 재사용 가능한 패키지(.skill.json)로 묶은 것입니다. MCP 어댑터를 통해 Claude Desktop에서 바로 도구로 사용할 수 있으며, REST API로도 접근 가능합니다.',
  },
  {
    category: '데이터 해석',
    question: 'Skill 품질(Rich/Medium/Thin)은 무엇을 의미하나요?',
    answer: 'content_depth(정책 수, 용어 수, 프로세스 수 종합)에 따라 분류됩니다. Rich=정책이 풍부하고 상세함, Medium=기본 정보 포함, Thin=최소한의 정보만 포함. Skill 카탈로그에서 "보통 이상"(기본 필터)으로 Medium+Rich만 표시됩니다.',
  },
  // HITL
  {
    category: 'HITL 검토',
    question: 'HITL 검토는 누가 할 수 있나요?',
    answer: 'Reviewer 역할만 정책 승인/거부/수정이 가능합니다. Analyst는 정책을 조회만 할 수 있습니다. 데모 환경에서는 "양대진(Reviewer)" 계정으로 로그인해야 검토 기능을 사용할 수 있습니다.',
  },
  {
    category: 'HITL 검토',
    question: 'HITL 검토를 하지 않으면 어떻게 되나요?',
    answer: '정책은 "candidate" 상태로 남아 있으며, 자동으로 Skill에 반영되지 않습니다. 대량 처리 시에는 관리자가 bulk-approve API로 일괄 승인할 수 있습니다.',
  },
];

const CATEGORIES = [...new Set(FAQ_DATA.map((f) => f.category))];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? FAQ_DATA.filter((f) => f.category === activeCategory)
    : FAQ_DATA;

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeCategory === null ? 'var(--accent)' : 'var(--surface)',
            color: activeCategory === null ? 'var(--accent-foreground)' : 'var(--text-secondary)',
          }}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeCategory === cat ? 'var(--accent)' : 'var(--surface)',
              color: activeCategory === cat ? 'var(--accent-foreground)' : 'var(--text-secondary)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <div className="space-y-2">
        {filtered.map((faq, index) => {
          const globalIndex = FAQ_DATA.indexOf(faq);
          const isOpen = openIndex === globalIndex;
          return (
            <div
              key={globalIndex}
              className="border rounded-lg overflow-hidden"
              style={{ borderColor: isOpen ? 'var(--accent)' : 'var(--border)' }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors"
                style={{ backgroundColor: isOpen ? 'rgba(246, 173, 85, 0.05)' : 'transparent' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                  >
                    {faq.category}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className="w-4 h-4 shrink-0 transition-transform"
                  style={{
                    color: 'var(--text-secondary)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                  }}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <div
                    className="p-3 rounded-lg text-sm leading-relaxed"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  >
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
