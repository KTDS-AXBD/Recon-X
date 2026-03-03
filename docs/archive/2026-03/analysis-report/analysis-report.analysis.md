# analysis-report Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: AI Foundry app-web
> **Analyst**: gap-detector agent
> **Date**: 2026-03-03
> **Design Doc**: 설계 명세 (사용자 제공 Plan 기반 구현 계획)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

문서별 3-Layer 분석 리포트 페이지 기능에 대해, 승인된 구현 계획(설계 명세)과 실제 구현 코드 간의 일치도를 검증한다.

### 1.2 Analysis Scope

- **Design Document**: 사용자 제공 설계 명세 (Plan에서 승인된 구현 계획)
- **Implementation Path**: `apps/app-web/src/` (pages, components/analysis-report, api)
- **Analysis Date**: 2026-03-03
- **Files Analyzed**: 신규 12개 + 수정 4개 = 총 16개 파일

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 File Structure (12 New Files)

| Design File | Implementation File | Status |
|-------------|---------------------|:------:|
| `api/analysis.ts` | `apps/app-web/src/api/analysis.ts` | Match |
| `pages/analysis-report.tsx` | `apps/app-web/src/pages/analysis-report.tsx` | Match |
| `components/analysis-report/ExtractionSummaryTab.tsx` | 동일 경로 | Match |
| `components/analysis-report/CoreProcessesTab.tsx` | 동일 경로 | Match |
| `components/analysis-report/DiagnosticFindingsTab.tsx` | 동일 경로 | Match |
| `components/analysis-report/ProcessTree.tsx` | 동일 경로 | Match |
| `components/analysis-report/ProcessDetailPanel.tsx` | 동일 경로 | Match |
| `components/analysis-report/RadarChart.tsx` | 동일 경로 | Match |
| `components/analysis-report/FindingCard.tsx` | 동일 경로 | Match |
| `components/analysis-report/MetricCard.tsx` | 동일 경로 | Match |
| `components/analysis-report/CategoryBadge.tsx` | 동일 경로 | Match |
| `components/analysis-report/SeverityBadge.tsx` | 동일 경로 | Match |

**Result**: 12/12 Match (100%)

### 2.2 Modified Files (4 Files)

| Design | Implementation | Status | Notes |
|--------|---------------|:------:|-------|
| `functions/api/[[path]].ts` — ROUTE_TABLE에 `analysis`, `analyze` 추가 | L38-39: `analysis: "svc-extraction"`, `analyze: "svc-extraction"` | Match | 정확히 일치 |
| `vite.config.ts` — SERVICE_MAP에 `analysis`, `analyze` 추가 | L19-20: `analysis: { service: "svc-extraction", port: 8702 }`, `analyze: { service: "svc-extraction", port: 8702 }` | Match | 정확히 일치 |
| `app.tsx` — `/analysis-report` 라우트 추가 | L17: lazy import, L44: `<Route path="/analysis-report">` | Match | 정확히 일치 |
| `Sidebar.tsx` — BarChart3 아이콘 + '분석 리포트' 메뉴 항목 | L7: `BarChart3` import, L60-65: label '분석 리포트' / labelEn 'Analysis Report' / path '/analysis-report' | Match | 정확히 일치 |

**Result**: 4/4 Match (100%)

### 2.3 API Client (6 Functions)

| Design Function | Implementation | URL | Method | Status |
|-----------------|:-------------:|-----|:------:|:------:|
| `fetchAnalysisSummary(documentId)` | L22-29 | GET `/analysis/:docId/summary` | GET | Match |
| `fetchCoreProcesses(documentId)` | L31-39 | GET `/analysis/:docId/core-processes` | GET | Match |
| `fetchFindings(documentId)` | L41-48 | GET `/analysis/:docId/findings` | GET | Match |
| `fetchFinding(documentId, findingId)` | L50-59 | GET `/analysis/:docId/findings/:id` | GET | Match |
| `reviewFinding(documentId, findingId, body)` | L61-77 | POST `.../review` | POST | Match |
| `triggerAnalysis(body)` | L79-92 | POST `/analyze` | POST | Match |

**Result**: 6/6 Match (100%)

### 2.4 Tab 1: ExtractionSummaryTab

| Design Item | Implementation | Status | Notes |
|-------------|---------------|:------:|-------|
| 4개 MetricCard (processes, entities, rules, relationships) | L85-88: GitBranch/processes, Box/entities, BookOpen/rules, Link2/relationships | Match | 4개 정확히 일치 |
| shadcn Table: 프로세스 중요도 랭킹 | L92-167: Table 컴포넌트 사용 | Match | |
| 테이블 열: 이름, 카테고리 뱃지, 중요도 점수, 참조 수 | L100-125: name, CategoryBadge, importanceScore, referenceCount | Match | |
| 정렬 가능 (importanceScore 기준) | L28-58: sortKey(importanceScore/referenceCount/name) + sortAsc 토글 | Match | 설계보다 확장 -- name/referenceCount도 정렬 가능 |
| 행 클릭 -> 탭 2로 이동 + 해당 프로세스 선택 (콜백 prop) | L25: `onProcessClick` prop, L133: `onClick={() => onProcessClick?.(proc.name)}` | Match | |
| Skeleton 로딩 상태 | L60-71: grid-cols-4 Skeleton + 테이블 Skeleton | Match | |

**Result**: 6/6 Match (100%)

### 2.5 Tab 2: CoreProcessesTab

| Design Item | Implementation | Status | Notes |
|-------------|---------------|:------:|-------|
| 좌측 60%: ProcessTree | L66: `grid-cols-1 lg:grid-cols-[60%_40%]`, L68-85: ProcessTree | Match | |
| 우측 40%: ProcessDetailPanel | L66: 40%, L87-93: ProcessDetailPanel | Match | |
| ProcessTree: 재귀 렌더링 | ProcessTree.tsx L83-89: 재귀 `<ProcessTree>` 호출 | Match | |
| ProcessTree: expand/collapse | ProcessTree.tsx L45: `useState(depth < 2)`, L61-63: toggle | Match | |
| ProcessTree: 카테고리 뱃지 | ProcessTree.tsx L80: `<CategoryBadge category={node.type} />` | Match | |
| ProcessDetailPanel: RadarChart | ProcessDetailPanel.tsx L50-53: `<RadarChart factors={judgment.factors} />` | Match | |
| ProcessDetailPanel: "왜 핵심인가" 판정 이유 텍스트 | ProcessDetailPanel.tsx L58-69: reasoning Card | Match | |
| ProcessDetailPanel: CoreJudgment 목록 (뱃지 + 신뢰도 점수) | ProcessDetailPanel.tsx L33-45: isCore Badge + score | Match | |

**Result**: 8/8 Match (100%)

### 2.6 RadarChart SVG

| Design Item | Implementation | Status | Notes |
|-------------|---------------|:------:|-------|
| viewBox 280x260 | L45: `viewBox="0 0 280 260"` | Match | |
| 중심 (140, 125) | L13-14: `CX = 140`, `CY = 125` | Match | |
| maxR=90 | L15: `MAX_R = 90` | Match | |
| 4겹 동심 다각형 (25%~100%) | L16: `LEVELS = [0.25, 0.5, 0.75, 1.0]`, L47-63 | Match | |
| 4개 축선 | L66-77: axes.map -> line | Match | |
| 데이터 다각형 (fill opacity 0.2) | L80-86: `fillOpacity="0.2"` | Match | |
| 데이터 점: circle r=4 | L97-105: `r="4"` | Match | |
| 라벨: 빈도, 의존성, 도메인 중요도, 데이터 흐름 | L12: `LABELS = ["빈도", "의존성", "도메인 중요도", "데이터 흐름"]` | Match | |
| useMemo로 좌표 계산 | L25-39: `useMemo` 사용 | Match | |

**Result**: 9/9 Match (100%)

### 2.7 Tab 3: DiagnosticFindingsTab

| Design Item | Implementation | Status | Notes |
|-------------|---------------|:------:|-------|
| 상단 3개 MetricCard (critical, warning, info 카운트) | L76-79: AlertTriangle/critical, AlertCircle/warning, Info/info | Match | |
| 필터 바: severity 버튼 그룹 | L58-63: severityButtons (all, critical, warning, info) | Match | |
| 필터 바: type 버튼 그룹 (all 포함) | L65-71: typeButtons (all, missing, duplicate, overspec, inconsistency) | Match | |
| FindingCard 배열 | L116-123: `filtered.map -> FindingCard` | Match | |
| FindingCard 접힌 상태: type 뱃지 + severity 뱃지 + finding 텍스트 + confidence | FindingCard.tsx L69-90 | Match | |
| FindingCard 펼친 상태: evidence, recommendation, 관련 프로세스, HITL 상태 | FindingCard.tsx L101-144 | Match | |
| HITL 액션: accept/reject/modify 버튼 + comment Textarea -> reviewFinding API | FindingCard.tsx L147-184: 3 Button + Textarea + handleReview | Match | |

**Result**: 7/7 Match (100%)

### 2.8 Routing & Navigation

| Design Item | Implementation | Status | Notes |
|-------------|---------------|:------:|-------|
| app.tsx: lazy import + Route `/analysis-report` | L17 + L44 | Match | |
| Sidebar.tsx: BarChart3 아이콘 | L7: `BarChart3` import, L62: `<BarChart3>` | Match | |
| Sidebar.tsx: '분석 리포트' / 'Analysis Report' | L62-64: label='분석 리포트', labelEn='Analysis Report' | Match | |
| URL 쿼리: `?doc=xxx` -> useSearchParams | analysis-report.tsx L29-33: `useSearchParams`, `searchParams.get("doc")` | Match | |

**Result**: 4/4 Match (100%)

### 2.9 Type Imports

| Design Type | Used In | Status | Notes |
|-------------|---------|:------:|-------|
| `ExtractionSummary` | analysis.ts L3, analysis-report.tsx L22, ExtractionSummaryTab.tsx L18 | Match | |
| `CoreIdentification` | analysis.ts L4, analysis-report.tsx L22, CoreProcessesTab.tsx L3 | Match | |
| `CoreJudgment` | CoreProcessesTab.tsx L3, ProcessDetailPanel.tsx L3 | Match | |
| `ProcessTreeNode` | CoreProcessesTab.tsx L3, ProcessTree.tsx L3, ProcessDetailPanel.tsx L3 | Match | |
| `DiagnosisFinding` | analysis.ts L6, DiagnosticFindingsTab.tsx L5, FindingCard.tsx L8 | Match | |
| `DiagnosisResult` | analysis.ts L6, analysis-report.tsx L23, DiagnosticFindingsTab.tsx L5 | Match | |
| `ScoredProcess` | ExtractionSummaryTab.tsx (간접 -- data.processes 배열) | Match | 타입 내부에서 사용 |
| `ApiResponse` | analysis.ts L2 | Match | |

**Result**: 8/8 Match (100%)

### 2.10 Reused Existing Components

| Design Component | Implementation Usage | Status |
|-----------------|---------------------|:------:|
| Card | ProcessDetailPanel.tsx, FindingCard.tsx | Match |
| Tabs | analysis-report.tsx L3 | Match |
| Badge | CategoryBadge.tsx, SeverityBadge.tsx, ProcessDetailPanel.tsx, FindingCard.tsx | Match |
| Table | ExtractionSummaryTab.tsx L10-16 | Match |
| Button | DiagnosticFindingsTab.tsx, FindingCard.tsx | Match |
| Skeleton | ExtractionSummaryTab.tsx, CoreProcessesTab.tsx, DiagnosticFindingsTab.tsx | Match |
| Textarea | FindingCard.tsx L6 | Match |
| toast (sonner) | analysis-report.tsx L11, FindingCard.tsx L7 | Match |
| Select | analysis-report.tsx L5-10 | Match |

**Result**: 9/9 Match (100%)

### 2.11 Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 100%                    |
+---------------------------------------------+
|  File Structure:       12/12 (100%)          |
|  Modified Files:        4/4  (100%)          |
|  API Client Functions:  6/6  (100%)          |
|  Tab 1 (Summary):       6/6  (100%)          |
|  Tab 2 (Core):          8/8  (100%)          |
|  RadarChart SVG:        9/9  (100%)          |
|  Tab 3 (Findings):      7/7  (100%)          |
|  Routing/Navigation:    4/4  (100%)          |
|  Type Imports:          8/8  (100%)          |
|  Reused Components:     9/9  (100%)          |
+---------------------------------------------+
|  Total Items: 73/73 Match                    |
+---------------------------------------------+
```

---

## 3. Missing Features (Design O, Implementation X)

**None found.** 설계에 명시된 모든 기능이 구현에 존재한다.

---

## 4. Added Features (Design X, Implementation O)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| 정렬 확장 | ExtractionSummaryTab.tsx L28-58 | name, referenceCount 정렬도 추가 (설계는 importanceScore만 언급) | Low (Positive) |
| 트리 노드 상세 | ProcessDetailPanel.tsx L72-134 | actors, dataInputs, dataOutputs, methods 표시 (설계에 구체적 명시 없음) | Low (Positive) |
| Reviewer 정보 표시 | FindingCard.tsx L138-143 | reviewedBy, reviewedAt, reviewerComment 표시 | Low (Positive) |
| handleRefreshFindings | analysis-report.tsx L110-119 | HITL 리뷰 완료 후 소견 목록 새로고침 콜백 | Low (Positive) |

**Assessment**: 추가된 기능은 모두 설계 의도와 일관된 방향의 개선이며, 부정적 영향이 없다.

---

## 5. Changed Features (Design != Implementation)

**None found.** 설계와 다르게 변경된 기능이 없다.

---

## 6. Convention Compliance

### 6.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | -- |
| Functions | camelCase | 100% | -- |
| Constants | UPPER_SNAKE_CASE | 100% | LABELS, CX, CY, MAX_R, LEVELS, HEADERS, API_BASE, TYPE_LABELS, CATEGORY_STYLES, SEVERITY_STYLES |
| Files (component) | PascalCase.tsx | 100% | -- |
| Files (utility) | camelCase.ts | 100% | analysis.ts |
| Folders | kebab-case | 100% | analysis-report/ |

### 6.2 Import Order

All 12 new files follow the standard import order:
1. External libraries (react, lucide-react, sonner)
2. Internal absolute imports (@/components/ui/..., @/api/..., @ai-foundry/types)
3. Relative imports (./MetricCard, ./CategoryBadge, etc.)
4. Type imports (import type)

**Compliance**: 100%

### 6.3 Convention Score

```
+---------------------------------------------+
|  Convention Compliance: 100%                 |
+---------------------------------------------+
|  Naming:           100%                      |
|  Import Order:     100%                      |
|  Folder Structure: 100%                      |
+---------------------------------------------+
```

---

## 7. Architecture Compliance

### 7.1 Layer Assignment

| Component | Layer | Actual Location | Status |
|-----------|-------|-----------------|:------:|
| API Client (analysis.ts) | Infrastructure | `src/api/` | Match |
| Page (analysis-report.tsx) | Presentation | `src/pages/` | Match |
| Tab Components | Presentation | `src/components/analysis-report/` | Match |
| UI Primitives | Presentation | `src/components/ui/` | Match |

### 7.2 Dependency Direction

| File | Layer | Dependencies | Violation? |
|------|-------|-------------|:----------:|
| analysis-report.tsx | Presentation | api/analysis (Infra), components (Pres), @ai-foundry/types (Domain) | No |
| ExtractionSummaryTab.tsx | Presentation | @ai-foundry/types (Domain), ./MetricCard (Pres) | No |
| FindingCard.tsx | Presentation | api/analysis (Infra), @ai-foundry/types (Domain) | No (*) |

(*) `FindingCard.tsx`는 Presentation 레이어에서 직접 `@/api/analysis`의 `reviewFinding`을 import한다. 엄밀한 Clean Architecture에서는 Service/Hook을 경유하는 것이 바람직하나, 이 프로젝트의 app-web은 Starter/Dynamic 수준의 구조를 채택하고 있어 허용 범위 내에 있다.

### 7.3 Architecture Score

```
+---------------------------------------------+
|  Architecture Compliance: 97%                |
+---------------------------------------------+
|  Layer Placement:   12/12 files correct      |
|  Dependency Direction: minor note (1 file)   |
+---------------------------------------------+
```

---

## 8. Overall Score

```
+---------------------------------------------+
|  Overall Score: 99/100                       |
+---------------------------------------------+
|  Design Match:        100% (73/73 items)     |
|  Convention:          100%                   |
|  Architecture:         97%                   |
+---------------------------------------------+
|  Match Rate:           100%                  |
|  Status:               PASS                  |
+---------------------------------------------+
```

---

## 9. Detailed File-by-Line Verification

### 9.1 `apps/app-web/src/api/analysis.ts` (93 lines)

- [x] Type imports: ApiResponse, ExtractionSummary, CoreIdentification, DiagnosisResult, DiagnosisFinding
- [x] API_BASE 환경변수 기반 (`VITE_API_BASE`)
- [x] HEADERS에 Content-Type, X-Internal-Secret, X-User-Id, X-User-Role, X-Organization-Id
- [x] 6개 함수 모두 올바른 시그니처와 URL 패턴
- [x] reviewFinding body: `{ action: "accept" | "reject" | "modify"; comment?: string }`
- [x] triggerAnalysis body: `{ documentId, extractionId, organizationId? }`

### 9.2 `apps/app-web/src/pages/analysis-report.tsx` (188 lines)

- [x] useSearchParams로 `?doc=xxx` 쿼리 파라미터 처리
- [x] 문서 목록 로드 (fetchDocuments)
- [x] selectedDocId 변경 시 3개 API 병렬 호출
- [x] 3개 탭: 추출 요약 / 핵심 프로세스 / 진단 소견
- [x] handleProcessClick: 탭 2 이동 + 프로세스 선택
- [x] handleRefreshFindings: 소견 새로고침

### 9.3 `apps/app-web/src/components/analysis-report/RadarChart.tsx` (127 lines)

- [x] viewBox="0 0 280 260", CX=140, CY=125, MAX_R=90
- [x] 4겹 동심 다각형 (0.25, 0.5, 0.75, 1.0)
- [x] 4축: frequencyScore, dependencyScore, domainRelevanceScore, dataFlowCentrality
- [x] 라벨: "빈도", "의존성", "도메인 중요도", "데이터 흐름"
- [x] fill opacity 0.2, circle r=4
- [x] useMemo 사용

### 9.4 `apps/app-web/src/components/analysis-report/FindingCard.tsx` (190 lines)

- [x] 접힌 상태: type 뱃지, severity 뱃지, HITL status 뱃지, finding 텍스트, confidence
- [x] 펼친 상태: evidence, recommendation, relatedProcesses, reviewer 정보
- [x] HITL 액션 (pending일 때만): accept/reject/modify + Textarea
- [x] reviewFinding API 호출 + toast 피드백

---

## 10. Recommended Actions

### 10.1 Minor Improvements (Optional, Non-blocking)

| Priority | Item | File | Notes |
|----------|------|------|-------|
| Low | Service layer 분리 | FindingCard.tsx | reviewFinding 직접 호출을 custom hook으로 분리하면 테스트 용이 |
| Low | Error boundary | analysis-report.tsx | 개별 탭 에러 시 전체 페이지가 죽지 않도록 |
| Low | Empty state UX | 전체 | 문서 목록이 비어있을 때의 안내 메시지 강화 |

### 10.2 Documentation Updates Needed

None. 설계 명세와 구현이 완벽히 일치한다.

---

## 11. Conclusion

설계 명세에서 정의한 **73개 검증 항목** 전체가 구현에 정확히 반영되어 있으며, 추가 구현된 4개 항목도 설계 방향과 일관성을 유지한다. Match Rate **100%** 로 Check 단계를 통과한다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial gap analysis | gap-detector agent |
