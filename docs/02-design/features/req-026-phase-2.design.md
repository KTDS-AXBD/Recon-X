---
code: AIF-DSGN-026D
title: "반제품 생성 엔진 — Working Prototype Generator Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: req-026-phase-2
refs: "[[AIF-PLAN-026D]] [[AIF-REQ-026]] [[AIF-REQ-027]]"
---

# 반제품 생성 엔진 — Working Prototype Generator Design

> **Plan**: [[AIF-PLAN-026D]]
> **REQ**: AIF-REQ-026 Phase 2

---

## 1. 타입 설계

### 1.1 packages/types/src/prototype.ts — WP 매니페스트 스키마

```typescript
import { z } from "zod";

// ── Origin (원천 추적) ──────────────────────────
export const PrototypeOriginSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  domain: z.string(),
  generatedAt: z.string().datetime(),
  generatedBy: z.literal("ai-foundry-prototype-generator"),
  version: z.string().default("1.0.0"),
  pipeline: z.object({
    documentCount: z.number().int(),
    policyCount: z.number().int(),
    termCount: z.number().int(),
    skillCount: z.number().int(),
    extractionCount: z.number().int(),
  }),
  sourceServices: z.object({
    policy: z.string().describe("svc-policy endpoint"),
    ontology: z.string().describe("svc-ontology endpoint"),
    extraction: z.string().describe("svc-extraction endpoint"),
    ingestion: z.string().describe("svc-ingestion endpoint"),
    skill: z.string().describe("svc-skill endpoint"),
  }),
});

// ── Manifest (패키지 메타데이터) ─────────────────
export const PrototypeManifestSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  files: z.array(z.object({
    path: z.string(),
    type: z.enum(["spec", "schema", "rules", "ontology", "meta", "readme"]),
    generatedBy: z.enum(["mechanical", "llm-sonnet", "template"]),
    sourceCount: z.number().int().describe("입력 데이터 건수"),
  })),
  generationParams: z.object({
    llmModel: z.string().default("claude-sonnet"),
    includeScreenSpec: z.boolean().default(false),
    maxPoliciesPerScenario: z.number().int().default(20),
  }),
});

// ── Generate Request ────────────────────────────
export const GeneratePrototypeRequestSchema = z.object({
  organizationId: z.string().min(1),
  options: z.object({
    includeScreenSpec: z.boolean().default(false),
    maxPoliciesPerScenario: z.number().int().min(1).max(50).default(20),
    skipLlm: z.boolean().default(false).describe("LLM 호출 생략 — 기계적 변환만"),
  }).optional(),
});

// ── Prototype Record (D1) ───────────────────────
export const PrototypeRecordSchema = z.object({
  prototypeId: z.string(),
  organizationId: z.string(),
  version: z.string(),
  status: z.enum(["generating", "completed", "failed"]),
  r2Key: z.string().optional(),
  docCount: z.number().int(),
  policyCount: z.number().int(),
  termCount: z.number().int(),
  skillCount: z.number().int(),
  generationParams: z.string().optional().describe("JSON"),
  errorMessage: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
});

export type PrototypeOrigin = z.infer<typeof PrototypeOriginSchema>;
export type PrototypeManifest = z.infer<typeof PrototypeManifestSchema>;
export type GeneratePrototypeRequest = z.infer<typeof GeneratePrototypeRequestSchema>;
export type PrototypeRecord = z.infer<typeof PrototypeRecordSchema>;
```

### 1.2 Env 확장 (services/svc-skill/src/env.ts)

```diff
  // Service bindings
  SECURITY: Fetcher;
  LLM_ROUTER: Fetcher;
  SVC_POLICY: Fetcher;
  SVC_ONTOLOGY: Fetcher;
+ SVC_EXTRACTION: Fetcher;
+ SVC_INGESTION: Fetcher;
```

---

## 2. D1 마이그레이션

### 2.1 infra/migrations/db-skill/0006_prototypes.sql

```sql
-- Working Prototype Generator 테이블
CREATE TABLE IF NOT EXISTS prototypes (
  prototype_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK(status IN ('generating', 'completed', 'failed')),
  r2_key TEXT,
  doc_count INTEGER NOT NULL DEFAULT 0,
  policy_count INTEGER NOT NULL DEFAULT 0,
  term_count INTEGER NOT NULL DEFAULT 0,
  skill_count INTEGER NOT NULL DEFAULT 0,
  generation_params TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prototypes_org
  ON prototypes(organization_id);
CREATE INDEX IF NOT EXISTS idx_prototypes_status
  ON prototypes(status);
```

---

## 3. API 설계

### 3.1 POST /prototype/generate

WP 생성을 시작한다. Workers 30초 제한 때문에 `ctx.waitUntil()`로 비동기 처리.

**Request:**
```json
{
  "organizationId": "lpon-onnuri",
  "options": {
    "includeScreenSpec": false,
    "maxPoliciesPerScenario": 20,
    "skipLlm": false
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "prototypeId": "wp-{uuid}",
    "status": "generating",
    "message": "Working Prototype generation started"
  }
}
```

**처리 흐름:**
1. D1에 prototype 레코드 INSERT (`status=generating`)
2. `ctx.waitUntil(generatePrototype(env, prototypeId, orgId, options))`
3. 즉시 202 반환

### 3.2 GET /prototype

**Query Params:** `?org={orgId}&status={status}&limit={n}&offset={n}`

**Response:**
```json
{
  "success": true,
  "data": {
    "prototypes": [...],
    "total": 3
  }
}
```

### 3.3 GET /prototype/:id

**Response:**
```json
{
  "success": true,
  "data": {
    "prototypeId": "wp-xxx",
    "organizationId": "lpon-onnuri",
    "status": "completed",
    "r2Key": "working-prototypes/wp-xxx.zip",
    "docCount": 85,
    "policyCount": 848,
    "termCount": 7332,
    "skillCount": 11,
    "startedAt": "...",
    "completedAt": "..."
  }
}
```

### 3.4 GET /prototype/:id/download

**Response:** `application/zip` (R2 object stream)

---

## 4. 모듈 설계

### 4.1 collector.ts — 데이터 수집기

5개 서비스에서 org별 데이터를 수집. 모든 호출은 Service Binding + `X-Internal-Secret`.

```typescript
interface CollectedData {
  policies: PolicyRow[];        // svc-policy GET /policies?org=X&status=approved
  terms: TermRow[];             // svc-ontology GET /terms (X-Organization-Id header)
  skills: SkillRow[];           // svc-skill GET /skills?org=X&status=bundled (로컬 D1)
  extractions: ExtractionRow[]; // svc-extraction GET /extractions?documentId=...
  documents: DocumentRow[];     // svc-ingestion GET /documents (X-Organization-Id header)
}

async function collectOrgData(env: Env, orgId: string, secret: string): Promise<CollectedData>
```

**수집 순서:**
1. `documents` ← svc-ingestion (페이지네이션, limit=200)
2. `policies` ← svc-policy (limit=1000, 페이지네이션)
3. `terms` ← svc-ontology (limit=500, 페이지네이션)
4. `skills` ← 로컬 D1 직접 조회 (bundled만)
5. `extractions` ← svc-extraction (documentId별 조회, 병렬 batch)

**주의: svc-extraction의 GET /extractions는 `documentId` 필수** → documents 목록에서 ID 추출 후 batch 조회.

### 4.2 orchestrator.ts — 생성 오케스트레이터

```typescript
async function generatePrototype(
  env: Env,
  prototypeId: string,
  orgId: string,
  options: GeneratePrototypeRequest["options"]
): Promise<void> {
  try {
    // 1. 데이터 수집
    const data = await collectOrgData(env, orgId, env.INTERNAL_API_SECRET);

    // 2. 문서별 생성 (순차 — LLM rate limit 고려)
    const files: GeneratedFile[] = [];

    // 기계적 변환 (LLM 불필요)
    files.push(await generateRulesJson(data.policies));
    files.push(await generateTermsJsonld(data.terms));
    files.push(await generateOriginJson(orgId, data));

    // LLM 기반 생성 (skipLlm 옵션 체크)
    if (!options?.skipLlm) {
      files.push(await generateBusinessLogic(env, data));
      files.push(await generateDataModel(env, data));
      files.push(await generateFeatureSpec(env, data));
      files.push(await generateArchitecture(env, data));
      files.push(await generateApiSpec(env, data));
      files.push(await generateClaudeMd(env, data));
    }

    // 3. manifest.json 생성
    files.push(generateManifest(orgId, files, options));

    // 4. ZIP 패키징 + R2 저장
    const r2Key = await packageAndUpload(env, prototypeId, files);

    // 5. D1 상태 업데이트
    await updatePrototypeStatus(env, prototypeId, "completed", r2Key, data);
  } catch (e) {
    await updatePrototypeStatus(env, prototypeId, "failed", undefined, undefined, String(e));
  }
}
```

### 4.3 generators/ — 문서별 생성기

#### business-logic.ts (P0 핵심)

**입력:** policies 848건 (condition-criteria-outcome 트리플)
**출력:** `specs/01-business-logic.md`

**변환 알고리즘:**
1. policies를 **도메인별로 그룹핑** (policy_code의 도메인 세그먼트 추출)
   - `POL-GIFTVOUCHER-CHARGE-001` → 도메인 `GIFTVOUCHER`, 유형 `CHARGE`
2. 유형별로 **시나리오 섹션** 구성
3. 각 시나리오에 policies를 **조건-판단-처리-예외** 표로 매핑
4. LLM(Sonnet)으로 시나리오 서술 보강 (전제조건, 데이터 영향, 엣지 케이스)

**LLM 프롬프트 설계:**
```
아래는 "{유형}" 도메인의 비즈니스 정책 목록이다.
각 정책은 condition(조건), criteria(판단기준), outcome(처리결과) 트리플이다.

{policies JSON 20건씩 batch}

위 정책들을 하나의 시나리오로 통합하여 아래 형식의 마크다운을 생성하라:
## 시나리오: {시나리오명}
### 전제 조건 (Preconditions)
### 비즈니스 룰
| ID | 조건 (When) | 판단 기준 (If) | 처리 (Then) | 예외 (Else) |
### 데이터 영향
### 엣지 케이스
```

**batch 전략:** 20 policies/시나리오 × ~42 시나리오 ≈ 42 LLM 호출 (Sonnet).

#### rules-json.ts (기계적 변환)

policies → `rules/business-rules.json` 직접 매핑. LLM 불필요.

```typescript
interface BusinessRule {
  id: string;           // policy_code
  title: string;
  domain: string;       // policy_code에서 추출
  type: string;         // policy_code에서 추출
  condition: string;
  criteria: string;
  outcome: string;
  trust: { level: string; score: number };
  source: { documentId: string; pageRef?: string };
  tags: string[];
}
```

#### data-model.ts

**입력:** terms 7,332건 + Neo4j 관계
**출력:** `specs/02-data-model.md` + `schemas/database.sql` + `schemas/types.ts`

**변환:**
1. terms에서 `term_type=entity`인 것 → 테이블 후보
2. `term_type=attribute`인 것 → 컬럼 후보
3. `term_type=relation`인 것 → FK/관계 후보
4. LLM(Sonnet)으로 DDL 생성 (entity→table, attribute→column, relation→FK 변환)

#### terms-jsonld.ts (기계적 변환)

terms → SKOS/JSON-LD 직접 변환. LLM 불필요.

```json
{
  "@context": { "skos": "http://www.w3.org/2004/02/skos/core#" },
  "@graph": [
    {
      "@id": "{skos_uri}",
      "@type": "skos:Concept",
      "skos:prefLabel": "{label}",
      "skos:definition": "{definition}",
      "skos:broader": "{broader_term_id}"
    }
  ]
}
```

#### claude-md.ts

**입력:** 전체 수집 데이터
**출력:** `CLAUDE.md` (AI Agent 컨텍스트)

LLM으로 프로젝트 요약 + 도메인 지식 + 기술 제약을 자연어로 생성.

#### api-spec.ts

**입력:** skills (bundled) + FactCheck gap 정보
**출력:** `specs/05-api-spec.yaml` (OpenAPI 3.x)

skills의 정책 기반으로 API 엔드포인트를 추론. FactCheck에서 확인된 API 패턴을 참조.

---

## 5. wrangler.toml 변경

3환경(dev/staging/production) 모두에 `SVC_EXTRACTION`과 `SVC_INGESTION` 추가.

**dev (기본):**
```toml
[[services]]
binding = "SVC_EXTRACTION"
service = "svc-extraction"

[[services]]
binding = "SVC_INGESTION"
service = "svc-ingestion"
```

**staging:**
```toml
[[env.staging.services]]
binding = "SVC_EXTRACTION"
service = "svc-extraction-staging"

[[env.staging.services]]
binding = "SVC_INGESTION"
service = "svc-ingestion-staging"
```

**production:**
```toml
[[env.production.services]]
binding = "SVC_EXTRACTION"
service = "svc-extraction-production"

[[env.production.services]]
binding = "SVC_INGESTION"
service = "svc-ingestion-production"
```

---

## 6. ZIP 패키징 (packager.ts)

Workers 환경에서는 Node.js `archiver` 사용 불가. `fflate` 라이브러리(이미 svc-ingestion에서 PPTX 파싱에 사용 중)로 ZIP 생성.

```typescript
import { zipSync, strToU8 } from "fflate";

function createZip(files: GeneratedFile[]): Uint8Array {
  const zipData: Record<string, Uint8Array> = {};
  for (const f of files) {
    zipData[f.path] = strToU8(f.content);
  }
  return zipSync(zipData);
}
```

R2 key 패턴: `working-prototypes/{prototypeId}.zip`

---

## 7. 구현 순서 (Sprint 1)

| 순서 | 파일 | 설명 |
|:----:|------|------|
| 1 | `packages/types/src/prototype.ts` | Zod 스키마 + 타입 정의 |
| 2 | `packages/types/src/index.ts` | export 추가 |
| 3 | `infra/migrations/db-skill/0006_prototypes.sql` | D1 마이그레이션 |
| 4 | `services/svc-skill/src/env.ts` | SVC_EXTRACTION, SVC_INGESTION 추가 |
| 5 | `services/svc-skill/wrangler.toml` | 3환경 Service Binding 추가 |
| 6 | `services/svc-skill/src/prototype/collector.ts` | 데이터 수집기 |
| 7 | `services/svc-skill/src/prototype/generators/rules-json.ts` | 기계적 변환 |
| 8 | `services/svc-skill/src/prototype/generators/terms-jsonld.ts` | 기계적 변환 |
| 9 | `services/svc-skill/src/prototype/generators/business-logic.ts` | LLM 시나리오 생성 |
| 10 | `services/svc-skill/src/prototype/orchestrator.ts` | 생성 오케스트레이터 |
| 11 | `services/svc-skill/src/prototype/packager.ts` | ZIP + R2 저장 |
| 12 | `services/svc-skill/src/routes/prototype.ts` | API 핸들러 |
| 13 | `services/svc-skill/src/index.ts` | 라우트 등록 |
| 14 | 테스트 작성 | collector, generators, routes |

---

## 8. 테스트 전략

| 영역 | 방식 | 파일 |
|------|------|------|
| Zod 스키마 | 유닛 (parse/safeParse) | `prototype.test.ts` |
| rules-json 생성기 | 유닛 (mock policy input → JSON output) | `generators/rules-json.test.ts` |
| terms-jsonld 생성기 | 유닛 (mock term input → JSONLD output) | `generators/terms-jsonld.test.ts` |
| business-logic 생성기 | 유닛 (mock LLM response) | `generators/business-logic.test.ts` |
| collector | 유닛 (mock Service Binding fetch) | `prototype/collector.test.ts` |
| API routes | 통합 (mock env + D1) | `routes/prototype.test.ts` |
