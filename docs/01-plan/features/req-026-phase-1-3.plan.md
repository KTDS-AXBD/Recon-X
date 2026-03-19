---
code: AIF-PLAN-026C
title: "Foundry-X TaskType 확장 Phase 1-3 — policy-evaluation, skill-query, ontology-lookup"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: req-026-phase-1-3
refs: "[[AIF-PLAN-026]] [[AIF-PLAN-026B]] [[AIF-RPRT-028]]"
---

# Foundry-X TaskType 확장 Phase 1-3 — policy-evaluation, skill-query, ontology-lookup

> **Parent**: [[AIF-PLAN-026]] Foundry-X 통합 로드맵 Phase 1
> **Predecessor**: Phase 1-2 완료 (org MCP 2서버, 2,129 tools, PDCA 95%)
> **REQ**: AIF-REQ-026 (P1, IN_PROGRESS)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 Foundry-X의 AgentTaskType은 순공학 4종(code-review, code-generation, spec-analysis, test-generation)만 지원. AI Foundry의 역공학 자산(정책 3,675건, 스킬 3,924건, 용어 8,773건)을 Foundry-X 에이전트가 직접 활용할 수 없음 |
| **Solution** | Foundry-X AgentTaskType에 3종 추가(`policy-evaluation`, `skill-query`, `ontology-lookup`) + AI Foundry svc-mcp-server에 대응 tool handler 구현. `TASK_TYPE_TO_MCP_TOOL` 매핑으로 동적 라우팅 |
| **Function/UX Effect** | Foundry-X 에이전트가 "온누리상품권 충전 정책 평가해줘" → policy-evaluation TaskType → AI Foundry MCP tools/call → 정책 평가 결과 반환. skill-query로 도메인 스킬 검색, ontology-lookup으로 용어 조회까지 일관된 에이전트 경험 |
| **Core Value** | 순공학(Foundry-X) ↔ 역공학(AI Foundry) 양방향 연결 완성. 에이전트가 새 코드를 생성하면서 동시에 기존 도메인 지식을 참조할 수 있는 구조 |

---

## 1. 배경 및 현재 상태

### 1.1 Phase 1-2 완료 현황

| 항목 | 상태 |
|------|------|
| MCP 서버 등록 | 2서버 (LPON + Miraeasset) |
| MCP tools | 2,129 unique (LPON 616 + Miraeasset 1,513) |
| org MCP 엔드포인트 | `POST /mcp/org/:orgId` |
| tools/call 라우팅 | policy evaluation만 지원 (evaluatePolicy) |

### 1.2 현재 Foundry-X TaskType

```typescript
// packages/shared/src/agent.ts:122-126
export type AgentTaskType =
  | 'code-review'
  | 'code-generation'
  | 'spec-analysis'
  | 'test-generation';
```

**TASK_TYPE_TO_MCP_TOOL 매핑** (`mcp-adapter.ts:88-93`):
```
code-review       → foundry_code_review
code-generation   → foundry_code_gen
spec-analysis     → foundry_spec_analyze
test-generation   → foundry_test_gen
```

### 1.3 문제점

1. **TaskType ↔ AI Foundry 연결 부재**: 기존 4종은 모두 순공학(코드 생성/리뷰) 전용. AI Foundry의 역공학 자산을 활용하는 TaskType이 없음
2. **MCP tools/call 단일 핸들러**: svc-mcp-server의 `handleOrgMcpJsonRpc`가 policy evaluation만 처리. skill 조회/용어 검색 tool은 미구현
3. **buildToolArguments 미지원**: Foundry-X McpRunner의 `buildToolArguments()`에 새 TaskType의 인자 변환 로직 없음

---

## 2. 목표

### 2.1 완료 기준

1. Foundry-X AgentTaskType에 3종 추가: `policy-evaluation`, `skill-query`, `ontology-lookup`
2. `TASK_TYPE_TO_MCP_TOOL` 매핑에 3종 추가
3. `buildToolArguments()`에 3종의 인자 변환 로직 추가
4. AI Foundry svc-mcp-server에 3종 tool handler 구현
5. E2E 검증: Foundry-X → AI Foundry MCP tools/call → 결과 반환 (3종 각 1건 이상)

### 2.2 비목표

- Foundry-X UI에서 새 TaskType 실행 화면 (후속)
- Phase 2 반제품 파이프라인 (별도)
- 기존 policy evaluation tool의 동작 변경 없음

---

## 3. 설계 개요

### 3.1 새 TaskType 정의

| TaskType | MCP Tool Name | 용도 | AI Foundry 대상 서비스 |
|----------|---------------|------|----------------------|
| `policy-evaluation` | `foundry_policy_eval` | 정책 평가 (condition-criteria-outcome 검증) | svc-skill → evaluatePolicy (기존) |
| `skill-query` | `foundry_skill_query` | 도메인 스킬 검색 (키워드/태그/서브도메인) | svc-skill → GET /skills |
| `ontology-lookup` | `foundry_ontology_lookup` | 도메인 용어 조회 (SKOS 기반 용어사전) | svc-ontology → GET /terms |

### 3.2 MCP Tool 인자 설계

#### policy-evaluation
```json
{
  "policyCode": "POL-GV-CHARGE-001",
  "context": "사용자가 온누리상품권 5만원 충전을 요청",
  "parameters": { "amount": 50000 }
}
```

#### skill-query
```json
{
  "query": "충전",
  "organizationId": "LPON",
  "tags": ["giftvoucher"],
  "limit": 10
}
```

#### ontology-lookup
```json
{
  "term": "온누리상품권",
  "organizationId": "LPON",
  "includeRelated": true
}
```

### 3.3 Foundry-X buildToolArguments 매핑

| TaskType | AgentExecutionRequest 필드 | MCP Tool Arguments |
|----------|---------------------------|-------------------|
| `policy-evaluation` | `context.instructions` (JSON) | `{ policyCode, context, parameters }` |
| `skill-query` | `context.instructions` (query string) + `context.spec.title` (orgId) | `{ query, organizationId, tags, limit }` |
| `ontology-lookup` | `context.instructions` (term) + `context.spec.title` (orgId) | `{ term, organizationId, includeRelated }` |

### 3.4 AI Foundry svc-mcp-server 확장

현재 `handleOrgMcpJsonRpc` tools/call 핸들러:
1. tool name → `_toolSkillMap`에서 skillId 역매핑
2. `evaluatePolicy(env, skillId, policyCode, context, params)` 호출

**확장**: tool name prefix 기반 라우팅 추가
- `foundry_policy_eval` → 기존 evaluatePolicy 로직
- `foundry_skill_query` → svc-skill GET /skills API 프록시
- `foundry_ontology_lookup` → svc-ontology GET /terms API 프록시

org-level MCP의 `tools/list`에 3개 meta-tool 추가 (기존 policy tool들과 병존).

---

## 4. 실행 계획

### Task 1: Foundry-X TaskType 확장 (Foundry-X 리포) — 20분

**수정 파일**:
1. `packages/shared/src/agent.ts` — AgentTaskType union에 3종 추가
2. `packages/api/src/services/execution-types.ts` — 타입 미러링
3. `packages/api/src/services/mcp-adapter.ts` — TASK_TYPE_TO_MCP_TOOL 3종 추가
4. `packages/api/src/services/mcp-runner.ts` — buildToolArguments() 3케이스 추가

**검증**: typecheck 통과

### Task 2: AI Foundry svc-mcp-server meta-tool 추가 — 30분

**수정 파일**:
1. `services/svc-mcp-server/src/index.ts` — handleOrgMcpJsonRpc tools/call 분기 확장
2. `services/svc-mcp-server/src/index.ts` — org tools/list에 3개 meta-tool 정의 추가

**구현 상세**:
- `foundry_skill_query` handler: svc-skill service binding → GET /skills?q={query}&organization_id={orgId}&limit={limit}
- `foundry_ontology_lookup` handler: svc-ontology service binding → GET /terms?q={term}&organization_id={orgId}
- `foundry_policy_eval` handler: 기존 evaluatePolicy 재사용 (tool name으로 진입하는 별도 경로)

**검증**: typecheck + lint 통과

### Task 3: 테스트 작성 — 20분

**수정 파일**:
1. `services/svc-mcp-server/src/__tests__/org-mcp.test.ts` — meta-tool tools/list, tools/call 3종 테스트
2. Foundry-X 테스트: `packages/api/src/services/__tests__/mcp-runner.test.ts` — 새 TaskType 매핑 테스트

**검증**: bun run test 통과

### Task 4: 배포 + E2E 검증 — 15분

1. AI Foundry svc-mcp-server staging 배포
2. Foundry-X packages/api typecheck + build
3. E2E: curl로 AI Foundry MCP 엔드포인트에 3종 tools/call 직접 호출
   - `foundry_policy_eval` → 정책 평가 결과
   - `foundry_skill_query` → 스킬 목록 반환
   - `foundry_ontology_lookup` → 용어 정보 반환

---

## 5. 의존성

| 의존 | 상태 | 비고 |
|------|:----:|------|
| AI Foundry svc-mcp-server 배포 | ✅ | 12 Workers healthy |
| Foundry-X McpServerRegistry 등록 | ✅ | 2서버 (Phase 1-2) |
| svc-skill GET /skills API | ✅ | 검색 + 필터 구현 완료 |
| svc-ontology GET /terms API | ✅ | 용어 조회 + 페이지네이션 구현 완료 |
| svc-skill service binding in svc-mcp-server | ✅ | 이미 존재 |
| svc-ontology service binding in svc-mcp-server | ❌ | wrangler.toml에 SVC_ONTOLOGY 미설정 → Task 2에서 추가 |

---

## 6. 리스크

| # | 리스크 | 확률 | 대응 |
|---|--------|:----:|------|
| R-1 | svc-mcp-server에 svc-ontology service binding 미설정 | ✅ 확인됨 | Task 2에서 wrangler.toml 3환경 추가 (SVC_ONTOLOGY) |
| R-2 | Foundry-X AgentExecutionRequest.context 필드가 새 TaskType 인자를 담기에 부족 | Low | instructions 필드를 JSON으로 활용 (기존 패턴) |
| R-3 | org-level tools/list에 meta-tool 추가 시 기존 policy tool과 name 충돌 | Low | `foundry_*` prefix로 네임스페이스 분리 |

---

## 7. 일정 추정

| Task | 예상 시간 | 누적 |
|------|:---------:|:----:|
| Task 1: Foundry-X TaskType 확장 | 20분 | 20분 |
| Task 2: AI Foundry meta-tool 구현 | 30분 | 50분 |
| Task 3: 테스트 작성 | 20분 | 70분 |
| Task 4: 배포 + E2E | 15분 | 85분 |
| **합계** | **~1.5h** | |
