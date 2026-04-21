---
code: AIF-DSGN-036
title: "Decode-X v1.3 Phase 3 UX 재편 — Design Document"
version: "0.1"
status: Draft
category: DSGN
created: 2026-04-21
updated: 2026-04-21
author: Sinclair Seo
related:
  - docs/01-plan/features/AIF-REQ-036.plan.md
  - docs/req-interview/decode-x-v1.3-phase-3-ux/prd-final.md
  - SPEC.md §7 AIF-REQ-036
---

# Decode-X v1.3 Phase 3 UX 재편 — Design Document

> **Summary**: 5 페르소나 + 24 페이지 혼재 UX를 **Google OAuth 기반 4 역할 × 듀얼 트랙**(Executive View + Engineer Workbench) + AXIS DS 첫 Full 소비자 레퍼런스로 재편한다. 핵심 기술: Cloudflare Access + Google IdP 인증, D1 `users` + `audit_log` 2 테이블, `GET /skills/:id/provenance/resolve` 신규 API, Feature Flag 듀얼 화면, Fallback 3단계 State Machine, shadcn → `@axis-ds/react` 8 컴포넌트 교체.
>
> **Project**: Decode-X (AI Foundry / Foundry-X 제품군)
> **REQ**: AIF-REQ-036 (P1, PLANNED)
> **Version**: v0.1 Draft
> **Author**: Sinclair Seo
> **Date**: 2026-04-21
> **Status**: Draft — Sprint 219 착수 대기
> **Plan**: `docs/01-plan/features/AIF-REQ-036.plan.md`

---

## 1. Overview

### 1.1 Design Goals

1. **본부장 3분 설득 Executive View** — Foundry-X round-trip 실사례 6건을 단일 타임라인으로 시각화, hover/expand로 drift·AI-Ready·검증 담당자 1클릭 확인
2. **엔지니어 3클릭 역추적 Split View** — Skill 카탈로그 → Detail → Provenance Inspector 3-단계 내 section heading 포커스 도달
3. **Graceful Degradation 기본 원칙** — Provenance 데이터 불완전성(sourceLineRange 0%, pageRef optional)을 UX에서 명시적 표기 + 상위 fallback 안내
4. **AXIS DS 첫 Full 소비자** — `@axis-ds/tokens` + `@axis-ds/react` 8종 교체 + 도메인 특화 컴포넌트 3종 기여
5. **IAM 체계 정식화** — Cloudflare Access + Google IdP로 앱 OAuth 로직 zero, D1 users 테이블로 역할/감사 기록 일원화

### 1.2 Design Principles

- **IDP-first**: 앱 코드에 OAuth flow 두지 않음 (CF Access JWT만 소비)
- **Feature Flag 우선**: `?legacy=1` 듀얼 화면으로 롤백 쉬움, 단계적 교체
- **Provenance 정직성**: 데이터 부재는 Badge/Tooltip으로 명시, 가짜 데이터 생성 금지 (R1/R2 정직성 원칙 유지)
- **TypeScript strict 준수**: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` 포함
- **AXIS DS 점진 적용**: Tier 1(토큰) → Tier 2(react) → Tier 3(기여) 순서, 미성숙 시 shadcn 유지 fallback

### 1.3 Relationship with AIF-REQ-035 (Phase 3 본 PRD)

```
REQ-035 Phase 3 (품질 도구 + Production 운영화)    REQ-036 (UX 재편)
┌─────────────────────────────────────────┐       ┌─────────────────────────────┐
│ M-2 Foundry-X Production E2E 6/6        │ data  │ Executive View              │
│ AI-Ready Score, DIVERGENCE 마커,         │──────▶│ └─ Foundry-X 타임라인 위젯 │
│ TD-24 DIVERGENCE 공식 발행 (5건)         │       │                             │
│ AIF-REQ-036 데이터 소스 역할             │       │ Engineer Workbench          │
│                                         │       │ └─ Split View (Spec→Source) │
└─────────────────────────────────────────┘       │ └─ Provenance Inspector     │
                                                  └─────────────────────────────┘
```

- REQ-035 Must 산출물 = REQ-036 Executive View 데이터 소스
- REQ-036 완성도 ∝ REQ-035 Must 완성도

### 1.4 Related Documents

- **Plan**: [AIF-PLAN-036] `docs/01-plan/features/AIF-REQ-036.plan.md`
- **PRD**: `docs/req-interview/decode-x-v1.3-phase-3-ux/prd-final.md` (v0.3, R1+R2 평균 75/100)
- **Provenance 실측**: `docs/03-analysis/features/provenance-coverage-2026-04-21.md`
- **AXIS DS 구상**: `docs/AX-BD-MSA-Restructuring-Plan.md §S7`
- **병렬 본 PRD**: `docs/req-interview/decode-x-v1.3-phase-3/prd-final.md`

---

## 2. Architecture

### 2.1 전체 컴포넌트 계층 (목표 구조)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Access (Google IdP)                    │
│                  JWT audience + Allowlist 검증                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │ CF-Access-JWT-Assertion 헤더
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   apps/app-web (React + Vite SPA)                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  lib/auth.ts (JWT 파싱 → role/email)                        │    │
│  │  lib/feature-flag.ts (?legacy=1 토글)                       │    │
│  └──────────────┬──────────────────────────────────────────────┘    │
│                 │                                                    │
│  ┌──────────────▼───────────┐  ┌────────────────────────┐           │
│  │ Mode Router              │  │ Legacy UI (?legacy=1)  │           │
│  │ ├─ Guest: /welcome       │  │ 기존 5 페르소나 유지    │           │
│  │ ├─ Executive: Overview   │  │ (롤백용, S222 삭제)    │           │
│  │ ├─ Engineer: Workbench   │  └────────────────────────┘           │
│  │ └─ Admin: Users/...      │                                       │
│  └───────┬──────────────────┘                                       │
│          │                                                          │
│  ┌───────▼──────────────────────────────────────────────────────┐   │
│  │ AXIS DS @ react Tier 2 (Button/Card/Tabs/Dialog/...)         │   │
│  │ + 도메인 특화 (SpecSourceSplitView/ProvenanceInspector/...)  │   │
│  └───────┬──────────────────────────────────────────────────────┘   │
└──────────┼──────────────────────────────────────────────────────────┘
           │ HTTPS + X-Internal-Secret (내부 호출) OR CF-Access-JWT (프론트)
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│             services/svc-skill (Cloudflare Worker)                  │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │ GET /skills                    (기존 — 카탈로그)          │      │
│  │ GET /skills/:id                (기존 — Detail)            │      │
│  │ GET /skills/:id/provenance/resolve  ← NEW (F391)         │      │
│  └────────────────────┬──────────────────────────────────────┘      │
│                       │                                              │
│  ┌────────────────────▼──────────────────────────────────────┐      │
│  │ provenance/resolver.ts                                     │      │
│  │ 1. D1 skills 테이블 조회 (r2_key, spec_container_id)       │      │
│  │ 2. R2 .skill.json 파싱 (Provenance.sourceDocumentIds[])    │      │
│  │ 3. spec-container/*/provenance.yaml 읽기 (path, section)   │      │
│  │ 4. 병합하여 ResolvedProvenance 반환                         │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ D1 db-skill      │    │ R2 skill-pkg     │    │ spec-containers  │
│ - skills         │    │ .skill.json      │    │ provenance.yaml  │
│ - users (NEW)    │    │                  │    │                  │
│ - audit_log (NEW)│    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 2.2 Data Flow: Spec→Source 역추적 (3클릭)

```
User @ Skill Catalog
  │
  │ (1) Click: Skill 카드 "charge-process-policy"
  ▼
Skill Detail 페이지 (좌측 Spec 로드)
  │
  │ (2) Click: Provenance Inspector 버튼 (우측 drawer)
  ▼
GET /skills/:id/provenance/resolve 호출
  │
  ▼
┌────────────────────────────────────────────┐
│ ResolvedProvenance                         │
│ {                                          │
│   documentId: "lpon-charge",              │
│   sources: [                               │
│     {                                      │
│       path: "반제품-스펙/pilot-lpon-cancel/│
│              01-business-logic.md",        │
│       section: "시나리오 1: 충전",         │
│       confidence: 0.92,                    │
│       pageRef: null  // fallback trigger  │
│     }                                      │
│   ],                                       │
│   fallbackState: "section-only"           │
│ }                                          │
└────────────────────────────────────────────┘
  │
  │ (3) Click: 재구성 마크다운 우측 패널의 section heading 앵커
  ▼
Split View 우측 = 해당 .md 렌더링 + section 자동 스크롤
(pageRef 있으면 함께 표시, 없으면 section-only Badge)
```

### 2.3 Data Flow: OAuth 로그인

```
Guest → GET /welcome
  │
  │ Click "Google로 로그인"
  ▼
Cloudflare Access (CF-Access-Aud + Google IdP)
  │
  │ Google OAuth consent screen
  ▼
Google IdP returns → CF Access verifies allowlist
  │
  │ CF-Access-JWT-Assertion 헤더 주입 + 302 redirect
  ▼
apps/app-web (JWT 파싱)
  │
  │ lib/auth.ts: jwt.email 추출
  │
  ▼
D1 users 테이블 조회
  │ ├── 존재: last_login UPDATE + role 로드
  │ └── 신규: INSERT (primary_role = env.DEFAULT_NEW_USER_ROLE or 'engineer')
  ▼
Mode Router 라우팅
  ├── primary_role === 'executive' → /executive/overview
  ├── primary_role === 'engineer' → /engineer/workbench
  └── primary_role === 'admin' → /admin/users
```

### 2.4 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| app-web `lib/auth.ts` | CF Access JWT header | JWT audience 검증, email/role 추출 |
| app-web `lib/feature-flag.ts` | URL query parser | `?legacy=1` 듀얼 렌더 분기 |
| app-web `executive/` | svc-skill (기존) + REQ-035 M-2 데이터 | Foundry-X 타임라인 데이터 소스 |
| app-web `engineer/SpecSourceSplitView` | svc-skill `/provenance/resolve` API | Split View 우측 데이터 |
| svc-skill `routes/provenance.ts` | D1 skills + R2 .skill.json + spec-container 파일 | Resolved Provenance 생성 |
| D1 `users` 테이블 | D1 db-skill (신규 마이그 0010) | 역할/세션/last_login |
| D1 `audit_log` 테이블 | D1 db-skill (신규 마이그 0011) | Role별 감사 로그 (F387) |

---

## 3. Data Model

### 3.1 D1 users 테이블 (F371, 0010_users.sql)

```sql
-- infra/migrations/db-skill/0010_users.sql

CREATE TABLE users (
  email TEXT PRIMARY KEY,
  primary_role TEXT NOT NULL CHECK (primary_role IN ('executive', 'engineer', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  last_login INTEGER,                    -- Unix epoch seconds
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  display_name TEXT,
  metadata TEXT                          -- JSON {department, notes, ...}
);

CREATE INDEX idx_users_role_status ON users(primary_role, status);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Bootstrap: env.ADMIN_ALLOWLIST_EMAILS 기반 초기 Admin INSERT
-- svc-skill 배포 시 migration 이후 일회성 seed 스크립트 실행
```

### 3.2 D1 audit_log 테이블 (F387, 0011_audit_log.sql)

```sql
-- infra/migrations/db-skill/0011_audit_log.sql

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,                  -- 'login', 'skill.view', 'provenance.resolve', 'admin.user.update', ...
  resource_type TEXT,                    -- 'skill', 'user', 'provenance', 'archive', ...
  resource_id TEXT,
  metadata TEXT,                         -- JSON (diff, ip, ua, ...)
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_audit_actor_time ON audit_log(actor_email, created_at DESC);
CREATE INDEX idx_audit_action_time ON audit_log(action, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
```

### 3.3 TypeScript 타입 (packages/types/src/users.ts 신규)

```typescript
import { z } from 'zod';

export const UserRoleSchema = z.enum(['executive', 'engineer', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  email: z.string().email(),
  primaryRole: UserRoleSchema,
  status: z.enum(['active', 'suspended']).default('active'),
  lastLogin: z.number().int().nullable(),
  createdAt: z.number().int(),
  displayName: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type User = z.infer<typeof UserSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.number().int().optional(),
  actorEmail: z.string().email(),
  actorRole: UserRoleSchema,
  action: z.string().min(1),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number().int().optional(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
```

### 3.4 ResolvedProvenance 타입 (packages/types/src/provenance.ts 확장)

```typescript
export const FallbackStateSchema = z.enum([
  'full',           // documentId + pageRef + section + excerpt 모두 존재
  'section-only',   // section만 존재 (pageRef 없음) — 가장 흔한 케이스
  'section-missing',// provenance.yaml 자체 부재 → 원본 미존재 Badge
]);

export const ResolvedProvenanceSchema = z.object({
  skillId: z.string(),
  documentId: z.string(),                            // always present (DB NOT NULL)
  sources: z.array(z.object({
    type: z.enum(['reverse-engineering', 'forward-engineering']),
    path: z.string(),                                 // 재구성 마크다운 path (반제품-스펙/*/*.md)
    section: z.string().optional(),                   // heading anchor
    pageRef: z.string().optional(),                   // F365 선택 실측 후 결정
    confidence: z.number().min(0).max(1),
    excerpt: z.string().optional(),
  })),
  fallbackState: FallbackStateSchema,
  resolvedAt: z.number().int(),                       // Unix epoch
});
export type ResolvedProvenance = z.infer<typeof ResolvedProvenanceSchema>;
```

---

## 4. API Specification

### 4.1 GET /skills/:id/provenance/resolve (F391)

**Purpose**: Skill 하나의 provenance 전체(R2 + D1 + spec-container)를 단일 호출로 병합 반환.

**Request**:
```http
GET /skills/66f5e9cc-77f9-406a-b694-338949db0901/provenance/resolve
Authorization: Bearer <CF-Access-JWT>
```

**Response 200**:
```json
{
  "skillId": "66f5e9cc-77f9-406a-b694-338949db0901",
  "documentId": "lpon-charge",
  "sources": [
    {
      "type": "reverse-engineering",
      "path": "반제품-스펙/pilot-lpon-cancel/01-business-logic.md",
      "section": "시나리오 1: 충전 (Top-up)",
      "pageRef": null,
      "confidence": 0.92,
      "excerpt": null
    }
  ],
  "fallbackState": "section-only",
  "resolvedAt": 1713750000
}
```

**Response 404**: Skill ID 없음
**Response 503**: R2/D1/파일시스템 중 1개 장애 → `fallbackState: "section-missing"` 반환 + Warning 헤더

**Error Handling**:
- D1 skills 조회 실패 → 404
- R2 .skill.json 부재 → `fallbackState: "section-missing"`, Warning log
- spec-container provenance.yaml 부재 → `fallbackState: "section-missing"`, sources 빈 배열
- 부분 성공(일부 source만 확보) → `sources`는 확보된 것만, fallback은 전체 기준 판정

**Caching**: KV cache TTL 1h (기존 MCP 캐시 패턴 재활용)

### 4.2 Admin User CRUD (F382)

| Method | Path | Purpose | Role |
|--------|------|---------|:----:|
| GET | `/internal/admin/users` | 전체 users 조회 + 페이지네이션 | admin |
| POST | `/internal/admin/users` | 신규 등록 (bootstrap 외) | admin |
| PATCH | `/internal/admin/users/:email` | role 변경, status 변경 | admin |
| DELETE | `/internal/admin/users/:email` | suspended 전환 (하드 삭제 금지) | admin |
| GET | `/internal/admin/audit-log` | Role별 감사 로그 조회 (filter: actor/action/resource/time-range) | admin |

**Route location**: `services/svc-skill/src/routes/admin-users.ts` 신규

### 4.3 Executive View 데이터 집약 (F375, F376)

Executive View는 **기존 svc-skill + svc-policy 조회**를 집약하는 frontend-side composition으로 구현. 신규 API 없이 4개 기존 endpoint 병렬 호출:

1. `GET /skills?domain=pension&limit=100` — skill 수/trust score
2. `GET /policies?status=approved&limit=100` — policy count
3. `GET /handoff/jobs?status=completed` — Foundry-X round-trip 이력 (REQ-035 M-2 산출물)
4. `GET /factcheck/domain-summary` — coverage

집약 결과를 React Query로 캐시 (staleTime 60s).

---

## 5. UI Component Design

### 5.1 컴포넌트 계층

```
apps/app-web/src/
├── components/
│   ├── axis-ds/              (NEW — Tier 2 래퍼, shadcn 호환 인터페이스 유지)
│   │   ├── Button.tsx        → @axis-ds/react/Button
│   │   ├── Card.tsx          → @axis-ds/react/Card
│   │   ├── Tabs.tsx          → @axis-ds/react/Tabs
│   │   ├── Dialog.tsx        → @axis-ds/react/Dialog
│   │   ├── Input.tsx         → @axis-ds/react/Input
│   │   ├── Select.tsx        → @axis-ds/react/Select
│   │   ├── Tooltip.tsx       → @axis-ds/react/Tooltip
│   │   └── Badge.tsx         → @axis-ds/react/Badge
│   ├── executive/            (NEW)
│   │   ├── ExecutiveOverview.tsx          (F375, 4-Group 요약)
│   │   ├── FoundryXTimeline.tsx           (F376, 6 서비스 timeline)
│   │   ├── HandoffCard.tsx                (F376, 카드 per 서비스)
│   │   ├── HandoffDetailModal.tsx         (F376, hover/expand 상세)
│   │   └── ComplianceBadge.tsx            (F386, 규제 준수 뱃지)
│   ├── engineer/             (NEW)
│   │   ├── SkillCatalog.tsx               (기존 재배치 + 필터 강화)
│   │   ├── SpecSourceSplitView.tsx        (F379, 좌우 분할)
│   │   ├── ProvenanceInspector.tsx        (F380, 우측 drawer)
│   │   ├── FallbackBanner.tsx             (F379, section-only/missing Badge + Tooltip)
│   │   ├── ReconstructedMarkdownRenderer.tsx (F379, 우측 패널, react-markdown + heading 앵커)
│   │   └── StageReplayer.tsx              (S222 Tier 3 기여 후보)
│   ├── admin/                (NEW)
│   │   ├── UsersManager.tsx               (F382)
│   │   ├── UserDetailModal.tsx            (F382)
│   │   ├── AuditLogViewer.tsx             (F387)
│   │   └── UsageDashboard.tsx             (F382, CF Analytics 연동)
│   ├── _archived/            (5건 하드 삭제 대상, git mv 후 삭제)
│   └── common/
│       ├── ModeToggle.tsx                 (F374, Executive ↔ Engineer 수동 전환)
│       └── LegacyBanner.tsx               (?legacy=1 시 상단 안내)
├── pages/
│   ├── welcome.tsx                        (F372, Guest 랜딩 + Google CTA)
│   ├── executive/
│   │   ├── overview.tsx
│   │   ├── evidence.tsx                   (F378, analysis-report + org-spec + poc-report 재배치)
│   │   └── export.tsx                     (기존 유지)
│   ├── engineer/
│   │   ├── workbench.tsx
│   │   ├── replay.tsx
│   │   ├── spec-catalog.tsx
│   │   └── verify.tsx                     (hitl + fact-check + gap-analysis 통합)
│   ├── admin/
│   │   ├── users.tsx
│   │   ├── organization.tsx
│   │   ├── health.tsx
│   │   └── usage.tsx
│   └── _archived/                         (5건: analysis, poc-phase-2-report, poc-ai-ready, poc-ai-ready-detail, benchmark)
├── lib/
│   ├── auth.ts                            (F370, CF Access JWT 파싱)
│   ├── feature-flag.ts                    (F374)
│   └── api-client.ts                      (기존 확장)
└── styles/
    └── axis-ds-tokens.css                 (F373, @axis-ds/tokens 주입)
```

### 5.2 SpecSourceSplitView 상태 정의 (F379)

```typescript
interface SpecSourceSplitViewState {
  skillId: string;
  spec: SkillPackage;                        // 좌측 데이터
  provenance: ResolvedProvenance | 'loading' | 'error';
  rightPanelMode: 'markdown' | 'monospace' | 'inspector';
  activeSection: string | null;              // heading anchor state
  fallbackAcknowledged: boolean;             // Banner dismiss 상태
}

// State transitions:
// INITIAL → LOADING (provenance/resolve 호출)
//   → SUCCESS (fallbackState = 'full' | 'section-only' | 'section-missing')
//   → ERROR (network 실패 — 재시도 버튼 노출)
```

### 5.3 Fallback Flow State Machine (F379, F388 검증)

```
┌──────────────────┐
│ LOADING          │  GET /provenance/resolve 호출 중
└────────┬─────────┘
         │ response
         ▼
┌────────────────────────────────────────────────────────┐
│ SUCCESS                                                │
│                                                        │
│  ┌──────────────────────────┐                         │
│  │ fallbackState: 'full'    │                         │
│  │ → 재구성 마크다운 + section │                       │
│  │   + pageRef 함께 표시      │                         │
│  │ → Badge: "완전 연결"       │                         │
│  └──────────────────────────┘                         │
│                                                        │
│  ┌──────────────────────────┐                         │
│  │ fallbackState:           │                         │
│  │  'section-only'          │                         │
│  │ → 재구성 마크다운 + section │                       │
│  │   only (pageRef null)    │                         │
│  │ → Banner: "원본 페이지 앵커│                       │
│  │   없음 — F365 예정"       │                         │
│  └──────────────────────────┘                         │
│                                                        │
│  ┌──────────────────────────┐                         │
│  │ fallbackState:           │                         │
│  │  'section-missing'       │                         │
│  │ → 재구성 마크다운 미로드   │                         │
│  │ → Banner: "원본 근거 미존재│                       │
│  │   — Issue Raise 버튼"    │                         │
│  │ → documentId만 표시       │                         │
│  └──────────────────────────┘                         │
└────────────────────────────────────────────────────────┘
         │
         │ user clicks "Issue Raise" (section-missing)
         ▼
┌────────────────────────────────────────────────────────┐
│ GitHub Issue 생성 폼 (사전 채움: skillId + state)       │
│ → 작성자 수동 보고, Phase 4+ F364 backlog 입력          │
└────────────────────────────────────────────────────────┘

ERROR (network 실패)
 → Banner: "Provenance 로드 실패 — 재시도" + 재시도 버튼
```

### 5.4 Executive Foundry-X 타임라인 (F376)

```
┌─────────────────────────────────────────────────────────────────┐
│ Foundry-X Production 핸드오프 실사례                              │
│ (REQ-035 M-2 데이터 소스)                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   예산          충전          구매          결제                 │
│  ●────●────●────●                                               │
│  Pass  Gate  409→Pass         ...                               │
│                                                                 │
│   [환불 ■] [선물 □]                                              │
│    ↑        ↑                                                   │
│  Failed   Pending                                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Hover on 카드:                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 충전 (lpon-charge)                                   │        │
│  │ 검증 완료: 2026-04-21 19:30                          │        │
│  │ AI-Ready Score: 0.82                                │        │
│  │ Drift: 자가보고 99% / 독립 95%                       │        │
│  │ 담당자: Sinclair Seo                                │        │
│  │ 주요 정책: 8건 (POL-LPON-CHARGE-001~008)           │        │
│  │ 스킬: 1건 (66f5e9cc-...)                           │        │
│  │ Round-trip: Decode-X → Foundry-X → Gate Pass       │        │
│  │ Compliance: PII masking ✓  Audit log ✓             │        │
│  │ [Engineer View에서 자세히 →]                          │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Page Route 매핑 (Archive 실행, F377)

| 현 경로 | 액션 | 신 경로 / 처리 |
|---------|:----:|----------------|
| `/analysis` | 🗑️ Archive | `_archived/` 이동 후 삭제 (S222) |
| `/poc-phase-2-report` | 🗑️ Archive | 동상 |
| `/poc-ai-ready` | 🗑️ Archive | 동상 |
| `/poc-ai-ready-detail` | 🗑️ Archive | 동상 |
| `/benchmark` | 🗑️ Archive | 동상 |
| `/dashboard` | ♻️ 재설계 | `/executive/overview` (F375) |
| `/login` | ♻️ 재설계 | CF Access 리다이렉트 (실제 로그인은 IdP) |
| `/skill-detail` | ♻️ 재설계 | `/engineer/workbench/:id` (Split View) |
| `/upload` + `/source-upload` | ♻️ 재설계 | `/engineer/upload` (통합) |
| `/analysis-report` | 📦 이관 | `/executive/evidence` 하위 (F378) |
| `/org-spec` | 📦 이관 | 동상 |
| `/poc-report` | 📦 이관 | 동상 |
| `/hitl`, `/fact-check`, `/gap-analysis` | 📦 이관 | `/engineer/verify` 통합 |
| `/spec-catalog`, `/spec-detail` | 📦 이관 | `/engineer/spec-catalog` |
| `/ontology` | 📦 이관 | `/engineer/tools/ontology` |
| `/api-console`, `/settings` | 📦 이관 | `/admin/*` |
| `/export-center`, `/guide`, `/not-found`, `/mockup` | 공용 유지 | 변경 없음 |

---

## 6. Feature Flag Rollout (F374)

### 6.1 분기 로직

```typescript
// lib/feature-flag.ts
export function isLegacyMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('legacy') === '1';
}

// apps/app-web/src/app.tsx (루트)
export function App() {
  const legacy = isLegacyMode();
  if (legacy) {
    return <LegacyAppWithBanner />;   // 기존 5 페르소나 유지
  }
  return <NewAppWithOAuth />;          // 신규 4 역할
}
```

### 6.2 롤아웃 단계

1. **S219 개발 중**: `?legacy=1` 기본 동작 (관리자만 신규 접근)
2. **S220 중간**: 신규 기본 + `?legacy=1`로 기존 접근 가능
3. **S221 완료 + 스모크 PASS**: Legacy 코드 삭제 준비 → S222 Should
4. **S222**: `?legacy=1` 삭제 + 5 페르소나 코드 완전 제거

---

## 7. OAuth Sequence Diagram (F370)

```
┌─────────┐  ┌──────────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐
│ Browser │  │ CF Access    │  │ Google   │  │ app-web│  │ lib/auth│  │ D1 users │
│  (User) │  │ (Edge)       │  │ IdP      │  │ (SPA)  │  │         │  │          │
└────┬────┘  └──────┬───────┘  └────┬─────┘  └───┬────┘  └────┬────┘  └─────┬────┘
     │              │                │            │            │             │
     │ GET /executive/overview       │            │            │             │
     ├─────────────▶│                │            │            │             │
     │              │ No JWT, redirect to Google  │            │             │
     │◀─────────────┤                │            │            │             │
     │              │                │            │            │             │
     │ Google OAuth consent          │            │            │             │
     ├───────────────────────────────▶            │            │             │
     │              │                │            │            │             │
     │◀───────────────────────────────┤ redirect back with code │             │
     │              │                │            │            │             │
     │ callback (with code)          │            │            │             │
     ├─────────────▶│                │            │            │             │
     │              │ verify + issue JWT          │            │             │
     │              │ check Allowlist(@domain)    │            │             │
     │              │                │            │            │             │
     │              │ inject CF-Access-JWT-Assertion header    │             │
     │◀─────────────┤                │            │            │             │
     │              │                │            │            │             │
     │ GET /executive/overview (with JWT)         │            │             │
     ├─────────────▶│                │            │            │             │
     │              │ Pass (JWT valid)            │            │             │
     │              ├────────────────────────────▶            │             │
     │              │                │            │ parse JWT  │             │
     │              │                │            ├───────────▶│             │
     │              │                │            │            │ find email  │
     │              │                │            │            ├────────────▶│
     │              │                │            │            │◀────────────┤
     │              │                │            │            │ UPDATE last_login
     │              │                │            │            ├────────────▶│
     │              │                │            │◀───────────┤ role loaded │
     │              │                │            │ render     │             │
     │              │                │            │  /executive/overview     │
     │◀─────────────┴────────────────┴────────────┤            │             │
     │              │                │            │            │             │
```

### 7.1 신규 사용자 첫 로그인 처리

```typescript
// lib/auth.ts (svc-skill side)
async function handleFirstLogin(env: Env, email: string, jwtClaims: CFJWTClaims) {
  const existing = await env.DB.prepare('SELECT email FROM users WHERE email = ?').bind(email).first();
  if (!existing) {
    // 신규 사용자: env.DEFAULT_NEW_USER_ROLE 따라 insert
    // 기본값: 'engineer' (관대한 기본값, Admin이 역할 승격)
    const defaultRole = env.DEFAULT_NEW_USER_ROLE ?? 'engineer';
    await env.DB.prepare(`
      INSERT INTO users (email, primary_role, status, last_login, created_at, display_name)
      VALUES (?, ?, 'active', unixepoch(), unixepoch(), ?)
    `).bind(email, defaultRole, jwtClaims.name ?? email).run();
    await logAudit(env, {
      actorEmail: email,
      actorRole: defaultRole,
      action: 'user.created',
      metadata: { via: 'first-login', jwt_iss: jwtClaims.iss },
    });
  } else {
    await env.DB.prepare('UPDATE users SET last_login = unixepoch() WHERE email = ?').bind(email).run();
    await logAudit(env, { actorEmail: email, action: 'login' /* role fetched from existing */ });
  }
}
```

---

## 8. AXIS DS Migration Mapping

### 8.1 Tier 1: Tokens (F373)

| Token Category | shadcn 현재 | AXIS DS 교체 |
|----------------|-------------|--------------|
| Colors | `--color-*` CSS vars (theme.css) | `@axis-ds/tokens/colors.css` import |
| Spacing | Tailwind scale | `@axis-ds/tokens/spacing.css` |
| Typography | Inter + custom | `@axis-ds/tokens/typography.css` |
| Radius | `--radius-*` | `@axis-ds/tokens/radius.css` |

**Migration Step**:
1. `npm install @axis-ds/tokens`
2. `apps/app-web/src/styles/axis-ds-tokens.css`: `@import '@axis-ds/tokens/css'`
3. `apps/app-web/src/app.tsx`에서 `import './styles/axis-ds-tokens.css'` 추가
4. 기존 `theme.css` 커스텀 색상은 AXIS 토큰으로 역매핑 (또는 유지 + override)

### 8.2 Tier 2: React Components (F381)

| shadcn 컴포넌트 | AXIS DS 대체 | 교체 전략 |
|-----------------|--------------|-----------|
| `@/components/ui/button` | `@axis-ds/react/Button` | 래퍼 `components/axis-ds/Button.tsx` 생성, 기존 import 경로 alias |
| `@/components/ui/card` | `@axis-ds/react/Card` | 동상 |
| `@/components/ui/tabs` | `@axis-ds/react/Tabs` | 동상 |
| `@/components/ui/dialog` | `@axis-ds/react/Dialog` | 동상 |
| `@/components/ui/input` | `@axis-ds/react/Input` | 동상 |
| `@/components/ui/select` | `@axis-ds/react/Select` | 동상 |
| `@/components/ui/tooltip` | `@axis-ds/react/Tooltip` | 동상 |
| `@/components/ui/badge` | `@axis-ds/react/Badge` | 동상 |

**Interface Compatibility**: 교체 래퍼에서 shadcn props를 AXIS props로 변환. 불일치 시 fallback prop 구현.

### 8.3 Tier 3: 도메인 특화 컴포넌트 기여 (S222 Should, F383)

| 컴포넌트 | 재활용 가능성 | AXIS DS 레포 기여 전략 |
|----------|:-------------:|------------------------|
| `SpecSourceSplitView` | High (Foundry-X/Launch-X 공통) | Generic `SplitView` 추출 + `data-provenance` hook |
| `ProvenanceInspector` | Medium (Decode-X 특화) | Generic `Inspector` drawer + provenance adapter pattern |
| `StageReplayer` | High (모든 5-Stage 파이프라인) | Generic `PipelineReplayer` + stage injection |

---

## 9. Security Considerations

### 9.1 OAuth / IAM

- **CF Access JWT verification**: CF-Access-Aud 환경변수로 audience 검증 (svc-skill + app-web)
- **Google Allowlist**: Cloudflare Access rule로 `@ktds-axbd.com` 도메인 + 개별 이메일 제한
- **Default role**: `engineer` (P0 risk 최소화 — executive 데이터 접근은 역할 승격 후)
- **Role 승격**: Admin만 PATCH 가능, 모든 변경은 `audit_log` 기록

### 9.2 Provenance API

- **Authentication**: CF Access JWT 필수 (unauthenticated access 차단)
- **Audit logging**: `/provenance/resolve` 호출마다 audit_log 기록 (action='provenance.resolve')
- **Rate limiting**: KV 기반 per-user 60 req/min (기존 MCP 패턴 재활용)

### 9.3 DEMO_USERS 폐기 (F389)

- `apps/app-web/src/lib/demo-auth.ts` 완전 삭제
- localStorage `demoUser` key 자동 cleanup (마이그 스크립트)
- 기존 `?legacy=1` 분기에서도 CF Access JWT 필요 (Guest 제외)

### 9.4 Audit Log 보존 정책

- **Retention**: 5년 (기존 PII 감사 정책 준수, `infra/migrations/db-skill/0011_audit_log.sql` CHECK 제약 없이 cron 기반 cleanup)
- **Export**: Admin이 CSV export 가능 (`GET /internal/admin/audit-log?format=csv`)

---

## 10. Implementation Plan (F-item 순서)

### 10.1 S219 Sprint (선행 2건 + 7 F-item)

```
Day 0 (선행):
  ☐ AXIS DS npm view 실측 (RP-1)
  ☐ CF Access Free tier 50석 확인 (RP-2)
  ☐ CF Analytics beacon 활성화 (F390)

Day 1~2 (핵심):
  ☐ F371 → 0010_users.sql 작성 + 로컬 적용
  ☐ F370 → CF Access rule 설정 + JWT 파싱 lib/auth.ts
  ☐ F389 → DEMO_USERS lib 완전 삭제
  ☐ F373 → @axis-ds/tokens 설치 + CSS 주입

Day 3~4:
  ☐ F372 → welcome 페이지 + Google CTA
  ☐ F374 → Feature Flag skeleton + 듀얼 렌더
  ☐ F385 → §12 온보딩 본문 작성 (PRD or separate doc)
```

### 10.2 S220 Sprint (6 F-item + 병행 CF Analytics 수집)

```
Week 1:
  ☐ F375 → Executive Overview skeleton + 4 Group 요약
  ☐ F376 → Foundry-X 타임라인 (REQ-035 handoff 데이터 bind)
  ☐ F386 → Compliance Badge + 규제 준수 스토리

Week 2:
  ☐ F378 → Evidence 서브메뉴 (이관 3건 재배치)
  ☐ F377 → Archive 실행 (선행: CF Analytics 데이터 2주 수집 확인)
```

### 10.3 S221 Sprint (8 F-item)

```
Week 1 (백엔드 + Admin):
  ☐ F391 → GET /skills/:id/provenance/resolve 구현
  ☐ F380 → ProvenanceInspector drawer 컴포넌트
  ☐ F382 → Admin Users CRUD + Organization + Health + Usage
  ☐ F387 → audit_log 0011 마이그 + Admin Audit Log Viewer

Week 2 (UI 통합 + QA):
  ☐ F379 → SpecSourceSplitView + Fallback Banner
  ☐ F381 → AXIS DS Tier 2 8 컴포넌트 교체
  ☐ F388 → Section-only Fallback 실사용자 파일럿 (3명 인터뷰)
  ☐ F392 → Playwright E2E + smoke + regression 95% 통과
```

### 10.4 S222 Should (2 F-item)

```
  ☐ F383 → AXIS DS Tier 3 기여 PR (3종 컴포넌트 Generic 추출)
  ☐ F384 → Guest/Demo 모드
```

---

## 11. Testing Strategy

### 11.1 Unit (Vitest, F392)

- `lib/auth.ts`: JWT 파싱 + 만료/위변조 case
- `lib/feature-flag.ts`: legacy=1 토글 + default behavior
- `provenance/resolver.ts`: 3-way 데이터 소스 병합 + fallback state 결정 로직
- 각 shadcn → AXIS 래퍼 컴포넌트 props 호환성

### 11.2 Integration (Vitest + D1 mock)

- `/provenance/resolve`: skill 있음/없음, R2 있음/없음, spec-container 있음/없음 8 조합
- Admin Users CRUD: bootstrap user, role 승격, suspended 전환
- audit_log 기록: 정확한 actor_role, action 명시

### 11.3 E2E (Playwright, F392, F388)

- **로그인 플로우**: Guest → /welcome → Google → 역할별 진입점 리다이렉트
- **KPI-1 3분 시나리오**: `/executive/overview` 로드 → Foundry-X 타임라인 hover → HandoffDetail 확인까지
- **KPI-2 3클릭 시나리오**: `/engineer/workbench` → Skill 선택 → Provenance Inspector → section focus (10건 샘플 자동)
- **Archive 실행 검증**: broken link 없음, 라우트 제거 후 404 처리 정상
- **Feature Flag**: `?legacy=1` 진입 시 기존 5 페르소나 UI 렌더 + LegacyBanner 노출

### 11.4 실사용자 파일럿 (F388)

- 3명 엔지니어 대상 30분 세션 × 2회차
- Section-only Fallback 체감 만족도 5점 척도
- "pageRef 없음에도 업무 가능" Y/N + 불편 구체 피드백
- 결과를 AIF-REQ-036 review-history.md에 기록

---

## 12. Rollout/온보딩 전략 (F385 본문)

### 12.1 단계별 롤아웃

| Stage | 시점 | 대상 | 방법 |
|-------|------|------|------|
| Stage 1 — 내부 Admin 검증 | S219 완료 | Sinclair + PM 1명 | `?legacy=1` default, 신규는 명시 접근 |
| Stage 2 — 엔지니어 파일럿 | S220 중반 | Engineer 3명 (F388) | 신규 default, 이슈 수집 |
| Stage 3 — 본부장/Executive | S221 초 | 본부장 1인 | 시연 세션 30분 + FAQ 사전 배포 |
| Stage 4 — 전체 공개 | S221 완료 | 전 org | 공지 + 가이드 배포 + legacy flag 병행 |
| Stage 5 — Legacy 삭제 | S222 | 관리자 | 스모크 PASS 후 코드 제거 |

### 12.2 온보딩 자료

- **Engineer 가이드**: `docs/onboarding/engineer-workbench.md` (Split View 사용법, Provenance Fallback 해석)
- **Executive 가이드**: `docs/onboarding/executive-overview.md` (Foundry-X 타임라인 해석, Drill-down flow)
- **Admin 가이드**: `docs/onboarding/admin-operations.md` (Users CRUD, Role 승격, Audit Log 조회)
- **FAQ**: `docs/onboarding/faq.md` (OAuth 오류, Fallback 의미, Legacy 접근법)

### 12.3 피드백 채널

- GitHub Issues (`ui-redesign` label)
- Slack #decode-x-ux (전환 기간 전용 채널)
- Sprint별 회고에서 정량 집계

---

## 13. Open Questions

1. **env.DEFAULT_NEW_USER_ROLE 기본값**: `engineer` 제안 vs `guest` 제안? — Executive 데이터 접근 범위 결정
2. **Legacy 완전 삭제 시점**: S221 완료 vs S222 Should 대기? — 롤백 유연성 vs 코드 정리
3. **Audit Log UI 노출 범위**: Admin만 vs Executive도 조회 가능? — 투명성 vs 정보 부담
4. **Stage Replayer 포함 여부**: MVP S221 포함 vs S222 Should 분리? — 복잡도 판단
5. **KPI-1 평가자 객관성**: 동료 1명 → 2명 교차 평가로 강화? (R2 Gemini 지적)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-21 | 초안 — PRD v0.3 + Plan 기반. 13 섹션, 컴포넌트 계층 + 데이터 플로우 + D1 2테이블 + Provenance Resolve API + Fallback State Machine + AXIS DS 매핑 + OAuth 시퀀스 + Implementation Plan | Sinclair |
