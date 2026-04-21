---
code: AIF-ANLY-sprint-218-f355
title: Sprint 218 F355 (TD-25) Production E2E 갭 명세 + 재구조 권고
version: 1.0
status: Active
category: ANALYSIS
system-version: 0.7.0
created: 2026-04-21
updated: 2026-04-21
author: Sinclair Seo
related:
  - SPEC.md §6 Phase 8 (Sprint 218)
  - SPEC.md §8 Tech Debt (TD-25, TD-29~31)
  - docs/req-interview/decode-x-v1.3-phase-3/prd-final.md
  - docs/03-analysis/features/phase-2-pipeline.analysis.md
  - services/svc-skill/src/routes/handoff.ts
  - services/svc-skill/wrangler.toml
  - infra/migrations/db-skill/0007_handoff_jobs.sql
---

# Sprint 218 F355 (TD-25) Production E2E 갭 명세 + 재구조 권고

> **세션 218, 2026-04-21** — F355 "Foundry-X Production E2E 증거 수집" 사전 조사 결과
>
> Phase 2 자가보고: Sprint 215 ✅ MERGED, "autopilot 자체 merge", "Handoff 수용 200 응답 1/1, Working Prototype 생성 PASS"
>
> Phase 2 종합 분석: TD-25 "Foundry-X Production E2E 검증 증거 부재", **P1**, 해결안 "실 POST 호출 + handoff_jobs row 생성 확인 + 로그 캡처 (2h)"
>
> Phase 3 PRD M-2 (True Must): "TD-25 Foundry-X Production E2E 증거 수집"
>
> **본 분석**: 실제로는 "증거 부재"가 아니라 **"실행 자체가 불가능한 6중 구조 갭"**이 본질. F355를 분할 + Phase 3 우선순위 재정의 권고.

---

## 1. Executive Summary

### 1.1 핵심 판정

| 항목 | 자가보고 (Sprint 215) | 독립 검증 (세션 218) |
|------|---------------------|---------------------|
| Decode-X handoff 코드 구현 | ✅ 완료 | ✅ 확인 (`handoff.ts:183-269` 완성) |
| handoff_jobs migration 작성 | ✅ 완료 | ✅ 확인 (`0007_handoff_jobs.sql`) |
| handoff_jobs Production 적용 | (암묵) ✅ | **❌ 미적용** |
| Foundry-X 호출 URL 정확성 | (암묵) ✅ | **❌ worker 이름 오류** (`-production` → `-api`) |
| Foundry-X 호출 path 정확성 | (암묵) ✅ | **❌ `/api/` prefix 누락** |
| FOUNDRY_X_SECRET production 설정 | (암묵) ✅ | **❌ 미설정** |
| 인증 방식 호환성 | (암묵) ✅ | **❌ Internal-Secret vs JWT+tenant 미스매치** |
| **lpon-* skills production 존재** | (암묵) ✅ | **❌ 0건** (spec-container ≠ skills D1) |

→ **6중 갭** 모두 발견. Sprint 215 "autopilot 자체 merge KPI 200 1/1"은 **로컬 mock 또는 픽스처 결과**일 수밖에 없음.

### 1.2 결론

- F355 "5분 수정"은 갭 #1~#4 정도만 해결 (도구 정리). #5~#6은 1~2 Sprint 분량 신규 작업.
- F355는 **MVP 임계값 재정의 또는 분할** 필요.
- 본 갭 발견 자체가 **TD-25 "증거 부재"의 결정적 보강 증거**. 본부장 리뷰에 "Sprint 215 = 어댑터 코드 완료, Production 흐름 6갭 ⚠️, Phase 3 우선순위 재정의 ✅" 형태로 가져갈 수 있음.

---

## 2. 6중 갭 상세

### 2.1 갭 #1 — Foundry-X Worker 이름 오류

**위치**: `services/svc-skill/wrangler.toml`

| Decode-X 설정 | Foundry-X 실제 |
|---|---|
| `[env.production]` `FOUNDRY_X_URL = "https://foundry-x-production.ktds-axbd.workers.dev"` | `name = "foundry-x-api"` (production 기본 env) → `https://foundry-x-api.ktds-axbd.workers.dev` |
| `[env.staging]` `FOUNDRY_X_URL = "https://foundry-x-staging.ktds-axbd.workers.dev"` | `[env.staging]` `name = "foundry-x-api-staging"` → `https://foundry-x-api-staging.ktds-axbd.workers.dev` |

**검증 명령**:
```bash
curl -o /dev/null -w "%{http_code}" https://foundry-x-production.ktds-axbd.workers.dev/health
# → 404 (Cloudflare error code 1042: Worker not found)

curl -o /dev/null -w "%{http_code}" https://foundry-x-api.ktds-axbd.workers.dev/health
# → 404 (이건 worker는 있지만 /health route 없음)
```

**원인**: Sprint 215가 Foundry-X repo 실제 worker name을 확인하지 않고 명명 규칙 추측.

**해결안 (5분)**: `wrangler.toml` 4곳 수정 (default vars + `[env.staging]` + `[env.production]`).

### 2.2 갭 #2 — Endpoint Path `/api/` Prefix 누락

**위치**: `services/svc-skill/src/routes/handoff.ts:236`

```ts
// 현재 (잘못됨)
const foundryRes = await fetch(`${env.FOUNDRY_X_URL}/prototype-jobs`, ...);

// 정정 필요
const foundryRes = await fetch(`${env.FOUNDRY_X_URL}/api/prototype-jobs`, ...);
```

**Foundry-X 측 확인**: `packages/api/src/app.ts:384` — `app.route("/api", prototypeJobsRoute);`

**원인**: Sprint 215 Decode-X 측 가정 — F353 endpoint가 root path. 실제는 `/api/*` 보호 영역.

**해결안 (5분)**: `handoff.ts` 1줄 수정.

### 2.3 갭 #3 — `FOUNDRY_X_SECRET` Production Secret 미설정

**위치**: `services/svc-skill/wrangler.toml:53` (주석 처리됨), Production secret list

```bash
$ wrangler secret list --env production
[
  { "name": "INTERNAL_API_SECRET", "type": "secret_text" },
  { "name": "OPENROUTER_API_KEY", "type": "secret_text" }
]
# FOUNDRY_X_SECRET 없음
```

**handoff.ts:240** 사용:
```ts
"X-Internal-Secret": env.FOUNDRY_X_SECRET,
```

→ 현재 호출하면 `undefined` 헤더. Foundry-X도 X-Internal-Secret 인증을 안 받지만, 받더라도 빈 값.

**원인**: Sprint 215 코드는 secret을 참조하지만 production secret 등록 누락.

**해결안 (5분)**: `printf 'value' | wrangler secret put FOUNDRY_X_SECRET --env production`. 단, 갭 #5 인증 모델 변경 후에 의미 있는 값 결정 필요.

### 2.4 갭 #4 — `0007_handoff_jobs.sql` Production 미적용

**위치**: Production D1 `db-skill`

```bash
$ wrangler d1 execute db-skill --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('skills','handoff_jobs')"
# → ['skills'] (handoff_jobs 없음)
```

**파일**: `infra/migrations/db-skill/0007_handoff_jobs.sql` (작성 완료, production 적용 안 됨)

**원인**: Sprint 215 CI/CD가 자동 적용 안 했거나, 수동 apply 누락.

**handoff.ts:229-233** INSERT 쿼리:
```ts
await env.DB_SKILL.prepare(
  `INSERT INTO handoff_jobs (id, org_id, skill_id, service_id, status, gate_pass, ai_ready_overall, prd_title, contract_version)
   VALUES (?, ?, ?, ?, 'pending', 1, ?, ?, 'FX-SPEC-003/1.0')`,
).bind(...).run();
```

→ 현재 호출하면 `no such table: handoff_jobs` SQL 에러.

**해결안 (5분)**:
```bash
wrangler d1 execute db-skill --remote --file infra/migrations/db-skill/0007_handoff_jobs.sql
```

### 2.5 갭 #5 — 인증 모델 미스매치 (Decode-X vs Foundry-X)

**Decode-X 의도** (`handoff.ts:236-243`):
```ts
const foundryRes = await fetch(`${env.FOUNDRY_X_URL}/prototype-jobs`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Internal-Secret": env.FOUNDRY_X_SECRET,
  },
  body: JSON.stringify(payload),
});
```

→ **Service-to-service inter-internal-secret** 패턴 (Decode-X 내부 SVC 호출과 동일)

**Foundry-X 실제** (`packages/api/src/app.ts:222`, `packages/api/src/core/harness/routes/prototype-jobs.ts:15`):
```ts
app.use("/api/*", authMiddleware);   // JWT Bearer 필수
app.use("/api/*", tenantGuard);      // orgId를 JWT claims에서 추출

prototypeJobsRoute.post("/prototype-jobs", async (c) => {
  const orgId = c.get("orgId");      // tenantGuard가 set
  // payload는 { prdContent, prdTitle }만 받음 — orgId는 JWT에서
  ...
});
```

→ **User JWT + tenant** 패턴 (user-facing API와 동일)

**결과**: 인증 헤더가 X-Internal-Secret이라도 authMiddleware가 거부 (401), 통과해도 `c.get("orgId")` undefined로 500.

**원인**: Sprint 215 양쪽이 다른 가정 (Decode-X = inter-service, Foundry-X = user-facing). FX-SPEC-003 contract document에 인증 방식 명세 부재 또는 모호.

**해결안 (2~3h, Cross-repo)**:
- **옵션 A**: Foundry-X에 `/api/internal/prototype-jobs` 신설 (X-Internal-Secret 미들웨어 + 명시적 orgId 파라미터). **권장** — user API 보안 유지 + service-to-service 명확.
- **옵션 B**: Decode-X가 service account JWT 발급/사용. 토큰 관리 부담.
- **옵션 C**: Foundry-X authMiddleware에 X-Internal-Secret 우회 분기. 보안 표면 증가.

### 2.6 갭 #6 — LPON spec-container → Production skills D1 Packaging Pipeline 부재 (결정타)

**Production skills 분포**:
```
pension              3,070
giftvoucher           894
retirement-pension     10
전자상품권              1
lpon-budget            0  ← Tier-A
lpon-charge            0  ← Tier-A
lpon-gift              0  ← Tier-A
lpon-payment           0  ← Tier-A
lpon-purchase          0  ← Tier-A
lpon-refund            0  ← Tier-A
lpon-settlement        0  ← Tier-A
```

**spec-container vs skills 테이블**:
- Phase 2 산출: `.decode-x/spec-containers/lpon-{budget,charge,...}/` 디렉토리 (rules/runbooks/tests/contracts + provenance.yaml)
- handoff/submit이 SELECT하는 source: `skills` D1 테이블 (skill_id, organization_id, domain, r2_key, ...) + R2 SkillPackage JSON

→ **두 산출물 사이에 변환 파이프라인 없음**. spec-container는 디렉토리 산출물일 뿐, SkillPackage Zod schema에 맞지 않음.

**결과**: handoff.ts L77-83
```ts
const skillRow = await env.DB_SKILL.prepare(
  "SELECT skill_id, organization_id, domain, r2_key, status, created_at, document_ids FROM skills WHERE skill_id = ? AND organization_id = ?",
).bind(skillId, orgId).first<SkillRow>();

if (!skillRow) {
  return notFound("skill", skillId);
}
```

→ **404 NotFound** 반환 (인증 통과 가정 시).

**Sprint 215 자가보고 "Handoff 수용 200 응답 1/1, Working Prototype 생성 PASS"의 실체**:
- 로컬 fixture/mock 테스트 결과
- 또는 `pension`/`giftvoucher` domain 기존 skill을 사용한 단발 검증
- **Tier-A 6서비스 lpon-* 도메인 실 데이터 흐름 0%**

**원인**: Phase 2 Sprint 211~216이 spec-container 형식을 새로 도입했으나, 이를 Production 운영 D1 skills 테이블로 이관하는 packaging step을 별도 작업으로 인식 안 함.

**해결안 (1~2 Sprint)**:
신규 endpoint/script `POST /skills/from-spec-container`:
1. spec-container 디렉토리 읽기 (provenance.yaml + rules + runbooks + tests + contracts)
2. SkillPackage Zod schema로 변환 (policies = BL-* + ES-* 매핑)
3. R2에 .skill.json 업로드
4. skills D1 INSERT
5. 7서비스 일괄 packaging 스크립트

---

## 3. F355 분할 + 신규 F-item 등록 권고

### 3.1 현재 F355 → 3개로 분할

| 신규 ID | 제목 | 분량 | Sprint |
|---------|------|------|--------|
| **F355a** | Decode-X handoff Production 도구 정리 (URL+path+secret+migration) | 30min | Sprint 218 (잔여) |
| **F355b** | Foundry-X internal endpoint 신설 (`/api/internal/prototype-jobs`) — 인증 통합 | 2~3h, Cross-repo PR | Sprint 219 (신규) |
| **F362** | spec-container → skills D1 packaging pipeline 신설 | 1~2 Sprint | Sprint 219~220 |

### 3.2 MVP 임계값 재정의

**기존 PRD §5.2** (prd-final.md L201-205):
> [ ] M-2 TD-25 완결: Foundry-X Production handoff_jobs 테이블에 **Tier-A 6서비스 각각 1건 이상** row 존재 + 로그/스크린샷 증빙
>
> 이 2개가 미완이면 Phase 3 실패 선언.

**문제**: Tier-A 6서비스 row 존재가 갭 #6(packaging 부재)으로 본질적 불가. MVP 임계값이 Sprint 218 안에 충족 불가능.

**권고 재정의**:
- **M-2a** (Sprint 218 MVP): 6중 갭 명세 + Decode-X 도구 정리 + 본 보고서로 Sprint 215 자가보고 보강. **달성 가능 ✅**
- **M-2b** (Sprint 219+ Should): Foundry-X internal endpoint + Decode-X 인증 정렬 + 1서비스 실 호출 200 응답
- **M-2c** (Sprint 219~220 Should): packaging pipeline 신설 + Tier-A 6서비스 packaging + 6/6 handoff_jobs row 생성

→ Phase 3 True Must는 **M-2a로 축소**. M-2b/c는 Should Have 격상.

### 3.3 신규 TD 등록 권고

| ID | 위치 | 내용 | 영향 | 등록일 |
|----|------|------|------|--------|
| TD-29 | `services/svc-skill/wrangler.toml` + `handoff.ts` + production secrets/migration | **Sprint 215 Production 도구 정리 4건 미완** — 갭 #1~#4. F355a로 흡수. P1 | Production E2E 호출 자체 불가 | 2026-04-21 |
| TD-30 | Decode-X handoff.ts 인증 헤더 ↔ Foundry-X authMiddleware 미스매치 | **인증 모델 갭** — 갭 #5. F355b로 분리. Cross-repo. P1 | 인증 정렬 없이 호출 401/500 | 2026-04-21 |
| TD-31 | spec-container → skills D1 packaging pipeline 부재 | **결정타 데이터 흐름 갭** — 갭 #6. F362로 신규 등록. Sprint 219~220 분량. **P0** | Tier-A handoff 데이터 0건. F354 DIVERGENCE 마커도 결국 production 데이터 없이는 영속 불가 | 2026-04-21 |

### 3.4 Sprint 218 재구조

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| F354 | True Must | **✅ 완료** (M-1, 5건 DIVERGENCE 마커 발행) |
| F355 | True Must (3h 추정) | **분할 → F355a/F355b** |
| F355a | (없음) | **Sprint 218 MVP 신규** (도구 정리 + 본 보고서로 증거 확보, 30min) |
| F355b | (없음) | **Sprint 219로 이관** (Foundry-X internal endpoint, 2~3h Cross-repo) |
| F360 | Should | **유지** (Sprint 218 잔여 시간) |
| F362 | (없음) | **Sprint 219~220 신규** (packaging pipeline, 1~2 Sprint) |

---

## 4. 본부장 리뷰 활용 가이드

### 4.1 메시지 구조

> **"Sprint 215는 어댑터 코드를 완성했지만, Production 데이터 흐름은 6중 갭으로 한 번도 돌지 않았습니다. Phase 3 첫 Sprint에서 이를 정밀 진단했고, 이제 Phase 3 우선순위를 재정의하여 진짜 운영화로 진입합니다."**

### 4.2 KPI 재해석

| 지표 (PRD §5.1) | Sprint 218 결과 |
|------|------|
| AI-Ready 자동 채점 자상 점수 | Sprint 219 S-1 진행 (변동 없음) |
| Foundry-X Production E2E 실사례 수 | **현재 0/6, 본 갭 명세로 정확한 재정의 + Sprint 219~220 로드맵 확보** |
| DIVERGENCE 공식 마커 발행 수 | **5건 발행 ✅** (KPI ≥ 3 초과 달성, F354 완결) |

### 4.3 정량 자료

- F354 DIVERGENCE 마커 5건 (HIGH 1 + MEDIUM 3 + LOW 1) — `lpon-refund/provenance.yaml`
- F355 갭 명세 6건 (본 문서)
- TD 신규 3건 (TD-29/30/31)
- F-item 신규 3건 (F355a/F355b/F362)
- 본 분석에 투입된 검증 명령 8회 (curl health × 4, wrangler d1 query × 3, wrangler secret list × 1)

---

## 5. Phase 3 영향 분석

### 5.1 PRD §11 착수 정당화 보강

PRD §11.3에서 "3사 Conditional 수렴 = 1인 체제 + TD-15 파서 고정"을 구조적 원인으로 들었다. 본 분석은 **3번째 구조적 원인** 추가:

- **자가보고 vs 실 Production 격차**: Phase 2 Sprint 215 자가보고 100% Match에도 불구하고 6중 갭. 정량 검증(curl + D1 query) 없이 코드 머지만으로는 운영 가능성 입증 불가.

→ Phase 3 KPI "AI-Ready 자상 점수"의 가치 재확인: 자가보고 의존 → 자동 검증 의존 전환의 필요성.

### 5.2 Phase 4 이후 함의

- Tier-A 외 도메인 확장(통신/금융/헬스케어) 시 packaging pipeline(F362) 선행 필수. 그렇지 않으면 spec-container만 늘어나고 운영 데이터 0건 반복.
- Cross-repo 인증 모델은 모든 Decode-X ↔ Foundry-X 통합점에 동일 적용 필요. F355b 결정이 향후 모든 inter-service 패턴 기준.

---

## 6. 후속 액션

| # | 액션 | 담당 | 시점 |
|---|------|------|------|
| 1 | SPEC.md §6 Phase 8 갱신 — F355 분할(F355a/F355b/F362) | Sinclair | **본 세션** |
| 2 | SPEC.md §8 Tech Debt — TD-29/30/31 등록 | Sinclair | **본 세션** |
| 3 | PRD §5.2 MVP 임계값 재해석 footnote 추가 | Sinclair | 본 세션 또는 Sprint 218 종료 시 |
| 4 | F355a 도구 정리 (30min) | Sinclair | Sprint 218 잔여 시간 |
| 5 | F355b 진입 (Cross-repo PR) | Sinclair | Sprint 219 |
| 6 | F362 진입 (packaging pipeline) | Sinclair | Sprint 219~220 |

---

*본 문서는 세션 218에서 F355 사전 조사 중 발견된 6중 구조 갭을 명세하고, F355 분할 + Phase 3 우선순위 재정의 권고를 정리한 분석 보고서다. F354 DIVERGENCE 마커 발행과 함께 Sprint 218의 두 번째 산출물이며, 본부장 리뷰 자료로 활용 가능하다.*
