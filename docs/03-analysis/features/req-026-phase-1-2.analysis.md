---
code: AIF-ANLS-026B
title: "Foundry-X MCP 통합 Phase 1-2 — Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: req-026-phase-1-2
refs: "[[AIF-DSGN-026B]] [[AIF-PLAN-026B]]"
---

# Foundry-X MCP 통합 Phase 1-2 — Gap Analysis

> **Design**: [[AIF-DSGN-026B]]
> **Match Rate**: **95% (37/39)**

---

## 1. Summary

| Category | Score | Status |
|----------|:-----:|:------:|
| Task 1: R2 Upload Script | 80% (4/5) | ⚠️ |
| Task 2-A: Org MCP Adapter (svc-skill) | 100% (9/9) | ✅ |
| Task 2-B: Route Registration (svc-skill) | 100% (4/4) | ✅ |
| Task 2-C: Org MCP Server (svc-mcp-server) | 100% (8/8) | ✅ |
| Tests (Design 10건) | 100% (10/10) | ✅ |
| File List | 67% (2/3) | ⚠️ |
| **Overall** | **95% (37/39)** | **PASS** |

---

## 2. GAPs (2건)

### GAP-1: KV 캐시 무효화 미구현 (Low)
- **Design §2.2**: bundled skills의 KV 캐시 키 삭제 명시
- **Implementation**: `scripts/upload-bundled-r2.ts`에 KV 무효화 로직 없음
- **영향**: R2 업로드 후 최대 1시간(TTL) 동안 이전 캐시 반환 가능. 자연 만료로 해소됨

### GAP-2: 테스트 파일 경로 불일치 (Info)
- **Design §8**: `services/svc-skill/tests/mcp.test.ts`, `services/svc-mcp-server/tests/org-mcp.test.ts`
- **Actual**: `services/svc-skill/src/routes/mcp.test.ts`, `services/svc-mcp-server/src/__tests__/org-mcp.test.ts`
- **영향**: 없음 — 프로젝트 co-located 테스트 규칙을 따른 것

---

## 3. Design Change: SDK → Raw JSON-RPC

| 항목 | Design (§5.2) | Implementation |
|------|---------------|----------------|
| 함수명 | `createOrgMcpServer()` | `handleOrgMcpJsonRpc()` |
| 방식 | McpServer SDK + `server.tool()` 848개 등록 | Raw JSON-RPC 핸들러 |
| Transport | WebStandardStreamableHTTPServerTransport | Response.json() 직접 반환 |

**판정: 합리적 엔지니어링 결정 (GAP 아님)**

- 848+ tool SDK 등록 시 Worker 크래시 (128MB 메모리 한도, Zod 인스턴스 누적)
- initialize / tools/list / tools/call 3개 메서드 MCP 프로토콜 동등성 유지
- `notifications/initialized`, `Method not found` 추가 처리 (BONUS)
- 기존 `/mcp/:skillId` (SDK 기반, 소규모 tool)은 하위 호환 유지

---

## 4. BONUS (4건)

| # | Item | Location |
|---|------|----------|
| B1 | `notifications/initialized` 202 응답 | svc-mcp-server handleOrgMcpJsonRpc |
| B2 | `Method not found` -32601 에러 처리 | svc-mcp-server handleOrgMcpJsonRpc |
| B3 | `upload-bundled-r2.ts` R2 업로드 스크립트 (Design 파일 목록 미포함) | scripts/upload-bundled-r2.ts |
| B4 | DELETE/GET 메서드 핸들링 (stateless mode) | svc-mcp-server org route |

---

## 5. LOC 비교

| 항목 | Design 예상 | 실제 | 비율 |
|------|:---------:|:----:|:----:|
| svc-skill mcp.ts | +80 | +117 | 146% |
| svc-skill index.ts | +15 | +22 | 147% |
| svc-mcp-server index.ts | +80 | +150→101 (hotfix) | 126% |
| svc-skill tests | +60 | +153 | 255% |
| svc-mcp-server tests | +80 | +신규 5건 | 100% |
| upload script | 없음 | +282 | BONUS |

---

## 6. E2E 검증 결과

| Step | 결과 |
|------|:----:|
| R2 업로드 LPON 35/35 | ✅ |
| R2 업로드 Miraeasset 15/15 | ✅ |
| MCP adapter 404→200 | ✅ |
| initialize (ai-foundry-lpon) | ✅ |
| tools/list (2,525 tools) | ✅ |
| tools/call (정책 평가 반환) | ✅ |
| Production 배포 svc-skill | ✅ |
| Production 배포 svc-mcp-server | ✅ |
