---
code: AIF-ANLS-026C
title: "Foundry-X TaskType 확장 Phase 1-3 — Gap 분석"
version: "1.0"
status: Active
category: ANLS
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: req-026-phase-1-3
refs: "[[AIF-DSGN-026C]] [[AIF-PLAN-026C]]"
---

# Foundry-X TaskType 확장 Phase 1-3 — Gap 분석

> **Design**: [[AIF-DSGN-026C]]
> **REQ**: AIF-REQ-026 (P1, IN_PROGRESS)

---

## 1. Match Rate

**Overall: 88% (35/40 items)**

| Category | Items | Match | Score |
|----------|:-----:|:-----:|:-----:|
| 기능 구현 (§2~§3, §7) | 30 | 30 | **100%** |
| 테스트 (§5.1 + §5.2) | 10 | 5 | **50%** |
| **Overall** | **40** | **35** | **88%** |

---

## 2. Full Match — 기능 구현 (30/30)

### Foundry-X (4파일)
- ✅ AgentTaskType union 3종 추가 (`packages/shared/src/agent.ts`)
- ✅ execution-types.ts 미러 확장
- ✅ TASK_TYPE_TO_MCP_TOOL 매핑 7종 (기존 4 + 신규 3)
- ✅ buildToolArguments() 3케이스 (policy-evaluation, skill-query, ontology-lookup)
- ✅ JSDoc 테이블 갱신

### AI Foundry svc-mcp-server (4파일)
- ✅ env.ts: SVC_ONTOLOGY 타입 추가 (optional)
- ✅ wrangler.toml: SVC_ONTOLOGY binding 3환경
- ✅ META_TOOLS 상수 3개 정의 (foundry_policy_eval, foundry_skill_query, foundry_ontology_lookup)
- ✅ handleOrgMcpJsonRpc tools/list에 META_TOOLS 병합
- ✅ handleOrgMcpJsonRpc tools/call meta-tool 분기 3건
- ✅ handlePolicyEvalTool 구현 (evaluatePolicy 재사용 + policyCode 자동매칭)
- ✅ handleSkillQueryTool 구현 (SVC_SKILL fetch + X-Organization-Id 헤더)
- ✅ handleOntologyLookupTool 구현 (SVC_ONTOLOGY fetch + X-Organization-Id 헤더)
- ✅ jsonRpcSuccess/jsonRpcError 응답 헬퍼
- ✅ ToolCallParams, JsonRpcBody 타입 정의

### 하위 호환성
- ✅ 기존 policy tools (policy code 기반) 동작 유지
- ✅ 기존 Foundry-X 4종 TaskType 영향 없음
- ✅ rate limit 변경 없음

### 배포 + E2E
- ✅ Production 배포 완료 (svc-mcp-server-production)
- ✅ tools/list: 619 tools (616 기존 + 3 meta)
- ✅ foundry_skill_query E2E: 39건 반환
- ✅ foundry_ontology_lookup E2E: 20건 반환
- ⚠️ foundry_policy_eval E2E: 라우팅 정상, evaluate API 데이터 이슈 (기존 문제)

---

## 3. Gap — 테스트 미작성 (5건)

| ID | 설계 항목 | 상태 | 심각도 |
|:--:|----------|:----:|:------:|
| T-6 | unknown tool name → error 응답 테스트 | 미작성 | Low |
| T-7 | TASK_TYPE_TO_MCP_TOOL 7종 매핑 검증 | Foundry-X 테스트 미갱신 | Medium |
| T-8 | buildToolArguments policy-evaluation 인자 변환 | 미작성 | Medium |
| T-9 | buildToolArguments skill-query 인자 변환 | 미작성 | Medium |
| T-10 | buildToolArguments ontology-lookup 인자 변환 | 미작성 | Medium |

---

## 4. Design Deviations — 의도적 개선 (6건)

| # | 설계 | 구현 | 평가 |
|---|------|------|------|
| D-1 | `SVC_ONTOLOGY: Fetcher` (필수) | `SVC_ONTOLOGY?: Fetcher` (optional) | ✅ Improvement — binding 미설정 시 graceful error |
| D-2 | skill-query `organization_id` query param | `X-Organization-Id` header | ✅ Improvement — 기존 org API 패턴 일관성 |
| D-3 | ontology-lookup `organization_id` query param | `X-Organization-Id` header | ✅ D-2와 동일 |
| D-4 | `t.prefLabel`, `t.altLabels` | `t["label"]`, `t["termType"]` | ✅ Adaptation — 실제 svc-ontology API 스키마 |
| D-5 | `s.name`, `s.domain`, `s.trustLevel` (flat) | `s.metadata.domain`, `s.trust.level` (nested) | ✅ Adaptation — 실제 svc-skill API 스키마 |
| D-6 | Handler error handling 미명시 | try/catch + logger.error | ✅ Improvement |

---

## 5. Recommended Actions

1. **T-7~T-10**: Foundry-X 테스트 갱신 (mcp-adapter.test.ts + mcp-runner.test.ts)
2. **T-6**: AI Foundry org-mcp.test.ts unknown tool 테스트 추가
3. Design 문서 §3.6 API 필드명을 실제 스키마에 맞게 보정 (optional, 구현이 정확)

→ 테스트 5건 추가 시 **Match Rate 100%** 달성
