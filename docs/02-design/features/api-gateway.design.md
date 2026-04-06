---
code: AIF-DSGN-021
title: Recon-X API Gateway 상세 설계
version: "1.0"
status: Draft
category: design
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references:
  - "[[AIF-PLAN-021]]"
---

# Recon-X API Gateway Design

> Plan: `docs/01-plan/features/api-gateway.plan.md`

## 1. 파일 목록 및 구현 순서

### 신규 파일 (8개)

| # | 파일 | 역할 | 의존성 |
|---|------|------|--------|
| 1 | `packages/api/package.json` | 패키지 의존성 (hono, jose) | - |
| 2 | `packages/api/wrangler.toml` | Worker 설정 + 11 service bindings | - |
| 3 | `packages/api/src/env.ts` | Env 타입 (bindings + secrets) | - |
| 4 | `packages/api/src/middleware/cors.ts` | CORS 미들웨어 | hono |
| 5 | `packages/api/src/middleware/auth.ts` | JWT 검증 미들웨어 | jose, env.ts |
| 6 | `packages/api/src/middleware/guard.ts` | /internal/* 차단 미들웨어 | hono |
| 7 | `packages/api/src/routes/health.ts` | 집계 헬스체크 | env.ts |
| 8 | `packages/api/src/index.ts` | Hono app + 미들웨어 체인 + 프록시 라우팅 | 전부 |

### 수정 파일 (0개)

기존 services/ 코드 변경 없음.

### 구현 순서

```
1. package.json + wrangler.toml (의존성 + 인프라)
2. env.ts (타입 기반)
3. cors.ts → guard.ts → auth.ts (미들웨어, 독립적)
4. health.ts (라우트)
5. index.ts (통합 — 모든 파일 import)
6. 테스트
```

## 2. 상세 설계

### 2.1 `packages/api/package.json`

```json
{
  "name": "@ai-foundry/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "jose": "^6.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250327.0"
  }
}
```

### 2.2 `packages/api/wrangler.toml`

```toml
name = "recon-x-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
SERVICE_NAME = "recon-x-api"
ENVIRONMENT = "production"

# 11 service bindings (svc-queue-router 제외 — 내부 전용)
[[services]]
binding = "SVC_INGESTION"
service = "svc-ingestion"

[[services]]
binding = "SVC_EXTRACTION"
service = "svc-extraction"

[[services]]
binding = "SVC_POLICY"
service = "svc-policy"

[[services]]
binding = "SVC_ONTOLOGY"
service = "svc-ontology"

[[services]]
binding = "SVC_SKILL"
service = "svc-skill"

[[services]]
binding = "SVC_LLM_ROUTER"
service = "svc-llm-router"

[[services]]
binding = "SVC_SECURITY"
service = "svc-security"

[[services]]
binding = "SVC_GOVERNANCE"
service = "svc-governance"

[[services]]
binding = "SVC_NOTIFICATION"
service = "svc-notification"

[[services]]
binding = "SVC_ANALYTICS"
service = "svc-analytics"

[[services]]
binding = "SVC_MCP_SERVER"
service = "svc-mcp-server"

[env.staging]
name = "recon-x-api-staging"
[env.staging.vars]
ENVIRONMENT = "staging"

[env.production]
name = "recon-x-api-production"
[env.production.vars]
ENVIRONMENT = "production"
```

> **Secrets** (wrangler secret put): `INTERNAL_API_SECRET`, `GATEWAY_JWT_SECRET`

### 2.3 `packages/api/src/env.ts`

```typescript
export interface Env {
  // Service Bindings
  SVC_INGESTION: Fetcher;
  SVC_EXTRACTION: Fetcher;
  SVC_POLICY: Fetcher;
  SVC_ONTOLOGY: Fetcher;
  SVC_SKILL: Fetcher;
  SVC_LLM_ROUTER: Fetcher;
  SVC_SECURITY: Fetcher;
  SVC_GOVERNANCE: Fetcher;
  SVC_NOTIFICATION: Fetcher;
  SVC_ANALYTICS: Fetcher;
  SVC_MCP_SERVER: Fetcher;

  // Secrets
  INTERNAL_API_SECRET: string;
  GATEWAY_JWT_SECRET: string;

  // Vars
  SERVICE_NAME: string;
  ENVIRONMENT: string;
}

/** Route prefix → service binding key 매핑 */
export const SERVICE_MAP: Record<string, keyof Env> = {
  ingestion: "SVC_INGESTION",
  extraction: "SVC_EXTRACTION",
  policy: "SVC_POLICY",
  ontology: "SVC_ONTOLOGY",
  skills: "SVC_SKILL",
  llm: "SVC_LLM_ROUTER",
  security: "SVC_SECURITY",
  governance: "SVC_GOVERNANCE",
  notification: "SVC_NOTIFICATION",
  analytics: "SVC_ANALYTICS",
  mcp: "SVC_MCP_SERVER",
} as const;
```

### 2.4 `packages/api/src/middleware/cors.ts`

```typescript
import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [
  "https://ai-foundry.minu.best",     // production
  "http://localhost:5173",              // local dev
  "http://localhost:4173",              // local preview
];

export const corsMiddleware = cors({
  origin: (origin) => ALLOWED_ORIGINS.includes(origin) ? origin : "",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Organization-Id"],
  exposeHeaders: ["X-Request-Id"],
  maxAge: 86400,
  credentials: true,
});
```

### 2.5 `packages/api/src/middleware/auth.ts`

```typescript
import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import type { Env } from "../env.js";

/** JWT payload에서 추출할 필드 */
interface JwtPayload {
  sub: string;          // userId
  role: string;         // RBAC role
  org: string;          // organizationId
}

/** 인증 없이 통과하는 경로 */
const PUBLIC_PATHS = ["/health", "/api/mcp"];

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const path = c.req.path;

  // Public 경로는 skip
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing Bearer token" } }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(c.env.GATEWAY_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const jwt = payload as unknown as JwtPayload;

    // downstream 서비스에 전달할 헤더를 context에 저장
    c.set("userId", jwt.sub);
    c.set("userRole", jwt.role);
    c.set("organizationId", jwt.org);

    return next();
  } catch {
    return c.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }, 401);
  }
}
```

### 2.6 `packages/api/src/middleware/guard.ts`

```typescript
import type { Context, Next } from "hono";

/** 외부에서 접근 불가한 경로 패턴 */
const BLOCKED_PREFIXES = ["/internal/", "/api/internal/"];

export async function guardMiddleware(c: Context, next: Next) {
  const path = c.req.path;

  if (BLOCKED_PREFIXES.some((prefix) => path.includes(prefix))) {
    return c.json(
      { success: false, error: { code: "FORBIDDEN", message: "Internal endpoint" } },
      403,
    );
  }

  return next();
}
```

### 2.7 `packages/api/src/routes/health.ts`

```typescript
import { Hono } from "hono";
import { SERVICE_MAP, type Env } from "../env.js";

const health = new Hono<{ Bindings: Env }>();

health.get("/health", async (c) => {
  const results: Record<string, { status: string; latencyMs: number }> = {};

  const checks = Object.entries(SERVICE_MAP).map(async ([name, bindingKey]) => {
    const fetcher = c.env[bindingKey] as Fetcher;
    const start = Date.now();
    try {
      const res = await fetcher.fetch(new Request("https://internal/health"));
      results[name] = { status: res.ok ? "healthy" : "unhealthy", latencyMs: Date.now() - start };
    } catch {
      results[name] = { status: "unreachable", latencyMs: Date.now() - start };
    }
  });

  await Promise.allSettled(checks);

  const allHealthy = Object.values(results).every((r) => r.status === "healthy");
  return c.json({
    status: allHealthy ? "healthy" : "degraded",
    services: results,
    timestamp: new Date().toISOString(),
  }, allHealthy ? 200 : 503);
});

export { health };
```

### 2.8 `packages/api/src/index.ts`

```typescript
import { Hono } from "hono";
import type { Env, SERVICE_MAP } from "./env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { authMiddleware } from "./middleware/auth.js";
import { guardMiddleware } from "./middleware/guard.js";
import { health } from "./routes/health.js";

const app = new Hono<{ Bindings: Env }>();

// --- Global Middleware ---
app.use("*", corsMiddleware);
app.use("*", guardMiddleware);
app.use("*", authMiddleware);

// --- Health (집계) ---
app.route("/", health);

// --- Service Proxy ---
// /api/:service/* → Service Binding으로 프록시
app.all("/api/:service/*", async (c) => {
  const serviceName = c.req.param("service");
  const serviceMap: Record<string, keyof Env> = {
    ingestion: "SVC_INGESTION",
    extraction: "SVC_EXTRACTION",
    policy: "SVC_POLICY",
    ontology: "SVC_ONTOLOGY",
    skills: "SVC_SKILL",
    llm: "SVC_LLM_ROUTER",
    security: "SVC_SECURITY",
    governance: "SVC_GOVERNANCE",
    notification: "SVC_NOTIFICATION",
    analytics: "SVC_ANALYTICS",
    mcp: "SVC_MCP_SERVER",
  };

  const bindingKey = serviceMap[serviceName];
  if (!bindingKey) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: `Unknown service: ${serviceName}` } }, 404);
  }

  const fetcher = c.env[bindingKey] as Fetcher;

  // downstream 경로: /api/ingestion/documents → /documents
  const downstreamPath = c.req.path.replace(`/api/${serviceName}`, "") || "/";
  const downstreamUrl = new URL(downstreamPath, "https://internal");
  downstreamUrl.search = new URL(c.req.url).search;

  // 원본 요청 복제 + 내부 헤더 주입
  const headers = new Headers(c.req.raw.headers);
  headers.set("X-Internal-Secret", c.env.INTERNAL_API_SECRET);

  // JWT에서 추출한 사용자 정보 주입
  const userId = c.get("userId");
  const userRole = c.get("userRole");
  const organizationId = c.get("organizationId");
  if (userId) headers.set("X-User-Id", userId);
  if (userRole) headers.set("X-User-Role", userRole);
  if (organizationId) headers.set("X-Organization-Id", organizationId);

  const proxyReq = new Request(downstreamUrl.toString(), {
    method: c.req.method,
    headers,
    body: c.req.method !== "GET" && c.req.method !== "HEAD" ? c.req.raw.body : undefined,
  });

  return fetcher.fetch(proxyReq);
});

// --- 404 Fallback ---
app.notFound((c) =>
  c.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
);

export default app;
```

## 3. 인증 흐름 상세

```
Client                    Gateway                     svc-*
  │                          │                           │
  │ GET /api/ingestion/docs  │                           │
  │ Authorization: Bearer JWT│                           │
  │─────────────────────────►│                           │
  │                          │                           │
  │                   [1] CORS check                     │
  │                   [2] Guard check (/internal/ 아님)  │
  │                   [3] JWT verify (jose, HS256)       │
  │                        ├─ 실패 → 401                 │
  │                        └─ 성공 → payload 추출        │
  │                          │                           │
  │                   [4] Proxy request 구성             │
  │                        ├─ path: /documents           │
  │                        ├─ X-Internal-Secret 주입     │
  │                        ├─ X-User-Id 주입             │
  │                        ├─ X-User-Role 주입           │
  │                        └─ X-Organization-Id 주입     │
  │                          │                           │
  │                          │  Service Binding fetch    │
  │                          │──────────────────────────►│
  │                          │                           │
  │                          │◄──────────────────────────│
  │                          │  Response (passthrough)   │
  │◄─────────────────────────│                           │
```

## 4. 테스트 계획

### 4.1 단위 테스트 (6개 파일)

| # | 테스트 파일 | 대상 | 주요 케이스 |
|---|------------|------|------------|
| 1 | `cors.test.ts` | corsMiddleware | allowed/blocked origin, preflight |
| 2 | `auth.test.ts` | authMiddleware | valid JWT, expired, missing, public path skip |
| 3 | `guard.test.ts` | guardMiddleware | /internal/* 차단, 정상 경로 통과 |
| 4 | `health.test.ts` | health route | 전체 healthy, partial degraded |
| 5 | `proxy.test.ts` | index.ts proxy | 라우팅 매핑, 헤더 주입, unknown service 404 |
| 6 | `env.test.ts` | SERVICE_MAP | 매핑 키 완전성 |

### 4.2 Mock 전략

- **Service Bindings**: `Fetcher` mock — `{ fetch: vi.fn() }` 패턴
- **JWT**: `jose.SignJWT`로 테스트용 토큰 생성, 실제 검증 흐름 테스트
- **Hono**: `app.request()` 메서드로 HTTP 요청 시뮬레이션

## 5. 배포 전략

| 단계 | 내용 |
|------|------|
| 1 | `pnpm install` (hono, jose 의존성) |
| 2 | `pnpm typecheck && pnpm test` |
| 3 | `wrangler deploy` (recon-x-api Worker 생성) |
| 4 | `wrangler secret put INTERNAL_API_SECRET`, `GATEWAY_JWT_SECRET` |
| 5 | app-web의 API URL → Gateway URL로 교체 (별도 Sprint) |

## 6. Gotchas

- **Service Binding은 default env Worker 참조**: production 배포 시 `wrangler deploy` (default) + `--env production` 둘 다 필요
- **jose Workers 호환**: `jose` v6+은 Web Crypto API만 사용 — Workers 네이티브 호환. Node.js 전용 API 없음
- **MCP 경로 특수 처리**: `/api/mcp/*`는 Streamable HTTP (SSE) 포함 — `Accept` 헤더를 그대로 전달해야 함
- **body 스트리밍**: `c.req.raw.body`는 ReadableStream — 한 번만 소비 가능. 프록시 시 clone 불필요 (직접 전달)
- **CORS preflight**: `OPTIONS` 요청은 Hono의 `cors()` 미들웨어가 자동 처리 (auth 이전에 반환)
