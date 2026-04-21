---
id: AX-PLAN-226
title: Sprint 226 Plan — M-UX-3 Engineer Workbench
type: Plan
status: IN_PROGRESS
sprint: 226
date: 2026-04-21
author: Sinclair Seo
related_req: AIF-REQ-036
---

# Sprint 226 Plan — M-UX-3 Engineer Workbench

> **상위 계획**: `docs/01-plan/features/AIF-REQ-036.plan.md` §11 (Follow-up Plan)
>
> **Milestone**: M-UX-3 Engineer Workbench
>
> **F-items**: F396 + F391 + F379 + F380 + F381 + F382 + F387 + F388 + F392 (9건)
>
> **배치 원칙**: 위생 → API 백엔드 → UX 전면 → 운영 → QA/E2E(TD-41 해소)

---

## 1. Sprint 목표

1. **F396**: Gap-1 root 중복 파일 5건 정리 + Sidebar 라우트 정합성 100%
2. **F391**: `GET /skills/:id/provenance/resolve` API — svc-skill 신설
3. **F379**: Engineer Workbench Split View (좌 Spec / 우 재구성 마크다운)
4. **F380**: Provenance Inspector (우측 drawer + 그래프 탐색)
5. **F381**: AXIS DS Tier 2 wrapper 레이어 (8종, @axis-ds/react 미출판 대응)
6. **F382**: Admin 기본 (Users CRUD + Organization + Health + Usage)
7. **F387**: Role별 Audit Log 설계 + Admin 페이지 노출
8. **F388**: Section-only Fallback 실사용자 파일럿 (문서화)
9. **F392**: QA/E2E 자동화 + TD-41 해소 (E2E count 1→47 복원)

---

## 2. 선행 조건

- [x] Sprint 223 M-UX-1 MERGED (F370~F374, F385, F389)
- [x] Sprint 224 M-UX-2 MERGED (F375~F378, F386, F390)
- [x] Sprint 225 AIF-PLAN-037 G-1 Phase 2 MERGED (converter.ts 패치)
- [x] `@axis-ds/tokens` v1.1.2 npm 출판 확인 ✅
- [ ] `@axis-ds/react` npm 출판 미완 → F381 wrapper 패턴으로 대체

---

## 3. Wave 분해

### Wave 1 — 위생 선행 (F396, ~1.5h)

| 파일 | 작업 |
|------|------|
| `apps/app-web/src/pages/{analysis,benchmark,poc-ai-ready,poc-ai-ready-detail,poc-phase-2-report}.tsx` | root 5건 삭제 (`_archived/` 이미 존재) |
| `apps/app-web/src/app.tsx` | redirect 5건 유지 검증 |
| `apps/app-web/src/components/Sidebar.tsx` | 14 링크 실재 라우트 매칭 검증 |

### Wave 2 — 백엔드 API (F391, ~3h)

| 파일 | 작업 |
|------|------|
| `services/svc-skill/src/routes/provenance.ts` | 신규 — provenance resolve 핸들러 |
| `services/svc-skill/src/index.ts` | `GET /skills/:id/provenance/resolve` 라우트 추가 |
| `services/svc-skill/src/routes/provenance.test.ts` | 단위 테스트 |

### Wave 3 — UX 전면 (F379 + F380 + F381, ~10h)

| 파일 | 작업 |
|------|------|
| `apps/app-web/src/components/engineer/SpecSourceSplitView.tsx` | Split View — 좌 Spec, 우 재구성 마크다운 |
| `apps/app-web/src/components/engineer/ProvenanceInspector.tsx` | 우측 drawer + 그래프 |
| `apps/app-web/src/pages/engineer/workbench.tsx` | Engineer Workbench 페이지 |
| `apps/app-web/src/components/axis-ds/` | Tier 2 wrapper 8종 |
| `apps/app-web/src/app.tsx` | `/engineer/workbench/:skillId` 라우트 추가 |
| `apps/app-web/src/components/Sidebar.tsx` | Engineer 그룹 추가 |

### Wave 4 — 운영 (F382 + F387 + F388, ~9h)

| 파일 | 작업 |
|------|------|
| `apps/app-web/src/pages/admin.tsx` | Admin 기본 — 탭 기반 (Users/Org/Health/Usage) |
| `apps/app-web/src/components/admin/UsersManager.tsx` | Users CRUD UI |
| `apps/app-web/src/components/admin/AuditLog.tsx` | Audit Log 필터/검색 UI |
| `apps/app-web/src/app.tsx` | `/admin` 라우트 추가 |
| `docs/03-analysis/features/section-only-pilot-f388.md` | F388 파일럿 설계 + 가이드 |

### Wave 5 — QA/E2E + TD-41 (F392, ~4h)

| 파일 | 작업 |
|------|------|
| `apps/app-web/e2e/auth.setup.ts` | CF_Authorization cookie mock 주입 |
| `apps/app-web/e2e/auth.spec.ts` | skip 해제 — CF Access mock 기반 |
| `apps/app-web/e2e/rbac.spec.ts` | skip 해제 — loginAs() mock 재구현 |
| `apps/app-web/e2e/functional.spec.ts` | skip 해제 |

---

## 4. KPI 목표

| KPI | 목표 | 측정 방법 |
|-----|------|-----------|
| KPI-1 | 3분 내 Executive View 파악 | 관찰 (Sprint 226 완료 후) |
| KPI-2 | Split View 역추적 ≤ 3 클릭 | E2E 스크립트 |
| KPI-3 | E2E 통과율 ≥ 95%, count 47 복원 | Playwright CI |

---

## 5. 리스크 및 대응

| # | 리스크 | 대응 |
|---|--------|------|
| RP-1 | @axis-ds/react 미출판 | F381: wrapper 패턴 (인터페이스 동일, shadcn 내부) |
| RP-7 | Section-only fallback 사용자 체감 | F388: 3명 인터뷰 설계 문서 + 결과 기록 |
| RP-E2E | TD-41 CF Access mock 복잡도 | `page.route()` + msw 패턴으로 `/auth/me` stub |
