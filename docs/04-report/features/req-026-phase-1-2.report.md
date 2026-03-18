---
code: AIF-RPRT-026B
title: "Foundry-X MCP 통합 Phase 1-2 — 완료 보고서"
version: "1.0"
status: Active
category: RPRT
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: req-026-phase-1-2
refs: "[[AIF-PLAN-026B]] [[AIF-DSGN-026B]] [[AIF-ANLS-026B]]"
---

# Foundry-X MCP 통합 Phase 1-2 — 완료 보고서

> **REQ**: AIF-REQ-026 (P1, IN_PROGRESS)
> **PDCA Cycle**: Plan → Design → Do → Check (95%) → Report

---

## Executive Summary

### 1.1 Project Overview

| 항목 | 내용 |
|------|------|
| **Feature** | Foundry-X MCP 통합 Phase 1-2 — 다중 Skill 등록 + R2 수정 |
| **REQ** | AIF-REQ-026 |
| **기간** | 2026-03-19 (단일 세션) |
| **PDCA** | Plan → Design → Do (2-worker team) → Check → Report |

### 1.2 Results

| 지표 | 값 |
|------|-----|
| **Match Rate** | 95% (37/39) |
| **GAP** | 2건 (Low/Info) |
| **BONUS** | 4건 |
| **변경 파일** | 9개 |
| **신규 LOC** | +1,545 |
| **테스트** | 17 신규, 266 전체 PASS |
| **R2 업로드** | 50/50 (LPON 35 + Miraeasset 15) |
| **E2E** | initialize → 2,525 tools → tools/call 성공 |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | Bundled skills 50개가 R2에 미업로드되어 MCP adapter 404 반환. Skill당 개별 MCP 서버 등록 방식은 관리 복잡도 O(N) |
| **Solution** | (1) LLM 호출 없이 D1 캐시 + production API 기반 R2 재업로드 스크립트 구현, (2) org 단위 통합 MCP 엔드포인트(`POST /mcp/org/:orgId`) 구현, (3) 848+ tool SDK 크래시를 raw JSON-RPC로 해결 |
| **Function/UX Effect** | Foundry-X 에이전트가 `POST /mcp/org/LPON` 단일 연결로 848개 정책 도구 접근. tools/call → 정책 평가 3.6초 응답. 기존 `/mcp/:skillId` 하위 호환 유지 |
| **Core Value** | MCP 등록 복잡도 O(N)→O(1), bundled skills R2 gap 해소로 50개 전체 MCP 활성화. Phase 1-1의 단일 skill PoC에서 **production 전량 연동**으로 확장 |

---

## 2. 실행 내역

### 2.1 PDCA 타임라인

| Phase | 산출물 | 소요 |
|-------|--------|------|
| **Plan** | AIF-PLAN-026B (스프린트 계획 4 Task) | 15분 |
| **Design** | AIF-DSGN-026B (상세 설계 8 섹션) | 20분 |
| **Do** | 2-worker /ax-06-team 병렬 구현 + leader R2 업로드 | ~90분 |
| **Check** | AIF-ANLS-026B (95% match rate) | 10분 |
| **Report** | 본 문서 | 5분 |
| **합계** | | **~140분** |

### 2.2 Task 완료 상태

| Task | 상태 | 상세 |
|------|:----:|------|
| **T1: R2 재업로드** | ✅ | LPON 35 + Miraeasset 15 = 50/50 업로드. LLM 호출 0회 |
| **T2-A: svc-skill org adapter** | ✅ | handleGetOrgMcpAdapter — D1→R2 병렬 fetch + 도구 합산 + KV 캐시 |
| **T2-B: svc-skill 라우트** | ✅ | GET /skills/org/:orgId/mcp |
| **T2-C: svc-mcp-server org endpoint** | ✅ | POST /mcp/org/:orgId — raw JSON-RPC (SDK 크래시 해결) |
| **배포** | ✅ | svc-skill + svc-mcp-server production 배포 |
| **T4: E2E 검증** | ✅ | initialize → tools/list (2,525) → tools/call 정책 평가 |

### 2.3 변경 파일

| # | 파일 | 유형 | LOC |
|---|------|------|:---:|
| 1 | `services/svc-skill/src/routes/mcp.ts` | 수정 | +117 |
| 2 | `services/svc-skill/src/index.ts` | 수정 | +22 |
| 3 | `services/svc-skill/src/routes/mcp.test.ts` | 수정 | +153 |
| 4 | `services/svc-mcp-server/src/index.ts` | 수정 | +150→+101 |
| 5 | `services/svc-mcp-server/src/__tests__/org-mcp.test.ts` | 신규 | +80 |
| 6 | `scripts/upload-bundled-r2.ts` | 신규 | +282 |
| 7 | `docs/01-plan/features/req-026-phase-1-2.plan.md` | 신규 | Plan |
| 8 | `docs/02-design/features/req-026-phase-1-2.design.md` | 신규 | Design |
| 9 | `CLAUDE.md` | 수정 | 갱신 |

---

## 3. 기술 결정 기록

### 3.1 SDK → Raw JSON-RPC 전환

| 항목 | SDK 방식 (설계) | JSON-RPC 방식 (구현) |
|------|:-:|:-:|
| Worker 크래시 | ❌ (848 tool 등록 시 OOM) | ✅ |
| MCP 프로토콜 호환 | ✅ | ✅ (initialize/tools/list/tools/call) |
| 코드 복잡도 | 낮음 (SDK 추상화) | 중간 (직접 핸들링) |
| 유지보수 | SDK 업데이트 자동 반영 | 프로토콜 변경 시 수동 대응 |

**결정 근거**: Workers 128MB 메모리 한도 내에서 848개 Zod 스키마 + 클로저 인스턴스화가 불가. raw JSON-RPC가 유일한 해결책.

### 3.2 Bundled Skills 수 변경

| 항목 | MEMORY.md 기존 | 실제 (production D1) |
|------|:-:|:-:|
| LPON bundled | 12 | **35** |
| Miraeasset bundled | 15 | 15 |
| 합계 | 27 | **50** |

LPON이 12→35로 증가한 원인: rebundle 시 동일 카테고리가 세분화되어 여러 skill로 분할됨. tools/list에서 2,525개 도구가 반환되는 것도 이 때문 (848 정책 × 중복 분배).

---

## 4. 잔여 이슈 및 후속 작업

### 4.1 GAP (미해소)

| # | 내용 | 심각도 | 대응 |
|---|------|:------:|------|
| GAP-1 | KV 캐시 무효화 미구현 | Low | TTL 1h 자연 만료로 충분 |

### 4.2 후속 작업

| # | 내용 | 우선순위 |
|---|------|:--------:|
| 1 | **도구 중복 해소**: LPON 35 bundled skills의 동일 카테고리 중복 정리 (2,525→848) | P1 |
| 2 | **Foundry-X McpServerRegistry 등록**: org 단위 서버 자동 등록 API | P2 |
| 3 | **Phase 1-3**: Foundry-X TaskType 확장 (policy-evaluation, skill-query) | P2 |
| 4 | **Miraeasset org MCP 검증**: `/mcp/org/Miraeasset` E2E | P2 |

---

## 5. 교훈

| # | 교훈 | 카테고리 |
|---|------|----------|
| 1 | MCP SDK `server.tool()`은 ~100개 이하에서만 안전. 대량 도구는 raw JSON-RPC 필수 | Architecture |
| 2 | `wrangler r2 object put`의 `--remote` vs `--env production` 비대칭 — D1과 R2의 CLI 인터페이스가 다름 | Operations |
| 3 | API 응답 camelCase vs D1 snake_case — 새 스크립트 작성 시 항상 실제 API 응답 먼저 확인 | Development |
| 4 | Worker 2명 병렬 실행(/ax-06-team)이 구현 시간 단축에 효과적. 단, 범위 이탈 감시 필수 | Team |
| 5 | Cloudflare 계정 전환 시 API 토큰의 account ID가 달라짐 — REST API 직접 호출이 안정적 | Operations |

---

## 참조 문서

| 문서 | 코드 | 파일 |
|------|------|------|
| Plan | AIF-PLAN-026B | `docs/01-plan/features/req-026-phase-1-2.plan.md` |
| Design | AIF-DSGN-026B | `docs/02-design/features/req-026-phase-1-2.design.md` |
| Analysis | AIF-ANLS-026B | `docs/03-analysis/features/req-026-phase-1-2.analysis.md` |
| Parent Plan | AIF-PLAN-026 | `docs/01-plan/features/foundry-x-integration.plan.md` |
| Phase 1-1 Report | AIF-RPRT-028 | `docs/04-report/AIF-RPRT-028_mcp-integration-phase-1-1.md` |
