---
id: AX-DESIGN-226
title: Sprint 226 Design — M-UX-3 Engineer Workbench
type: Design
status: IN_PROGRESS
sprint: 226
date: 2026-04-21
author: Sinclair Seo
related_req: AIF-REQ-036
related_plan: sprint-226.plan.md
---

# Sprint 226 Design — M-UX-3 Engineer Workbench

---

## 1. Overview

Sprint 226은 Engineer Workbench(Split View + Provenance Inspector)를 구현하고, Admin 운영 화면 + AXIS DS Tier 2 레이어 + QA/E2E(TD-41 해소)를 완성한다.

---

## 2. Architecture Decisions

### 2.1 F381 AXIS DS Tier 2 대응 전략

`@axis-ds/react`가 npm 미출판 상태. 아래 전략으로 대응:

- `apps/app-web/src/components/axis-ds/` 디렉토리에 shadcn 래퍼 컴포넌트 8종 생성
- props 인터페이스를 `@axis-ds/react`의 예상 API와 호환되게 설계
- 향후 `@axis-ds/react` 출판 시 내부 구현만 교체하면 됨 (Breaking Change 없음)
- 교체율 목표: **≥ 80%** (기존 shadcn import → axis-ds wrapper import)

### 2.2 F391 Provenance API

```
GET /skills/:id/provenance/resolve
Authorization: X-Internal-Secret (서비스 간 호출)

Response:
{
  skillId: string
  provenance: {
    sources: Array<{
      type: "reverse-engineering" | "inference"
      path?: string        // spec-container 경로
      section?: string     // 섹션 제목
      confidence: number
    }>
    policies: Array<{ code, title, condition, criteria, outcome }>
    terms: Array<{ termId, label, definition }>
    documentId?: string
    r2Key: string
    extractedAt: string
  }
}
```

D1 `skills` 테이블 + R2 `.skill.json` + spec-container 메타데이터 집약.

### 2.3 F379 Split View

```
┌─────────────────────────────────────────────────┐
│  Engineer Workbench — /engineer/workbench/:id   │
│                                                 │
│  ┌──────────────────┬──────────────────────────┐ │
│  │   좌: Spec 패널  │  우: 재구성 마크다운      │ │
│  │                  │                          │ │
│  │  Policies 목록   │  # 정책 제목             │ │
│  │  (클릭 → 우 앵커)│  ## 적용 조건            │ │
│  │                  │  ## 판단 기준            │ │
│  │  Provenance 뱃지 │  ## 결과                 │ │
│  │  (클릭 → drawer) │                          │ │
│  └──────────────────┴──────────────────────────┘ │
│  [Provenance Inspector Drawer — F380]            │
└─────────────────────────────────────────────────┘
```

- 좌우 분할: CSS Grid (1fr 1fr), 리사이즈는 미구현 (MVP)
- 우측 스크롤: policy 클릭 → `element.scrollIntoView({ behavior: 'smooth' })`
- section 앵커: policy code → `id={policy.code}` 마크다운 heading

### 2.4 F380 Provenance Inspector

- Radix UI Sheet (right side) 사용
- F391 API 응답의 `sources` 배열 시각화
- 간단 방향 그래프: Document → Section → Policy 연결 (react-force-graph-2d 활용)

### 2.5 F382/F387 Admin

탭 구조: Users | Organization | Health | Audit Log | Usage

```
/admin
  ├── Tab: Users      — UsersManager.tsx (목록 + role 변경)
  ├── Tab: Org        — 조직 목록 + 정보
  ├── Tab: Health     — /health 엔드포인트 응답 테이블
  ├── Tab: Audit Log  — AuditLog.tsx (5 역할 매트릭스 + 필터)
  └── Tab: Usage      — API 호출 수 / 스킬 count / D1 row count
```

### 2.6 F392/TD-41 CF Access Mock

```typescript
// auth.setup.ts — CF_Authorization cookie 주입
await page.route('**/auth/me', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ email: 'test@ktds.co.kr', role: 'analyst', name: 'Test User' })
  });
});
// CF_Authorization는 Cloudflare Access가 주입. 테스트에서는 /auth/me mock으로 대체.
```

---

## 3. File Map

### Frontend (apps/app-web)

| 파일 | F-item | 작업 |
|------|--------|------|
| `src/pages/{analysis,benchmark,poc-ai-ready,poc-ai-ready-detail,poc-phase-2-report}.tsx` | F396 | 삭제 |
| `src/components/axis-ds/AxisButton.tsx` | F381 | 신규 |
| `src/components/axis-ds/AxisCard.tsx` | F381 | 신규 |
| `src/components/axis-ds/AxisTabs.tsx` | F381 | 신규 |
| `src/components/axis-ds/AxisDialog.tsx` | F381 | 신규 |
| `src/components/axis-ds/AxisInput.tsx` | F381 | 신규 |
| `src/components/axis-ds/AxisSelect.tsx` | F381 | 신규 |
| `src/components/axis-ds/AxisTooltip.tsx` | F381 | 신규 |
| `src/components/axis-ds/AxisBadge.tsx` | F381 | 신규 |
| `src/components/axis-ds/index.ts` | F381 | 신규 |
| `src/components/engineer/SpecSourceSplitView.tsx` | F379 | 신규 |
| `src/components/engineer/ProvenanceInspector.tsx` | F380 | 신규 |
| `src/pages/engineer/workbench.tsx` | F379/F380 | 신규 |
| `src/components/admin/UsersManager.tsx` | F382 | 신규 |
| `src/components/admin/AuditLog.tsx` | F387 | 신규 |
| `src/pages/admin.tsx` | F382/F387 | 신규 |
| `src/app.tsx` | F379/F382 | 라우트 추가 |
| `src/components/Sidebar.tsx` | F379/F382 | Engineer + Admin 링크 추가 |
| `src/api/provenance.ts` | F391 | 신규 — frontend API 클라이언트 |

### Backend (services/svc-skill)

| 파일 | F-item | 작업 |
|------|--------|------|
| `src/routes/provenance.ts` | F391 | 신규 |
| `src/index.ts` | F391 | 라우트 추가 |

### E2E (apps/app-web/e2e)

| 파일 | F-item | 작업 |
|------|--------|------|
| `e2e/auth.setup.ts` | F392/TD-41 | CF Access mock 구현 |
| `e2e/auth.spec.ts` | F392/TD-41 | skip 해제 |
| `e2e/rbac.spec.ts` | F392/TD-41 | skip 해제 |
| `e2e/functional.spec.ts` | F392/TD-41 | skip 해제 (필요 시) |

### Docs

| 파일 | F-item | 작업 |
|------|--------|------|
| `docs/03-analysis/features/section-only-pilot-f388.md` | F388 | 신규 |

---

## 4. Test Contract

### F391 (svc-skill provenance.test.ts)

- `GET /skills/:id/provenance/resolve` — D1 hit → R2 key → 응답 검증
- skillId not found → 404
- R2 object missing → 500 with message

### F392 E2E (Playwright)

- `auth.setup.ts`: `/auth/me` route mock → `{ email, role, name }`
- `auth.spec.ts`: "unauthenticated user → /welcome" 유지 (실 라우트)
- `auth.spec.ts`: 인증된 상태 → `/executive/overview` 접근 가능
- `rbac.spec.ts`: analyst role → fact-check 접근 가능

---

## 5. Worker 파일 매핑

| Worker | 담당 파일 | F-item |
|--------|-----------|--------|
| **A (Frontend)** | pages 삭제, axis-ds/, engineer/, admin/, Sidebar, app.tsx, api/provenance | F396+F379+F380+F381+F382+F387 |
| **B (Backend)** | svc-skill routes/provenance.ts + index.ts 추가 | F391 |
| **C (E2E + Docs)** | e2e/ mock, section-only-pilot-f388.md | F392+F388 |

---

## 6. Definition of Done

- [ ] F396: root 5파일 삭제 + Sidebar 14링크 실재 검증
- [ ] F391: `GET /skills/:id/provenance/resolve` 단위 테스트 PASS
- [ ] F379: Split View 렌더링 + policy→section 앵커 스크롤
- [ ] F380: Provenance drawer 열림/닫힘 + sources 시각화
- [ ] F381: 8종 wrapper 컴포넌트 생성, 기존 shadcn import ≥ 80% 교체
- [ ] F382: Admin 탭 4종 렌더링 (Users/Org/Health/Usage)
- [ ] F387: Audit Log 탭 추가 + 역할 매트릭스 표시
- [ ] F388: section-only-pilot-f388.md 문서 완성
- [ ] F392/TD-41: E2E skip 해제, CI pass count 기대치 달성
- [ ] typecheck + lint PASS
