import { useState } from 'react';
import {
  FileText,
  MessageSquare,
  ClipboardList,
  BookOpen,
  Code2,
  TestTube2,
  IterationCcw,
  ChevronRight,
  CheckCircle2,
  User,
  Zap,
  FolderTree,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarkdownContent } from '@/components/markdown-content';
import {
  interview,
  prd,
  specDocs,
  codeFiles,
  testResults,
  metrics,
} from '@/data/poc-report-data';

/* ─── Helpers ─── */

const CATEGORY_LABELS: Record<string, string> = {
  entry: 'Entry',
  domain: 'Domain',
  routes: 'Routes',
  test: 'Tests',
};

const CATEGORY_COLORS: Record<string, string> = {
  entry: '#3B82F6',
  domain: '#8B5CF6',
  routes: '#10B981',
  test: '#F59E0B',
};

/* ─── Hero Banner ─── */

function MetricsBanner() {
  const items = [
    { label: '스펙 문서', value: String(metrics.specDocuments), unit: '편' },
    { label: '소스 파일', value: String(metrics.sourceFiles), unit: '개' },
    { label: '코드 라인', value: metrics.totalLines.toLocaleString('ko-KR'), unit: '줄' },
    { label: '테스트', value: `${metrics.testCount} / ${metrics.testPassRate}%`, unit: '' },
    { label: '사람 개입', value: String(metrics.humanIntervention), unit: '회' },
  ];

  return (
    <Card
      className="p-5 mb-6"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent) 5%, var(--bg-primary))',
        border: '1px solid var(--accent)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Zap className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          반제품 생성 결과 — {metrics.domain}
        </span>
        <Badge
          className="text-xs ml-auto"
          style={{
            backgroundColor: 'color-mix(in srgb, #10B981 15%, transparent)',
            color: '#10B981',
            border: '1px solid #10B981',
          }}
        >
          PDCA {metrics.pdcaMatchRate}%
        </Badge>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {item.value}
              {item.unit && (
                <span className="text-sm font-normal ml-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {item.unit}
                </span>
              )}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Tab: 개요 ─── */

function OverviewTab() {
  return (
    <div className="space-y-4">
      <Card className="p-5" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          PoC 목표
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          AI Foundry의 5-Stage 파이프라인이 추출한 지식(policies, ontologies, skills)을{' '}
          <strong>사람 개입 없이</strong> 실행 가능한 Working Prototype으로 변환할 수 있는지 검증한다.
          LPON 온누리상품권의 결제/취소 도메인을 대상으로 반제품 스펙 6종 + Working Version(14 파일, 1,610줄)을 자동 생성했다.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>입력</span>
          </div>
          <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div>Policies: 848 approved</div>
            <div>Ontologies: 848 terms</div>
            <div>Skills: 11 bundled (859 items)</div>
          </div>
        </Card>
        <Card className="p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ChevronRight className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>처리</span>
          </div>
          <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div>인터뷰 → PRD → 스펙 6종</div>
            <div>비즈니스 룰: {metrics.businessRules}개</div>
            <div>API 엔드포인트: {metrics.apiEndpoints}개</div>
          </div>
        </Card>
        <Card className="p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>출력</span>
          </div>
          <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div>Working Version: 14 파일</div>
            <div>테스트: 24개 (100% pass)</div>
            <div>DB 테이블: {metrics.dbTables}개</div>
          </div>
        </Card>
      </div>

      <Card className="p-5" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          파이프라인 흐름
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { step: '1', label: '인터뷰', color: '#3B82F6' },
            { step: '2', label: 'PRD', color: '#8B5CF6' },
            { step: '3', label: '외부 검토', color: '#F59E0B' },
            { step: '4', label: '스펙 6종', color: '#10B981' },
            { step: '5', label: 'Working Version', color: '#EF4444' },
            { step: '6', label: '테스트 검증', color: '#06B6D4' },
          ].map((item, i) => (
            <div key={item.step} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-4 h-4" style={{ color: 'var(--border)' }} />}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.step}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Tab: 인터뷰 ─── */

function InterviewTab() {
  return (
    <Card className="p-5" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5" style={{ color: '#3B82F6' }} />
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>인터뷰 로그</h3>
        <Badge className="text-xs" style={{ backgroundColor: 'color-mix(in srgb, #3B82F6 15%, transparent)', color: '#3B82F6', border: '1px solid #3B82F6' }}>
          자동 생성
        </Badge>
      </div>
      <MarkdownContent content={interview} />
    </Card>
  );
}

/* ─── Tab: PRD ─── */

function PrdTab() {
  return (
    <Card className="p-5" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5" style={{ color: '#8B5CF6' }} />
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>PRD (최종)</h3>
        <Badge className="text-xs" style={{ backgroundColor: 'color-mix(in srgb, #8B5CF6 15%, transparent)', color: '#8B5CF6', border: '1px solid #8B5CF6' }}>
          v4 final
        </Badge>
      </div>
      <MarkdownContent content={prd} />
    </Card>
  );
}

/* ─── Tab: 스펙 문서 (서브탭 6개) ─── */

function SpecDocsTab() {
  return (
    <Tabs defaultValue={specDocs[0].id}>
      <TabsList className="flex-wrap mb-4">
        {specDocs.map((doc) => (
          <TabsTrigger key={doc.id} value={doc.id} className="text-xs">
            {doc.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {specDocs.map((doc) => (
        <TabsContent key={doc.id} value={doc.id}>
          <Card className="p-5" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5" style={{ color: '#10B981' }} />
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {doc.label}
              </h3>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {doc.labelEn}
              </span>
            </div>
            <MarkdownContent content={doc.content} />
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

/* ─── Tab: Working Version (코드 뷰어) ─── */

function WorkingVersionTab() {
  const [selectedFile, setSelectedFile] = useState(codeFiles[0]!.path);
  const current = codeFiles.find((f) => f.path === selectedFile) ?? codeFiles[0]!;
  const categories = ['entry', 'domain', 'routes', 'test'] as const;

  return (
    <div className="grid grid-cols-[240px_1fr] gap-4">
      {/* File tree */}
      <Card className="p-3 h-fit" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3 px-1">
          <FolderTree className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {codeFiles.length} files
          </span>
        </div>
        {categories.map((cat) => {
          const files = codeFiles.filter((f) => f.category === cat);
          if (files.length === 0) return null;
          return (
            <div key={cat} className="mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: CATEGORY_COLORS[cat] }}>
                {CATEGORY_LABELS[cat]}
              </div>
              {files.map((file) => {
                const active = file.path === selectedFile;
                const fileName = file.path.split('/').pop()!;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    className="w-full text-left px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      backgroundColor: active ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {fileName}
                  </button>
                );
              })}
            </div>
          );
        })}
      </Card>

      {/* Code viewer */}
      <Card className="p-0 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <Code2 className="w-4 h-4" style={{ color: CATEGORY_COLORS[current.category] }} />
          <span className="text-xs font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
            {current.path}
          </span>
          <Badge
            className="text-[10px] ml-auto"
            style={{
              backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[current.category]} 15%, transparent)`,
              color: CATEGORY_COLORS[current.category],
              border: `1px solid ${CATEGORY_COLORS[current.category]}`,
            }}
          >
            {current.content.split('\n').length} lines
          </Badge>
        </div>
        <pre
          className="p-4 overflow-auto text-xs font-mono leading-relaxed max-h-[600px]"
          style={{ color: 'var(--text-primary)' }}
        >
          {current.content.split('\n').map((line, i) => (
            <div key={i} className="flex">
              <span
                className="inline-block w-10 text-right pr-3 select-none shrink-0"
                style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
              >
                {i + 1}
              </span>
              <span className="flex-1 whitespace-pre">{line}</span>
            </div>
          ))}
        </pre>
      </Card>
    </div>
  );
}

/* ─── Tab: 테스트 ─── */

function TestResultsTab() {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="text-3xl font-bold" style={{ color: '#10B981' }}>{testResults.totalTests}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Total Tests</div>
        </Card>
        <Card className="p-4 text-center" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="text-3xl font-bold" style={{ color: '#10B981' }}>{testResults.passed}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Passed</div>
        </Card>
        <Card className="p-4 text-center" style={{ backgroundColor: 'color-mix(in srgb, #10B981 5%, var(--bg-primary))', border: '1px solid #10B981' }}>
          <div className="text-3xl font-bold" style={{ color: '#10B981' }}>100%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Pass Rate</div>
        </Card>
      </div>

      {/* Per-suite */}
      <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Test Suite</th>
              <th className="text-center p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Tests</th>
              <th className="text-center p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Passed</th>
              <th className="text-center p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {testResults.suites.map((suite) => (
              <tr key={suite.name} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="p-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                  <TestTube2 className="w-3.5 h-3.5 inline mr-2" style={{ color: '#F59E0B' }} />
                  {suite.name}
                </td>
                <td className="p-3 text-center font-semibold" style={{ color: 'var(--text-primary)' }}>{suite.tests}</td>
                <td className="p-3 text-center font-semibold" style={{ color: '#10B981' }}>{suite.passed}</td>
                <td className="p-3 text-center">
                  <Badge
                    className="text-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, #10B981 15%, transparent)',
                      color: '#10B981',
                      border: '1px solid #10B981',
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    PASS
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ─── Tab: PDCA ─── */

function PdcaTab() {
  const phases = [
    {
      phase: 'Plan',
      color: '#3B82F6',
      items: [
        '인터뷰 기반 요구사항 수집 (10개 질문)',
        'PRD v1 → v4 반복 개선 (3회 외부 AI 검토)',
        '최종 PRD: 10개 기능, 42개 비즈니스 룰 정의',
      ],
    },
    {
      phase: 'Do',
      color: '#10B981',
      items: [
        '반제품 스펙 6종 자동 생성 (비즈니스 로직 ~ 화면 설계)',
        'Working Version 코드 생성 (14 파일, 1,610줄)',
        'DB 스키마 7 테이블, API 10 엔드포인트, 4 도메인 모듈',
      ],
    },
    {
      phase: 'Check',
      color: '#F59E0B',
      items: [
        '테스트 24개 전수 통과 (100%)',
        'Gap 분석 Match Rate: 93%',
        '사람 개입 횟수: 0회 (완전 자동)',
      ],
    },
    {
      phase: 'Act',
      color: '#8B5CF6',
      items: [
        '반제품 스펙 포맷 표준화 (AIF-REQ-027)',
        'PoC 보고서 Production 게시 (AIF-REQ-028)',
        '후속: LLM 생성기 5종 확장 (Sprint 2)',
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Match Rate Hero */}
      <Card
        className="p-5 text-center"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--accent) 5%, var(--bg-primary))',
          border: '1px solid var(--accent)',
        }}
      >
        <div className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>
          {metrics.pdcaMatchRate}%
        </div>
        <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          PDCA Gap Analysis Match Rate
        </div>
      </Card>

      {/* Phase cards */}
      <div className="grid grid-cols-2 gap-4">
        {phases.map((p) => (
          <Card key={p.phase} className="p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.phase[0]}
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{p.phase}</span>
            </div>
            <div className="space-y-1.5">
              {p.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: p.color }} />
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Key insight */}
      <Card className="p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>핵심 검증 결과</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          AI Foundry가 추출한 policies/ontologies/skills를 입력으로,{' '}
          <strong style={{ color: 'var(--text-primary)' }}>사람 개입 0회</strong>로
          실행 가능한 Working Prototype(스펙 6종 + 코드 14파일 + 테스트 24개 100%)을 생성할 수 있음을 확인했다.
          이는 역공학 출력이 순공학 입력으로 직접 연결되는 <strong style={{ color: 'var(--text-primary)' }}>Reverse-to-Forward Bridge</strong>의 실현 가능성을 증명한다.
        </p>
      </Card>
    </div>
  );
}

/* ─── Main Tabs ─── */

const TABS = [
  { id: 'overview', label: '개요', labelEn: 'Overview', icon: <FileText className="w-4 h-4" /> },
  { id: 'interview', label: '인터뷰', labelEn: 'Interview', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'prd', label: 'PRD', labelEn: 'PRD', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'specs', label: '스펙 문서', labelEn: 'Specs', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'code', label: 'Working Version', labelEn: 'Code', icon: <Code2 className="w-4 h-4" /> },
  { id: 'tests', label: '테스트', labelEn: 'Tests', icon: <TestTube2 className="w-4 h-4" /> },
  { id: 'pdca', label: 'PDCA', labelEn: 'PDCA', icon: <IterationCcw className="w-4 h-4" /> },
] as const;

export default function PocReportPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <FileText className="w-5 h-5" style={{ color: 'var(--accent-foreground)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            PoC 보고서
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            반제품 생성 엔진 — LPON 온누리상품권 결제/취소 파일럿
          </p>
        </div>
      </div>

      <MetricsBanner />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap mb-4">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs">
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="interview"><InterviewTab /></TabsContent>
        <TabsContent value="prd"><PrdTab /></TabsContent>
        <TabsContent value="specs"><SpecDocsTab /></TabsContent>
        <TabsContent value="code"><WorkingVersionTab /></TabsContent>
        <TabsContent value="tests"><TestResultsTab /></TabsContent>
        <TabsContent value="pdca"><PdcaTab /></TabsContent>
      </Tabs>

      {/* Footer */}
      <div
        className="mt-10 pt-6 text-center text-xs"
        style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}
      >
        AI Foundry v0.6.0 — 반제품 생성 엔진 PoC — KTDS AX BD Team
      </div>
    </div>
  );
}
