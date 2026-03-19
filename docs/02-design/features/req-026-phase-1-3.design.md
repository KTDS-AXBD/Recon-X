---
code: AIF-DSGN-026C
title: "Foundry-X TaskType 확장 Phase 1-3 — 상세 설계"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: req-026-phase-1-3
refs: "[[AIF-PLAN-026C]] [[AIF-DSGN-026B]]"
---

# Foundry-X TaskType 확장 Phase 1-3 — 상세 설계

> **Plan**: [[AIF-PLAN-026C]]
> **REQ**: AIF-REQ-026 (P1, IN_PROGRESS)

---

## 1. 변경 범위 요약

| 리포 | 파일 | 변경 유형 |
|------|------|----------|
| **Foundry-X** | `packages/shared/src/agent.ts` | AgentTaskType union 확장 |
| **Foundry-X** | `packages/api/src/services/execution-types.ts` | 타입 미러 확장 |
| **Foundry-X** | `packages/api/src/services/mcp-adapter.ts` | TASK_TYPE_TO_MCP_TOOL 3건 추가 |
| **Foundry-X** | `packages/api/src/services/mcp-runner.ts` | buildToolArguments() 3케이스 추가 |
| **AI Foundry** | `services/svc-mcp-server/src/env.ts` | SVC_ONTOLOGY binding 타입 추가 |
| **AI Foundry** | `services/svc-mcp-server/wrangler.toml` | SVC_ONTOLOGY service binding 3환경 |
| **AI Foundry** | `services/svc-mcp-server/src/index.ts` | meta-tool 정의 + tools/call 분기 확장 |

---

## 2. Foundry-X 측 설계

### 2.1 AgentTaskType 확장

```typescript
// packages/shared/src/agent.ts:122-126 → 확장
export type AgentTaskType =
  | 'code-review'
  | 'code-generation'
  | 'spec-analysis'
  | 'test-generation'
  // Phase 1-3: AI Foundry 역공학 자산 연동
  | 'policy-evaluation'
  | 'skill-query'
  | 'ontology-lookup';
```

`packages/api/src/services/execution-types.ts`도 동일하게 확장.

### 2.2 TASK_TYPE_TO_MCP_TOOL 매핑

```typescript
// packages/api/src/services/mcp-adapter.ts:88-93 → 확장
export const TASK_TYPE_TO_MCP_TOOL: Record<AgentTaskType, string> = {
  "code-review": "foundry_code_review",
  "code-generation": "foundry_code_gen",
  "spec-analysis": "foundry_spec_analyze",
  "test-generation": "foundry_test_gen",
  // Phase 1-3: AI Foundry tools
  "policy-evaluation": "foundry_policy_eval",
  "skill-query": "foundry_skill_query",
  "ontology-lookup": "foundry_ontology_lookup",
};
```

### 2.3 buildToolArguments() 확장

```typescript
// packages/api/src/services/mcp-runner.ts — buildToolArguments() 추가 케이스

case "policy-evaluation":
  // instructions = JSON { policyCode, context, parameters? }
  return parseInstructionsJson(request.context.instructions, {
    policyCode: "",
    context: "",
  });

case "skill-query":
  return {
    query: request.context.instructions ?? "",
    organizationId: request.context.spec?.title ?? "",
    limit: 10,
  };

case "ontology-lookup":
  return {
    term: request.context.instructions ?? "",
    organizationId: request.context.spec?.title ?? "",
    includeRelated: true,
  };
```

**설계 결정**: `instructions` 필드를 다목적으로 활용. policy-evaluation은 JSON 문자열, skill-query/ontology-lookup은 검색어 문자열. `spec.title`을 organizationId 전달에 활용 (기존 필드 재사용, 스키마 변경 최소화).

### 2.4 parseInstructionsJson 헬퍼

```typescript
function parseInstructionsJson(
  instructions: string | undefined,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  if (!instructions) return defaults;
  try {
    return { ...defaults, ...JSON.parse(instructions) };
  } catch {
    return { ...defaults, context: instructions };
  }
}
```

JSON 파싱 실패 시 `context` 필드로 fallback — 사용자가 자연어를 그대로 넘겨도 동작.

---

## 3. AI Foundry 측 설계

### 3.1 Env 타입 확장

```typescript
// services/svc-mcp-server/src/env.ts
export interface Env {
  SVC_SKILL: Fetcher;
  SVC_ONTOLOGY: Fetcher;  // 추가
  ENVIRONMENT: string;
  SERVICE_NAME: string;
  INTERNAL_API_SECRET: string;
}
```

### 3.2 wrangler.toml service binding 추가

```toml
# default
[[services]]
binding = "SVC_ONTOLOGY"
service = "svc-ontology"

# staging
[[env.staging.services]]
binding = "SVC_ONTOLOGY"
service = "svc-ontology-staging"

# production
[[env.production.services]]
binding = "SVC_ONTOLOGY"
service = "svc-ontology-production"
```

### 3.3 Meta-tool 정의 (3종)

org MCP tools/list에 기존 policy tool들과 함께 3개 meta-tool을 추가. 별도 네임스페이스(`foundry_*` prefix)로 구분.

```typescript
const META_TOOLS: McpAdapterTool[] = [
  {
    name: "foundry_policy_eval",
    description: "AI Foundry 정책 평가 — condition-criteria-outcome 트리플에 대해 비즈니스 컨텍스트를 평가하고 준수 여부를 판정합니다. policyCode를 지정하면 해당 정책만, 생략하면 컨텍스트에 맞는 정책을 자동 선택합니다.",
    inputSchema: {
      type: "object",
      properties: {
        policyCode: { type: "string", description: "평가할 정책 코드 (예: POL-GV-CHARGE-001). 생략 시 context 기반 자동 매칭" },
        context: { type: "string", description: "평가 대상 비즈니스 상황 설명" },
        parameters: { type: "string", description: "추가 파라미터 JSON (선택)" },
      },
      required: ["context"],
    },
    annotations: { title: "정책 평가", readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "foundry_skill_query",
    description: "AI Foundry 스킬 검색 — 역공학으로 추출된 도메인 스킬을 키워드, 태그, 서브도메인으로 검색합니다. 각 스킬은 관련 정책, 온톨로지, 신뢰도 정보를 포함합니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색 키워드 (예: '충전', '선물하기')" },
        tags: { type: "string", description: "태그 필터 (쉼표 구분, 예: 'giftvoucher,charge')" },
        subdomain: { type: "string", description: "서브도메인 필터" },
        limit: { type: "string", description: "결과 수 (기본 10)" },
      },
      required: ["query"],
    },
    annotations: { title: "스킬 검색", readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "foundry_ontology_lookup",
    description: "AI Foundry 용어 조회 — SKOS/JSON-LD 기반 도메인 용어사전에서 용어를 검색합니다. 용어의 정의, 동의어(altLabel), SKOS URI, 관련 용어를 반환합니다.",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "검색할 용어 (예: '온누리상품권', '충전한도')" },
        includeRelated: { type: "string", description: "관련 용어 포함 여부 (true/false, 기본 true)" },
      },
      required: ["term"],
    },
    annotations: { title: "용어 조회", readOnlyHint: true, openWorldHint: true },
  },
];
```

### 3.4 tools/list 확장

`handleOrgMcpJsonRpc` 내 `tools/list` 응답에 META_TOOLS를 기존 policy tools 앞에 추가:

```typescript
if (body.method === "tools/list") {
  const policyTools = adapter.tools.map((t) => ({
    name: t.name, description: t.description,
    inputSchema: t.inputSchema, annotations: t.annotations,
  }));
  // Meta-tools first, then policy tools
  const allTools = [...META_TOOLS, ...policyTools];
  return Response.json({
    jsonrpc: "2.0",
    result: { tools: allTools },
    id: body.id,
  }, { headers: { ...corsHeaders(), "Content-Type": "application/json" } });
}
```

### 3.5 tools/call 분기 확장

현재 `tools/call` 핸들러는 모든 tool name을 policy evaluation으로 라우팅. meta-tool은 tool name으로 먼저 분기:

```typescript
if (body.method === "tools/call") {
  const toolName = params?.name ?? "";

  // ── Meta-tool 분기 (foundry_* prefix) ──
  if (toolName === "foundry_policy_eval") {
    return handlePolicyEvalTool(body, params, adapter, env, orgId);
  }
  if (toolName === "foundry_skill_query") {
    return handleSkillQueryTool(body, params, env, orgId);
  }
  if (toolName === "foundry_ontology_lookup") {
    return handleOntologyLookupTool(body, params, env, orgId);
  }

  // ── 기존 policy tool (policy code 기반) ──
  // ... 기존 코드 유지 ...
}
```

### 3.6 Meta-tool Handler 구현

#### foundry_policy_eval

```typescript
async function handlePolicyEvalTool(
  body: JsonRpcRequest, params: ToolCallParams,
  adapter: OrgMcpAdapterResponse, env: Env, orgId: string,
): Promise<Response> {
  const context = params?.arguments?.context ?? "";
  const policyCode = params?.arguments?.policyCode;
  const parametersStr = params?.arguments?.parameters;

  // policyCode 지정 시 → 해당 policy 직접 평가
  // 미지정 시 → context 기반 첫 번째 매칭 skill 사용
  let skillId: string;
  let evalPolicyCode: string;

  if (policyCode) {
    evalPolicyCode = policyCode.toUpperCase();
    skillId = adapter._toolSkillMap[policyCode.toLowerCase()] ?? "";
  } else {
    // 첫 번째 스킬로 fallback (추후 semantic matching 가능)
    const firstTool = Object.keys(adapter._toolSkillMap)[0] ?? "";
    skillId = adapter._toolSkillMap[firstTool] ?? "";
    evalPolicyCode = firstTool.toUpperCase();
  }

  if (!skillId) {
    return jsonRpcError(body.id, "매칭되는 정책을 찾을 수 없습니다");
  }

  let parsedParams: Record<string, unknown> | undefined;
  if (parametersStr) {
    try { parsedParams = JSON.parse(parametersStr); } catch { /* ignore */ }
  }

  const result = await evaluatePolicy(env, skillId, evalPolicyCode, context, parsedParams);
  return formatEvalResult(body.id, result);
}
```

#### foundry_skill_query

```typescript
async function handleSkillQueryTool(
  body: JsonRpcRequest, params: ToolCallParams,
  env: Env, orgId: string,
): Promise<Response> {
  const query = params?.arguments?.query ?? "";
  const tags = params?.arguments?.tags ?? "";
  const subdomain = params?.arguments?.subdomain ?? "";
  const limit = params?.arguments?.limit ?? "10";

  const searchParams = new URLSearchParams({
    q: query,
    organization_id: orgId,
    limit,
    ...(tags ? { tags } : {}),
    ...(subdomain ? { subdomain } : {}),
  });

  const res = await env.SVC_SKILL.fetch(
    `https://svc-skill.internal/skills?${searchParams}`,
    { headers: { "X-Internal-Secret": env.INTERNAL_API_SECRET } },
  );

  if (!res.ok) {
    return jsonRpcError(body.id, `스킬 검색 실패: ${res.status}`);
  }

  const json = await res.json() as { success: boolean; data: { skills: unknown[]; total: number } };
  const { skills, total } = json.data;

  const text = [
    `## 스킬 검색 결과 (${total}건)`, "",
    `**검색어**: ${query}`,
    `**조직**: ${orgId}`,
    "",
    ...skills.map((s: any, i: number) =>
      `${i + 1}. **${s.name}** (${s.skillId})\n   도메인: ${s.domain} | 신뢰도: ${s.trustLevel} | 정책: ${s.policyCount}건`
    ),
  ].join("\n");

  return jsonRpcSuccess(body.id, text);
}
```

#### foundry_ontology_lookup

```typescript
async function handleOntologyLookupTool(
  body: JsonRpcRequest, params: ToolCallParams,
  env: Env, orgId: string,
): Promise<Response> {
  const term = params?.arguments?.term ?? "";
  const includeRelated = (params?.arguments?.includeRelated ?? "true") !== "false";

  const searchParams = new URLSearchParams({
    q: term,
    organization_id: orgId,
    limit: "20",
  });

  const res = await env.SVC_ONTOLOGY.fetch(
    `https://svc-ontology.internal/terms?${searchParams}`,
    { headers: { "X-Internal-Secret": env.INTERNAL_API_SECRET } },
  );

  if (!res.ok) {
    return jsonRpcError(body.id, `용어 조회 실패: ${res.status}`);
  }

  const json = await res.json() as { success: boolean; data: { terms: unknown[]; total: number } };
  const { terms, total } = json.data;

  const text = [
    `## 용어 조회 결과 (${total}건)`, "",
    `**검색어**: ${term}`,
    `**조직**: ${orgId}`,
    "",
    ...terms.map((t: any, i: number) => {
      const lines = [`${i + 1}. **${t.prefLabel}**`];
      if (t.definition) lines.push(`   정의: ${t.definition}`);
      if (t.altLabels) lines.push(`   동의어: ${t.altLabels}`);
      if (t.skosUri) lines.push(`   URI: ${t.skosUri}`);
      return lines.join("\n");
    }),
  ].join("\n");

  return jsonRpcSuccess(body.id, text);
}
```

### 3.7 응답 헬퍼

```typescript
function jsonRpcSuccess(id: unknown, text: string): Response {
  return Response.json({
    jsonrpc: "2.0",
    result: { content: [{ type: "text", text }] },
    id,
  }, { headers: { ...corsHeaders(), "Content-Type": "application/json" } });
}

function jsonRpcError(id: unknown, message: string): Response {
  return Response.json({
    jsonrpc: "2.0",
    result: { content: [{ type: "text", text: `Error: ${message}` }], isError: true },
    id,
  }, { headers: { ...corsHeaders(), "Content-Type": "application/json" } });
}
```

---

## 4. 데이터 흐름

### 4.1 policy-evaluation 흐름

```
Foundry-X Agent
  → AgentTaskType: "policy-evaluation"
  → McpRunner.execute()
    → TASK_TYPE_TO_MCP_TOOL["policy-evaluation"] = "foundry_policy_eval"
    → buildToolArguments() → { policyCode, context, parameters }
    → MCP tools/call to AI Foundry svc-mcp-server
      → handleOrgMcpJsonRpc
        → toolName === "foundry_policy_eval"
        → handlePolicyEvalTool()
          → evaluatePolicy(env, skillId, policyCode, context, params)
          → svc-skill POST /skills/:id/evaluate
          → 정책 평가 결과 반환
```

### 4.2 skill-query 흐름

```
Foundry-X Agent
  → AgentTaskType: "skill-query"
  → McpRunner.execute()
    → TASK_TYPE_TO_MCP_TOOL["skill-query"] = "foundry_skill_query"
    → buildToolArguments() → { query, organizationId, limit }
    → MCP tools/call to AI Foundry svc-mcp-server
      → handleOrgMcpJsonRpc
        → toolName === "foundry_skill_query"
        → handleSkillQueryTool()
          → env.SVC_SKILL.fetch("GET /skills?q=...&organization_id=...")
          → 스킬 목록 반환
```

### 4.3 ontology-lookup 흐름

```
Foundry-X Agent
  → AgentTaskType: "ontology-lookup"
  → McpRunner.execute()
    → TASK_TYPE_TO_MCP_TOOL["ontology-lookup"] = "foundry_ontology_lookup"
    → buildToolArguments() → { term, organizationId, includeRelated }
    → MCP tools/call to AI Foundry svc-mcp-server
      → handleOrgMcpJsonRpc
        → toolName === "foundry_ontology_lookup"
        → handleOntologyLookupTool()
          → env.SVC_ONTOLOGY.fetch("GET /terms?q=...&organization_id=...")
          → 용어 목록 반환
```

---

## 5. 테스트 설계

### 5.1 AI Foundry 테스트 (svc-mcp-server)

| # | 테스트 | 파일 |
|---|--------|------|
| T-1 | org tools/list에 META_TOOLS 3개 포함 확인 | `org-mcp.test.ts` |
| T-2 | foundry_policy_eval tools/call → evaluatePolicy 호출 | `org-mcp.test.ts` |
| T-3 | foundry_skill_query tools/call → SVC_SKILL fetch 호출 + 결과 포맷 | `org-mcp.test.ts` |
| T-4 | foundry_ontology_lookup tools/call → SVC_ONTOLOGY fetch 호출 + 결과 포맷 | `org-mcp.test.ts` |
| T-5 | 기존 policy tool (policy code 기반) 동작 유지 (회귀 테스트) | `org-mcp.test.ts` |
| T-6 | 알 수 없는 tool name → 에러 응답 | `org-mcp.test.ts` |

### 5.2 Foundry-X 테스트

| # | 테스트 | 파일 |
|---|--------|------|
| T-7 | TASK_TYPE_TO_MCP_TOOL에 7종 매핑 완비 | `mcp-adapter.test.ts` |
| T-8 | buildToolArguments — policy-evaluation JSON 인자 변환 | `mcp-runner.test.ts` |
| T-9 | buildToolArguments — skill-query 인자 변환 | `mcp-runner.test.ts` |
| T-10 | buildToolArguments — ontology-lookup 인자 변환 | `mcp-runner.test.ts` |

---

## 6. 구현 순서

```
Step 1: AI Foundry svc-mcp-server
  1a. env.ts에 SVC_ONTOLOGY 추가
  1b. wrangler.toml에 SVC_ONTOLOGY binding 3환경 추가
  1c. index.ts에 META_TOOLS 상수 + 응답 헬퍼 추가
  1d. handleOrgMcpJsonRpc tools/list에 META_TOOLS 병합
  1e. handleOrgMcpJsonRpc tools/call에 meta-tool 분기 추가
  1f. handleSkillQueryTool, handleOntologyLookupTool, handlePolicyEvalTool 구현
  1g. typecheck + lint 통과

Step 2: AI Foundry 테스트
  2a. org-mcp.test.ts에 T-1~T-6 추가
  2b. bun run test 통과

Step 3: Foundry-X 타입 확장
  3a. packages/shared/src/agent.ts AgentTaskType 확장
  3b. packages/api/src/services/execution-types.ts 확장
  3c. packages/api/src/services/mcp-adapter.ts TASK_TYPE_TO_MCP_TOOL 추가
  3d. packages/api/src/services/mcp-runner.ts buildToolArguments() 추가
  3e. typecheck 통과

Step 4: 배포 + E2E
  4a. svc-mcp-server staging 배포
  4b. curl E2E (3종 tools/call)
  4c. production 배포
```

---

## 7. 하위 호환성

| 항목 | 영향 |
|------|------|
| 기존 policy tools (POL-* code 기반) | ✅ 변경 없음 — meta-tool 분기가 먼저 체크, 미매칭 시 기존 로직 |
| 기존 Foundry-X 4종 TaskType | ✅ 변경 없음 — TASK_TYPE_TO_MCP_TOOL에 추가만 |
| Foundry-X McpServerRegistry 캐시 | ⚠️ tools 캐시(5min TTL) 갱신 필요 — 배포 후 /test 엔드포인트 호출로 캐시 리프레시 |
| svc-mcp-server rate limit | ✅ 변경 없음 — 기존 60req/min/IP |
