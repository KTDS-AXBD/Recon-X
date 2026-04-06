---
code: AIF-PLAN-021
title: Recon-X API Gateway (packages/api)
version: "1.0"
status: Draft
category: plan
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Recon-X API Gateway Plan

## 1. 배경 및 목적

### 현재 구조
- 12개 Cloudflare Workers (services/svc-*) 각각이 독립 엔드포인트
- 클라이언트(app-web)가 각 서비스를 직접 호출
- 인증: 각 서비스가 `X-Internal-Secret` 헤더로 개별 검증
- CORS: 각 서비스가 개별 처리 (또는 미처리)

### 문제점
1. **클라이언트가 12개 서비스 URL을 모두 알아야 함** — 서비스 추가/변경 시 프론트엔드 수정 필요
2. **인증 로직 중복** — 각 서비스마다 `verifyInternalSecret()` 반복
3. **CORS 설정 파편화** — 서비스마다 별도 처리
4. **외부 노출 제어 불가** — 내부 전용 엔드포인트(`/internal/*`)도 직접 접근 가능

### 목표
`packages/api`에 단일 API Gateway Worker를 신규 구축하여:
- 클라이언트는 **1개 URL**만 알면 됨
- JWT 기반 인증을 Gateway에서 처리
- CORS 중앙 관리
- 라우팅 + Rate Limit + 내부 엔드포인트 차단

## 2. 범위

### In Scope
| # | 기능 | 설명 |
|---|------|------|
| 1 | **통합 라우팅** | `/api/ingestion/*` → svc-ingestion, `/api/extraction/*` → svc-extraction 등 |
| 2 | **JWT 인증** | Gateway에서 JWT 검증, 유효한 경우에만 downstream 전달 |
| 3 | **CORS 중앙 관리** | Allowed origins, methods, headers를 Gateway 한 곳에서 설정 |
| 4 | **Health 집계** | `GET /health` → 전 서비스 헬스 상태 집계 |
| 5 | **내부 엔드포인트 차단** | `/internal/*` 패턴은 Gateway에서 reject |
| 6 | **Hono 프레임워크** | 기존 수동 라우팅 대신 Hono로 구조화 |

### Out of Scope (향후)
- Rate Limiting (Cloudflare 내장 또는 KV 기반 — 별도 Sprint)
- 하위 서비스 Hono 전환 (기존 services/ 구조 유지)
- WebSocket/SSE 프록시
- API 버저닝 (`/v1/`, `/v2/`)

## 3. 기술 스택

| 항목 | 선택 | 근거 |
|------|------|------|
| Runtime | Cloudflare Workers | 기존 인프라 일관성 |
| Framework | **Hono** | Workers 최적화, 미들웨어 체인, TypeScript 네이티브 |
| Auth | **jose** (JWT) | Workers 호환 JWT 라이브러리, 가벼움 |
| Downstream 호출 | **Service Bindings** | Workers 간 zero-latency 내부 호출 |
| 테스트 | Vitest | 기존 패턴 유지 |

## 4. 아키텍처

```
Client (app-web)
    │
    ▼
┌─────────────────────────────────────┐
│  packages/api  (API Gateway Worker) │
│                                     │
│  ┌─────────┐  ┌──────┐  ┌───────┐  │
│  │  CORS   │→ │ JWT  │→ │Router │  │
│  │Middleware│  │Auth  │  │       │  │
│  └─────────┘  └──────┘  └───┬───┘  │
│                              │      │
│  /api/ingestion/* ──────────►│      │
│  /api/extraction/* ─────────►│      │
│  /api/policy/* ─────────────►│      │
│  /api/skills/* ─────────────►│      │
│  /api/llm/* ────────────────►│      │
│  /api/governance/* ─────────►│      │
│  /health ───────────────────►│      │
│  /internal/* ────── REJECT   │      │
└──────────────────────────────┼──────┘
                               │
              Service Bindings │
                               ▼
    ┌──────────┬──────────┬──────────┐
    │svc-ingest│svc-extrac│svc-policy│ ...
    └──────────┴──────────┴──────────┘
```

## 5. 라우팅 매핑

| Gateway 경로 | Downstream Service | 비고 |
|--------------|-------------------|------|
| `/api/ingestion/*` | svc-ingestion | 문서 업로드, 조회 |
| `/api/extraction/*` | svc-extraction | 구조 추출, Fact Check |
| `/api/policy/*` | svc-policy | 정책 추론, HITL |
| `/api/ontology/*` | svc-ontology | 온톨로지 그래프 |
| `/api/skills/*` | svc-skill | 스킬 패키지 |
| `/api/llm/*` | svc-llm-router | LLM 호출 |
| `/api/security/*` | svc-security | RBAC, 감사 |
| `/api/governance/*` | svc-governance | 프롬프트 레지스트리, AI Chat |
| `/api/notification/*` | svc-notification | 알림 |
| `/api/analytics/*` | svc-analytics | KPI, 대시보드 |
| `/api/mcp/*` | svc-mcp-server | MCP Streamable HTTP |
| `/health` | (집계) | 전 서비스 상태 |

## 6. 인증 흐름

```
1. Client → Gateway: Authorization: Bearer <JWT>
2. Gateway: JWT 검증 (jose, HS256, GATEWAY_JWT_SECRET)
3. 유효 → downstream 호출 시 X-Internal-Secret + X-User-Id + X-Organization-Id 헤더 주입
4. 무효/만료 → 401 Unauthorized 반환
5. /health는 인증 없이 통과 (public)
```

> **JWT 발급은 이 Sprint 범위 외** — 기존 svc-security의 데모 로그인 또는 별도 auth 서비스에서 발급. Gateway는 **검증만** 담당.

## 7. 파일 구조 (예상)

```
packages/api/
├── src/
│   ├── index.ts              # Hono app + export default
│   ├── env.ts                # Env 타입 (service bindings)
│   ├── middleware/
│   │   ├── cors.ts           # CORS 미들웨어
│   │   ├── auth.ts           # JWT 검증 미들웨어
│   │   └── guard.ts          # /internal/* 차단
│   ├── routes/
│   │   ├── proxy.ts          # 범용 서비스 프록시 라우트
│   │   └── health.ts         # 집계 헬스체크
│   └── lib/
│       └── proxy.ts          # Service Binding 프록시 유틸
├── wrangler.toml             # Worker 설정 + service bindings
├── package.json
├── tsconfig.json             # (기존)
└── vitest.config.ts          # (기존)
```

## 8. 구현 세션 계획

| 세션 | 작업 | 산출물 |
|------|------|--------|
| S1 | Hono 스캐폴드 + CORS + Guard | index.ts, middleware/*, wrangler.toml |
| S2 | JWT Auth + 프록시 라우팅 | auth.ts, routes/proxy.ts, lib/proxy.ts |
| S3 | 테스트 + 로컬 검증 | tests, typecheck, lint |
| S4 | 배포 + app-web 연동 | CI/CD, 프론트엔드 API URL 교체 |

## 9. 성공 기준

- [ ] `pnpm typecheck && pnpm test` 통과
- [ ] Gateway 1개 URL로 전 서비스 접근 가능
- [ ] JWT 무효 시 401 반환
- [ ] `/internal/*` 요청 차단
- [ ] 기존 services/ 코드 변경 없음

## 10. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Service Binding 수 제한 | Workers당 최대 binding 수 확인 필요 | Cloudflare 문서 확인 (현재 ~30개까지 가능) |
| JWT 라이브러리 Workers 호환 | jose가 Web Crypto API만 사용하는지 | 사전 검증 (jose는 Workers 공식 지원) |
| Latency 추가 | Gateway hop 1개 추가 | Service Binding = zero-latency (같은 isolate) |
| 기존 프론트엔드 호환 | app-web의 API URL 일괄 교체 필요 | S4에서 처리 |
