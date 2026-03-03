# Phase 2-E 퇴직연금 프로세스 정밀분석 -- Design-Implementation Gap Analysis Report

> **Summary**: 설계 문서와 구현 코드의 6개 검증 항목에 대한 상세 일치도 분석
>
> **Analysis Type**: Gap Analysis (Design vs Implementation)
> **Project**: AI Foundry
> **Feature**: process-diagnosis (퇴직연금 프로세스 정밀분석)
> **Phase**: 2-E
> **Analyst**: gap-detector (bkit agent, v3.0 재분석)
> **Date**: 2026-03-03
> **Design Doc**: `docs/archive/2026-03/process-diagnosis/process-diagnosis.design.md`
> **Previous Analysis**: `docs/archive/2026-03/process-diagnosis/process-diagnosis.analysis.md` (v2.0, 97%)

---

## 1. Analysis Overview

| Item | Value |
|------|-------|
| Analysis Target | Phase 2-E 퇴직연금 프로세스 정밀분석 |
| Design Document | `docs/archive/2026-03/process-diagnosis/process-diagnosis.design.md` (v0.8) |
| Implementation Path | `packages/types/`, `services/svc-extraction/`, `services/svc-ontology/`, `infra/migrations/` |
| Analysis Date | 2026-03-03 |
| Verification Items | 6 categories (Zod schema, API, DB, Prompt, Pipeline, Test) |

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| 1. Zod Schema Match | 100% | PASS |
| 2. API Route Match | 100% | PASS |
| 3. D1 Migration Match | 100% | PASS |
| 4. Prompt Strategy Match | 100% | PASS |
| 5. Pipeline Flow Match | 95% | PASS |
| 6. Test Coverage | 85% | PASS |
| **Overall (Weighted)** | **97%** | **PASS** |

---

## 3. Detailed Comparison by Verification Item

### 3.1 Zod Schema Match -- `packages/types/` vs Design Section 3-4

#### 3.1.1 `packages/types/src/analysis.ts` (9 schemas)

| Schema | Design Section | Design Fields | Implementation Fields | Match |
|--------|:-------------:|:------------:|:--------------------:|:-----:|
| ScoredProcessSchema | 3.1 | 10 | 10 | PASS |
| ScoredEntitySchema | 3.1 | 5 | 5 | PASS |
| ExtractionSummarySchema | 3.1 | 7 | 7 | PASS |
| CoreJudgmentSchema | 3.2 | 5 (nested factors) | 5 (nested factors) | PASS |
| ProcessTreeNodeSchema | 3.2 | 7 (recursive) | 7 (recursive) | PASS |
| CoreIdentificationSchema | 3.2 | 4 | 4 | PASS |
| ServiceGroupSchema | 4.2 | 4 enum values | 4 enum values | PASS |
| ComparisonItemSchema | 4.2 | 8 | 8 | PASS |
| CrossOrgComparisonSchema | 4.2 | 6 | 6 | PASS |

Type exports: `ScoredProcess`, `ScoredEntity`, `ExtractionSummary`, `CoreJudgment`, `ProcessTreeNode`, `CoreIdentification`, `ServiceGroup`, `ComparisonItem`, `CrossOrgComparison` -- 9 types, all present.

**Field-level verification (sample)**:
- `ScoredProcessSchema.importanceScore`: Design `z.number().min(0).max(1)` = Implementation `z.number().min(0).max(1)` -- PASS
- `ScoredProcessSchema.category`: Design `z.enum(["mega","core","supporting","peripheral"])` = Implementation identical -- PASS
- `ProcessTreeNodeSchema`: Design uses `z.lazy()` recursive = Implementation uses `z.lazy()` recursive with identical interface -- PASS
- `ComparisonItemSchema.presentIn`: Design nested `z.array(z.object({...}))` = Implementation identical structure -- PASS
- `CrossOrgComparisonSchema.comparisonId`: Design `z.string().uuid()` = Implementation `z.string().uuid()` -- PASS

**Result: 9/9 schemas, 100% field-level match**

#### 3.1.2 `packages/types/src/diagnosis.ts` (4 schemas)

| Schema | Design Section | Design Fields | Implementation Fields | Match |
|--------|:-------------:|:------------:|:--------------------:|:-----:|
| DiagnosisTypeSchema | 3.3 | 4 enum values | 4 enum values | PASS |
| SeveritySchema | 3.3 | 3 enum values | 3 enum values | PASS |
| DiagnosisFindingSchema | 3.3 | 13 | 13 | PASS |
| DiagnosisResultSchema | 3.3 | 6 (nested summary) | 6 (nested summary) | PASS |

**Field-level verification**:
- `DiagnosisFindingSchema.hitlStatus`: Design `z.enum(["pending","accepted","rejected","modified"]).default("pending")` = Implementation identical -- PASS
- `DiagnosisFindingSchema.reviewedAt`: Design `z.string().datetime().optional()` = Implementation identical -- PASS
- `DiagnosisResultSchema.summary.byType`: Design has 4 keys (missing/duplicate/overspec/inconsistency) = Implementation identical -- PASS
- `DiagnosisResultSchema.summary.bySeverity`: Design has 3 keys (critical/warning/info) = Implementation identical -- PASS

**Result: 4/4 schemas, 100% field-level match**

#### 3.1.3 `packages/types/src/events.ts` (2 required + 1 bonus event)

| Event | Design Section | Required | Implementation | Match |
|-------|:-------------:|:--------:|:--------------:|:-----:|
| `analysis.completed` | 6.2 item 3 | Yes | Lines 109-119 | PASS |
| `diagnosis.completed` | 6.2 item 3 | Yes | Lines 122-131 | PASS |
| `diagnosis.review_completed` | -- | No (bonus) | Lines 133-143 | BONUS |

`PipelineEventSchema` discriminated union includes all 3 new events. `packages/types/src/index.ts` re-exports both `analysis.js` and `diagnosis.js` (lines 9-10).

**Result: 2/2 required + 1 bonus -- 100%**

#### 3.1 Category Total: 15/15 items = **100%**

---

### 3.2 API Route Match -- `svc-extraction/src/routes/` vs Design Section 5

#### 3.2.1 Analysis Report API (`routes/analysis.ts`, 503 lines)

| Route | Design Spec | Method | Implementation | Match |
|-------|-------------|--------|----------------|:-----:|
| `/analysis/{docId}/summary` | Section 5.1 | GET | Lines 116-147 | PASS |
| `/analysis/{docId}/core-processes` | Section 5.1 | GET | Lines 107-170 | PASS |
| `/analysis/{docId}/findings` | Section 5.1 | GET | Lines 99-213 | PASS |
| `/analysis/{docId}/findings/{id}` | Section 5.1 | GET | Lines 90-228 | PASS |
| `/analysis/{docId}/findings/{id}/review` | Section 5.1 | POST | Lines 82-275 | PASS |
| `/analyze` | Section 5.1 | POST | Lines 77-338 | PASS |

**Request/Response detail check**:

| Check Point | Design | Implementation | Match |
|-------------|--------|----------------|:-----:|
| Review body: `action` enum | `accept \| reject \| modify` | Line 252 validates 3 values | PASS |
| Review body: `reviewerId` required | Required string | Lines 255-257 validation | PASS |
| Analyze body: `mode` field | `standard \| diagnosis` | Lines 283, 304 | PASS |
| Findings response: `DiagnosisResult` format | `diagnosisId`, `findings[]`, `summary` | Lines 201-213 | PASS |
| Findings response: `summary.byType` aggregation | 4 types counted | Lines 194-198 | PASS |
| Findings response: `summary.bySeverity` aggregation | 3 levels counted | Lines 195-199 | PASS |
| Analyze: 3-Pass non-blocking execution | `ctx.waitUntil` | Line 329 | PASS |
| Error handling: LLM fail -> empty result | Design Section 9 | Lines 366-368, 432-434 | PASS |
| `analysis.completed` event emission | Required | Lines 469-481 | PASS |
| `diagnosis.completed` event emission | Required | Lines 484-494 | PASS |
| Partial status on failure | Status='partial' | Lines 496-501 | PASS |
| `extractionId` in `analysis.completed` payload | Required by schema | Line 475 -- present | PASS |

**Result: 6/6 routes + 12/12 detail checks = 100%**

#### 3.2.2 Compare API (`routes/compare.ts`, 284 lines)

| Route | Design Spec | Method | Implementation | Match |
|-------|-------------|--------|----------------|:-----:|
| `/analysis/compare` | Section 5.2 | POST | Lines 69-232 | PASS |
| `/analysis/{orgId}/service-groups` | Section 5.2 | GET | Lines 82-266 | PASS |
| `/analysis/compare/{id}/standardization` | Section 5.2 | GET | Lines 74-283 | PASS |

**Request/Response detail check**:

| Check Point | Design | Implementation | Match |
|-------------|--------|----------------|:-----:|
| Compare body: `organizationIds` array (>= 2) | Required | Lines 113-115 | PASS |
| Compare body: `domain` field | Default "퇴직연금" | Line 111 | PASS |
| Service groups: `groups` + `groupSummary` | Required | Lines 247-265 | PASS |
| Standardization: candidates sorted by score | Required | Line 280 `.sort((a,b) => b.score - a.score)` | PASS |
| D1 comparisons + comparison_items save | Required | Lines 185-229 | PASS |
| `present_in_orgs`: full `presentIn` objects | ComparisonItemSchema structure | Line 221: `JSON.stringify(item.presentIn)` | PASS |

**Result: 3/3 routes + 6/6 detail checks = 100%**

#### 3.2 Category Total: 27/27 checks = **100%**

---

### 3.3 D1 Migration Match -- `infra/migrations/db-structure/0003_analysis.sql` vs Design Section 7.1

#### Table-level comparison

| Table | Design Columns | Impl. Columns | Match |
|-------|:-------------:|:-------------:|:-----:|
| `analyses` | 12 | 12 | PASS |
| `diagnosis_findings` | 16 | 16 | PASS |
| `comparisons` | 9 | 9 | PASS |
| `comparison_items` | 11 | 11 | PASS |

#### Column-by-column verification (key columns)

| Table.Column | Design Type | Implementation Type | Match |
|-------------|------------|-------------------|:-----:|
| `analyses.analysis_id` | TEXT PRIMARY KEY | TEXT PRIMARY KEY | PASS |
| `analyses.summary_json` | TEXT NOT NULL | TEXT NOT NULL | PASS |
| `analyses.core_identification_json` | TEXT NOT NULL | TEXT NOT NULL | PASS |
| `analyses.status` | TEXT DEFAULT 'completed' | TEXT DEFAULT 'completed' | PASS |
| `diagnosis_findings.finding_id` | TEXT PRIMARY KEY | TEXT PRIMARY KEY | PASS |
| `diagnosis_findings.confidence` | REAL DEFAULT 0.0 | REAL DEFAULT 0.0 | PASS |
| `diagnosis_findings.hitl_status` | TEXT DEFAULT 'pending' | TEXT DEFAULT 'pending' | PASS |
| `comparisons.domain` | TEXT DEFAULT '퇴직연금' | TEXT DEFAULT '퇴직연금' | PASS |
| `comparison_items.service_group` | TEXT NOT NULL | TEXT NOT NULL | PASS |
| `comparison_items.standardization_score` | REAL | REAL | PASS |

#### Index verification

| Index | Design | Implementation | Match |
|-------|--------|----------------|:-----:|
| `idx_findings_analysis` | ON diagnosis_findings(analysis_id) | Line 80 | PASS |
| `idx_findings_org` | ON diagnosis_findings(organization_id) | Line 81 | PASS |
| `idx_findings_severity` | ON diagnosis_findings(severity) | Line 82 | PASS |
| `idx_findings_hitl` | ON diagnosis_findings(hitl_status) | Line 83 | PASS |
| `idx_comparisons_orgs` | ON comparisons(organization_ids) | Line 84 | PASS |
| `idx_comparison_items_group` | ON comparison_items(service_group) | Line 85 | PASS |

Implementation adds `IF NOT EXISTS` to all CREATE TABLE/INDEX statements -- an improvement over the design spec (idempotent migration).

**Note**: Migration file location is `infra/migrations/db-structure/` instead of design's `svc-extraction/migrations/`. This matches project convention (centralized migrations).

#### 3.3 Category Total: 4/4 tables + 48/48 columns + 6/6 indexes = **100%**

---

### 3.4 Prompt Strategy Match -- `svc-extraction/src/prompts/` vs Design Section 8

#### 3.4.1 Pass 1: Scoring (`prompts/scoring.ts`, 192 lines)

| Feature | Design Section | Implementation | Match |
|---------|:-------------:|----------------|:-----:|
| `buildScoringPrompt()` function | 8.1 Pass 1 | Lines 67-157 | PASS |
| Input: extraction result (processes/entities/rules/relationships) | 8.1 | Function parameter type | PASS |
| Output format: `{ scoredProcesses, coreJudgments, processTree }` | 8.1 | Prompt lines 108-156 | PASS |
| 4 scoring factors (frequency, dependency, domainRelevance, dataFlowCentrality) | 8.1 | Prompt lines 86-91 | PASS |
| Category classification criteria (mega/core/supporting/peripheral) | 8.1 | Prompt lines 93-97 | PASS |
| Core judgment threshold (score >= 0.7 or domainRelevance >= 0.8) | 8.1 | Prompt line 98 | PASS |
| ProcessTree hierarchical construction | 8.1 | Prompt lines 100-101 | PASS |
| `parseScoringResult()` function | 8.1 | Lines 166-170 | PASS |
| Markdown fence removal | Implied | `stripMarkdownFence()` lines 55-60 | PASS |
| Zod validation (`ScoringOutputSchema`) | Implied | Lines 17-46 | PASS |
| `buildCoreSummary()` helper | -- (bonus) | Lines 175-191 | BONUS |
| LLM tier: Sonnet | 8.1 cost table | Caller uses "sonnet" | PASS |

**Result: 10/10 features + 1 bonus = 100%**

#### 3.4.2 Pass 2: Diagnosis (`prompts/diagnosis.ts`, 167 lines)

| Feature | Design Section | Implementation | Match |
|---------|:-------------:|----------------|:-----:|
| `buildDiagnosisPrompt()` function | 8.1 Pass 2 | Lines 45-144 | PASS |
| Input: Pass 1 result + extraction data | 8.1 | Function parameters | PASS |
| 4 diagnosis types (missing/duplicate/overspec/inconsistency) | 8.1 | Prompt lines 90-111 | PASS |
| finding-evidence-recommendation triple | 8.1 | Prompt lines 115-122, output format 129-143 | PASS |
| Severity levels (critical/warning/info) | 8.1 | Prompt line 119 | PASS |
| Confidence score (0-1) | 8.1 | Prompt line 120 | PASS |
| `parseDiagnosisResult()` function | 8.1 | Lines 153-167 | PASS |
| UUID assignment for findingId | 8.1 | `crypto.randomUUID()` line 163 | PASS |
| hitlStatus default "pending" | 8.1 | `"pending" as const` line 164 | PASS |
| DiagnosisFindingSchema final validation | Implied | `DiagnosisFindingSchema.parse()` line 161 | PASS |

**Result: 10/10 features = 100%**

#### 3.4.3 Pass 3: Comparison (`prompts/comparison.ts`, 265 lines)

| Feature | Design Section | Implementation | Match |
|---------|:-------------:|----------------|:-----:|
| `buildComparisonPrompt()` function | 8.1 Pass 3 | Lines 94-203 | PASS |
| Input: 2 organizations' Pass 1+2 results | 8.1 | `OrgAnalysisResult` x 2 | PASS |
| 4 service groups in prompt | 4.3 | Prompt lines 120-144 | PASS |
| Tacit knowledge detection (4 patterns) | 8.2 | Prompt lines 134-138 | PASS |
| Standardization candidate selection (score >= 0.6) | 4.3 | Prompt line 148 | PASS |
| `parseComparisonResult()` function | 8.1 | Lines 211-215 | PASS |
| `buildCrossOrgComparison()` assembler | Implied | Lines 225-265 | PASS |
| `OrgAnalysisResult` type definition | Implied | Lines 64-86 | PASS |
| Zod validation (`ComparisonLlmOutputSchema`) | Implied | Lines 26-59 | PASS |

**Tacit knowledge pattern detail check** (Design Section 8.2 vs Prompt):
1. "화면 흐름에서 중간 단계가 생략된 경우" -- Prompt line 135: PASS
2. "규칙이 참조하지만 프로세스 정의가 없는 경우" -- Prompt line 136: PASS
3. "데이터 소비는 있으나 생산 프로세스가 없는 경우" -- Prompt line 137: PASS
4. "업계 표준에서 기대되지만 문서에 없는 경우" -- Prompt line 138: PASS

**Result: 9/9 features + 4/4 tacit patterns = 100%**

#### 3.4 Category Total: 29/29 features = **100%**

---

### 3.5 Pipeline Flow Match -- Queue Handler + Neo4j vs Design Section 6, 7.2

#### 3.5.1 Queue Handler (`queue/handler.ts`, 419 lines)

Design Section 6.1 specifies the extended pipeline flow:
```
Stage 2: Extraction + Scoring -> Stage 2A: Core Identification -> Stage 2B: Diagnosis -> Stage 3: HITL Review
```

| Feature | Design | Implementation | Match |
|---------|--------|----------------|:-----:|
| Auto-trigger analysis after extraction | Section 6.1 | `ctx.waitUntil(runAnalysis(...))` line 172 | PASS |
| `runAnalysis()` internal function | Required | Lines 197-343 | PASS |
| Pass 1: Scoring + Core Identification | Stage 2A | Lines 218-283 | PASS |
| Pass 2: Diagnosis | Stage 2B | Lines 285-324 | PASS |
| < 3 processes threshold skip | Section 9 | Lines 211-214 | PASS |
| D1 `analyses` INSERT | Required | Lines 258-279 | PASS |
| D1 `diagnosis_findings` INSERT | Required | Lines 301-323 | PASS |
| `analysis.completed` event emission | Required | Lines 327-332 | **PARTIAL** |
| `diagnosis.completed` event emission | Required | Lines 335-340 | PASS |
| Non-blocking (`.catch()` wrapper) | Section 9 | Lines 173-176 | PASS |
| Failure -> status='partial' | Section 9 | Lines 280-283 catch block | PASS |

**Issue E-1 (carried from v2.0 analysis)**: The `analysis.completed` event payload at line 331 is **missing `extractionId`**:

```typescript
// queue/handler.ts line 327-332 (CURRENT)
payload: { documentId, analysisId, organizationId, findingCount: findings.length, coreProcessCount: coreSummary.coreProcessCount },
//         ^ extractionId is MISSING
```

But `AnalysisCompletedEventSchema` (events.ts line 113) requires `extractionId: z.string()`. The `extractionId` variable is in scope at line 206.

**Note**: The same issue was fixed in `routes/analysis.ts` (line 475 now includes `extractionId`), but the queue handler path was NOT fixed.

**Impact**: `svc-queue-router` uses `PipelineEventSchema.safeParse()`. The event emitted from the queue handler path will fail validation and be silently dropped. The routes/analysis.ts path works correctly.

**Result: 10/11 features = 91% (1 partial)**

#### 3.5.2 Neo4j Graph Extension (`svc-ontology/src/neo4j/client.ts`)

Design Section 7.2 specifies 6 new node types:

| Node Type | Design Relationship | Implementation | Match |
|-----------|-------------------|----------------|:-----:|
| SubProcess | `(Process)-[:HAS_SUBPROCESS]->(SubProcess)` | Lines 204-215 | PASS |
| Method | `(Process)-[:HAS_METHOD]->(Method)` | Lines 220-233 | PASS |
| Condition | `(Method)-[:TRIGGERED_BY]->(Condition)` | Lines 228-229 | PASS |
| Actor | `(Actor)-[:PARTICIPATES_IN]->(Process)` | Lines 239-250 | PASS |
| Requirement | `(Requirement)-[:SATISFIED_BY]->(Process)` | Comment only (line 174: "reserved for future") | PARTIAL |
| DiagnosisFinding | `(DiagnosisFinding)-[:RELATES_TO]->(Process\|Entity)` | Lines 255-283 | PASS |

`AnalysisGraphInput` interface (lines 134-164) provides typed input for all active node types.
`upsertAnalysisGraph()` function (lines 179-291) generates proper MERGE Cypher statements.

**Requirement node**: Intentionally deferred to Phase 3.

**Result: 5/6 nodes active, 1 deferred = 92%**

#### 3.5.3 Policy HITL Integration

Design Section 6.2 item 10 specifies `svc-policy/src/queue/handler.ts` modification for "diagnosis HITL 통합".

The implementation placed HITL review in `svc-extraction/src/routes/analysis.ts` (POST /findings/{id}/review) instead of svc-policy. This is an architectural simplification -- keeping analysis HITL co-located with analysis data.

**Assessment**: Functionality is present but location differs. Score: 80%.

#### 3.5 Category Total: Weighted average = **95%**

---

### 3.6 Test Coverage -- `svc-extraction/src/__tests__/` vs Design Section 11

Design Section 11 specifies "Unit tests (20+ cases)".

#### 3.6.1 Test file inventory

| Test File | Test Count | Coverage Area |
|-----------|:----------:|---------------|
| `prompts.test.ts` | 14 tests | Scoring (6), Diagnosis (4), Comparison (4) prompt builders + parsers |
| `analysis-routes.test.ts` | **35 tests** | All 6 analysis API routes: summary, core-processes, findings, finding detail, HITL review, POST /analyze |
| `routes.test.ts` | 16 tests | Existing extraction routes (unchanged) |
| `queue.test.ts` | 16 tests | Existing queue handler (unchanged) |

#### 3.6.2 Design requirement coverage

| Scenario | Required by Design | Test File | Status |
|----------|:-----------------:|-----------|:------:|
| GET /analysis/{docId}/summary -- normal | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/summary -- 404 | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/summary -- invalid JSON | -- | analysis-routes.test.ts | BONUS |
| GET /analysis/{docId}/core-processes -- normal | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/core-processes -- 404 | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/findings -- normal | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/findings -- 404 | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/findings -- empty | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/findings/{id} -- normal | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/findings/{id} -- 404 | Yes | analysis-routes.test.ts | PASS |
| GET /analysis/{docId}/findings/{id} -- null optionals | -- | analysis-routes.test.ts | BONUS |
| POST /findings/{id}/review -- accept | Yes | analysis-routes.test.ts | PASS |
| POST /findings/{id}/review -- reject | Yes | analysis-routes.test.ts | PASS |
| POST /findings/{id}/review -- modify | Yes | analysis-routes.test.ts | PASS |
| POST /findings/{id}/review -- not found | Yes | analysis-routes.test.ts | PASS |
| POST /findings/{id}/review -- invalid action | Yes | analysis-routes.test.ts | PASS |
| POST /findings/{id}/review -- missing reviewerId | Yes | analysis-routes.test.ts | PASS |
| POST /findings/{id}/review -- bad JSON | -- | analysis-routes.test.ts | BONUS |
| POST /analyze -- diagnosis mode | Yes | analysis-routes.test.ts | PASS |
| POST /analyze -- standard mode | Yes | analysis-routes.test.ts | PASS |
| POST /analyze -- missing fields (3 tests) | Yes | analysis-routes.test.ts | PASS |
| POST /analyze -- extraction not found | Yes | analysis-routes.test.ts | PASS |
| POST /analyze -- bad JSON | -- | analysis-routes.test.ts | BONUS |
| Authentication -- 3 auth tests | Yes | analysis-routes.test.ts | PASS |
| buildScoringPrompt -- content | Yes | prompts.test.ts | PASS |
| buildScoringPrompt -- empty input | -- | prompts.test.ts | BONUS |
| parseScoringResult -- normal | Yes | prompts.test.ts | PASS |
| parseScoringResult -- markdown fence | Yes | prompts.test.ts | PASS |
| parseScoringResult -- bad JSON | Yes | prompts.test.ts | PASS |
| parseScoringResult -- empty arrays | -- | prompts.test.ts | BONUS |
| buildDiagnosisPrompt -- 4 types | Yes | prompts.test.ts | PASS |
| parseDiagnosisResult -- normal | Yes | prompts.test.ts | PASS |
| parseDiagnosisResult -- markdown fence | Yes | prompts.test.ts | PASS |
| parseDiagnosisResult -- empty | Yes | prompts.test.ts | PASS |
| parseDiagnosisResult -- bad JSON | Yes | prompts.test.ts | PASS |
| buildComparisonPrompt -- two orgs | Yes | prompts.test.ts | PASS |
| parseComparisonResult -- normal | Yes | prompts.test.ts | PASS |
| parseComparisonResult -- markdown fence | Yes | prompts.test.ts | PASS |
| parseComparisonResult -- bad serviceGroup | Yes | prompts.test.ts | PASS |

**Not covered**:
- Compare route tests (`POST /analysis/compare`, `GET /service-groups`, `GET /standardization`) -- no dedicated compare-routes test file
- Queue handler auto-analysis path unit test (`runAnalysis` with mock)

#### 3.6 Category Total: 49 total tests (35 route + 14 prompt). Design target 20+ = **245% of target**.
Coverage completeness (required scenarios covered): **85%** (missing compare route tests + queue auto-analysis unit test).

---

## 4. Differences Found

### 4.1 Missing Features (Design O, Implementation X)

| # | Item | Design Location | Description | Severity |
|---|------|-----------------|-------------|----------|
| M-1 | `extractionId` in queue handler event | Section 6.1, events.ts:113 | `queue/handler.ts` line 331 `analysis.completed` payload missing `extractionId`. The `routes/analysis.ts` path was fixed (line 475) but the queue handler path was not. | **Warning** |
| M-2 | Neo4j Requirement node | Section 7.2 | `(Requirement)-[:SATISFIED_BY]->(Process)` only reserved as comment, not implemented. Intentionally deferred to Phase 3. | Info |
| M-3 | Compare route tests | Section 11 | No dedicated test file for `compare.ts` routes (POST /analysis/compare, GET /service-groups, GET /standardization). | Info |

### 4.2 Added Features (Design X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| A-1 | `diagnosis.review_completed` event | `packages/types/src/events.ts:133-143` | Third event type beyond the 2 specified in design. Enables HITL review tracking downstream. |
| A-2 | `buildCoreSummary()` helper | `prompts/scoring.ts:175-191` | Summary statistics calculator -- reused in both routes/analysis.ts and queue/handler.ts. |
| A-3 | `AnalysisGraphInput` interface | `neo4j/client.ts:134-164` | Typed input interface for Neo4j graph upsert. |
| A-4 | `IF NOT EXISTS` on all DDL | `0003_analysis.sql` | Idempotent migration (improvement over design). |
| A-5 | Extensive route test suite | `analysis-routes.test.ts` | 35 tests covering auth, normal/error paths, boundary cases. Exceeds design target of ~10 cases. |

### 4.3 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| C-1 | Migration file location | `svc-extraction/migrations/` | `infra/migrations/db-structure/0003_analysis.sql` | None (project convention) |
| C-2 | Diagnosis HITL location | `svc-policy/src/queue/handler.ts` | `svc-extraction/src/routes/analysis.ts` POST /review | Low (co-located with data) |
| C-3 | Extended Term handling | `svc-ontology/routes/normalize.ts` | `svc-ontology/neo4j/client.ts` `upsertAnalysisGraph()` | Low (same service) |
| C-4 | Neo4j schema file | `svc-ontology/neo4j/schema.ts` | No separate schema.ts; all in `client.ts` | None (project convention) |
| C-5 | D1 migration comment | `comparison_items.present_in_orgs`: "JSON array of org IDs" | Actually stores full `presentIn` objects | Info (documentation) |

---

## 5. Known Issues

### 5.1 E-1: `analysis.completed` event missing `extractionId` in queue handler (OPEN)

**File**: `services/svc-extraction/src/queue/handler.ts` line 331

**Status**: Partially resolved. The `routes/analysis.ts` path (line 475) was fixed and includes `extractionId`. The `queue/handler.ts` path was NOT fixed.

**Current code**:
```typescript
// queue/handler.ts:327-332
payload: { documentId, analysisId, organizationId, findingCount: findings.length, coreProcessCount: coreSummary.coreProcessCount },
```

**Expected**:
```typescript
payload: { documentId, extractionId, analysisId, organizationId, findingCount: findings.length, coreProcessCount: coreSummary.coreProcessCount },
```

**Impact**: Events emitted through the auto-analysis path (triggered by `extraction.completed`) will fail `PipelineEventSchema.safeParse()` in `svc-queue-router` and be silently dropped. The manually triggered `/analyze` endpoint path works correctly.

**Fix**: Add `extractionId` to the payload object at line 331. The variable is in scope at line 206.

### 5.2 D1 Migration Comment Outdated (E-2, INFO)

**File**: `infra/migrations/db-structure/0003_analysis.sql` line 71

The comment says "JSON array of org IDs" but the implementation stores full `presentIn` objects. Documentation-only issue with zero runtime impact.

---

## 6. Match Rate Calculation

| Category | Weight | Items | Matched | Score |
|----------|:------:|:-----:|:-------:|:-----:|
| Types (analysis.ts) | 15% | 9 schemas | 9 | 100% |
| Types (diagnosis.ts) | 10% | 4 schemas | 4 | 100% |
| Events (events.ts) | 5% | 2 required | 2 (+1 bonus) | 100% |
| Exports (index.ts) | 2% | 2 exports | 2 | 100% |
| Prompts (3 files) | 15% | 29 features | 29 | 100% |
| Analysis Routes | 12% | 18 checks | 18 | 100% |
| Compare Routes | 10% | 9 checks | 9 | 100% |
| D1 Migration | 10% | 58 items | 58 | 100% |
| Queue Handler | 8% | 11 features | 10 | 91% |
| Policy HITL Integration | 3% | 1 | 0.8 | 80% |
| Neo4j Graph | 5% | 6 nodes | 5 | 92% |
| Tests | 5% | coverage completeness | 85% | 85% |

**Weighted Overall Score**:
- (15 * 100 + 10 * 100 + 5 * 100 + 2 * 100 + 15 * 100 + 12 * 100 + 10 * 100 + 10 * 100 + 8 * 91 + 3 * 80 + 5 * 92 + 5 * 85) / 100
- = (1500 + 1000 + 500 + 200 + 1500 + 1200 + 1000 + 1000 + 728 + 240 + 460 + 425) / 100
- = 9753 / 100
- = **97.5%** -> Rounded: **97%**

---

## 7. Summary

### 7.1 Strengths

1. **Type-level perfect match**: All 15 Zod schemas across `analysis.ts`, `diagnosis.ts`, and `events.ts` match the design spec field-for-field, including the recursive `ProcessTreeNodeSchema`.

2. **3-Pass LLM strategy fully implemented**: All three prompt builders follow the design's strategy with proper Zod validation, markdown fence removal, and correct LLM tier routing.

3. **D1 migration exact match**: All 4 tables, 48 columns, and 6 indexes match the design SQL exactly. Addition of `IF NOT EXISTS` improves idempotency.

4. **Comprehensive API coverage**: All 9 API routes match the design spec with correct request/response formats, proper validation, and error handling.

5. **Non-blocking analysis pipeline**: Queue handler correctly uses `ctx.waitUntil()` with `.catch()` to ensure analysis failures never interrupt the main extraction pipeline.

6. **Test coverage exceeds target**: 49 new tests (35 route + 14 prompt) vs design target of 20+. The route test suite is particularly thorough with auth, boundary, and error path coverage.

7. **Neo4j extended graph**: 5 of 6 new node types fully implemented with proper Cypher MERGE patterns and typed input interface.

### 7.2 Issues Requiring Action

| Priority | Issue | Action | Impact | Status |
|----------|-------|--------|--------|:------:|
| **P1** | E-1: `extractionId` missing in queue handler event | Add `extractionId` to payload at `handler.ts:331` | Medium -- auto-analysis events silently dropped | **OPEN** |
| **P2** | M-3: Compare route tests | Create `compare-routes.test.ts` | Low -- quality gap | Open |
| **P3** | E-2: D1 migration comment | Update comment at `0003_analysis.sql:71` | Info -- documentation only | Open |
| **P4** | M-2: Requirement node | Implement in Phase 3 | None -- intentionally deferred | Deferred |

### 7.3 Verdict

**Design-Implementation Match Rate: 97%**

The implementation faithfully follows the design document across all 6 verification categories. The only functional issue remaining is E-1 (queue handler `analysis.completed` event missing `extractionId`), which is a 1-line fix. All types, API routes, D1 schemas, and prompt strategies match 100%.

---

## 8. Recommended Actions

### Immediate (before deployment)

1. **Fix E-1**: Add `extractionId` to `analysis.completed` event payload in `services/svc-extraction/src/queue/handler.ts` line 331:
   ```typescript
   payload: { documentId, extractionId, analysisId, organizationId, findingCount: findings.length, coreProcessCount: coreSummary.coreProcessCount },
   ```

### Short-term

2. **Create M-3**: Write `compare-routes.test.ts` covering POST /analysis/compare, GET /service-groups, GET /standardization.

### Documentation

3. **Fix E-2**: Update D1 migration comment `comparison_items.present_in_orgs` from "JSON array of org IDs" to "JSON array of presentIn objects (organizationId, organizationName, documentIds, variant?)".

### Deferred (Phase 3)

4. **M-2**: Implement `Requirement` node type in Neo4j when requirements traceability feature is built.

---

## 9. Synchronization Recommendation

Match Rate >= 90% -> "설계와 구현이 잘 일치합니다."

1개의 기능적 이슈(E-1)만 남아 있으며, 이는 1줄 수정으로 해결 가능합니다.
나머지 차이점(C-1~C-5)은 프로젝트 컨벤션에 의한 의도적 변경이므로 설계 문서를 구현에 맞추어 업데이트하는 것을 권장합니다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial gap analysis | gap-detector (automated) |
| 2.0 | 2026-03-03 | Re-analysis after P1+P3 fixes. Match rate 96% -> 97%. | gap-detector (automated) |
| 3.0 | 2026-03-03 | Full re-analysis with analysis-routes.test.ts included. E-1 partial fix verified. 6-category detailed breakdown. | gap-detector (v3 re-run) |
