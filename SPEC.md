# SPEC.md — res-ai-foundry

> Single Source of Truth (SSOT) for implementation status, architecture decisions, and execution plan.
> Product/requirement authority: `docs/AI_Foundry_PRD_TDS_v0.6.docx`

---

## 1) Project Summary

- **Project**: RES AI Foundry
- **Repo**: `AX-BD-Team/res-ai-foundry`
- **Goal**: SI 산출물에서 암묵지를 추출해 재사용 가능한 Skill 자산으로 패키징
- **Domain Pilot**: 퇴직연금
- **Current Phase**: Pre-development (초기 스캐폴딩 완료)

---

## 2) Scope (v0)

### In Scope
- PRD 기반 아키텍처 구체화
- 모노레포 초기 구조 설계
- Stage 1~2 우선 구현 준비
- 보안/거버넌스/평가 모델의 최소 실행 골격

### Out of Scope (초기)
- 프로덕션 데이터 실투입
- 전 기능 동시 구현
- 고도화 대시보드/고급 자동화

---

## 3) Architecture Baseline

- 6-Layer System + 5-Stage Pipeline + 10 SVC(Workers)
- Infra: Cloudflare Workers/Queues/DO/D1/R2/KV + AI Gateway + Neo4j Aura
- LLM Tiering: Opus / Sonnet-Haiku / Workers AI

참고 문서: `CLAUDE.md`, `docs/AI_Foundry_PRD_TDS_v0.6.docx`

---

## 4) Engineering Principles

1. **Spec-Driven Development (SDD) 우선**: 구현 전 SPEC 업데이트
2. **작게 구현, 빠르게 검증**: 작은 단위 commit + 즉시 검증
3. **보안/감사 선반영**: 마스킹, 감사로그, 권한 모델을 후순위로 미루지 않음
4. **재현성**: 로컬/WSL/Windows 환경에서 동일 절차 문서화
5. **변경 이력 분리**: SPEC은 상태/계획, 세션 로그는 `docs/CHANGELOG.md`

---

## 5) Current Status

- **Last Updated**: 2026-02-26
- **Repo Bootstrap**: ✅
- **PRD Seed Document**: ✅ (`docs/AI_Foundry_PRD_TDS_v0.6.docx`)
- **.claude Skills/Agents Migration**: ✅
- **Monorepo Scaffold**: ✅ (Bun workspaces + Turborepo, 118 files)
- **Shared Packages**: ✅ `@ai-foundry/types`, `@ai-foundry/utils`
- **svc-llm-router (SVC-06)**: ✅ 전체 구현 (tier routing, AI Gateway, streaming, cost log)
- **svc-security (SVC-07)**: ✅ 전체 구현 (RBAC, audit log)
- **svc-ingestion (SVC-01)**: ✅ 전체 구현 (upload → R2 + D1 + Queue)
- **Skeleton Services**: ✅ SVC-02~05, 08~10 (svc-policy는 HitlSession DO stub 포함)
- **app-web**: ✅ React + Vite SPA scaffold, 13 페이지 stub
- **D1 Migrations**: ✅ 10개 DB 초기 SQL 작성 완료
- **CI/CD Workflows**: ✅ GitHub Actions (CI + 4개 deploy workflow)
- **typecheck**: ✅ 13개 패키지 전체 통과
- **Cloudflare 인프라 프로비저닝**: ❌ 미완료 (D1/R2/Queue/KV ID 미설정)
- **Wrangler Secrets**: ❌ 미설정 (INTERNAL_API_SECRET 등)
- **Test Coverage**: 0%

---

## 6) Execution Plan

### ✅ Phase A — Foundation Setup (완료)
- [x] monorepo 디렉토리 구조 (Bun workspaces + Turborepo)
- [x] 공통 타입/유틸 패키지 (@ai-foundry/types, @ai-foundry/utils)
- [x] tsconfig.base.json (strict TypeScript)
- [x] GitHub Actions CI/CD
- [x] D1 마이그레이션 스키마 10개

### 🔜 Phase B — Infra Provisioning (다음 우선순위)
> `infra/scripts/` 스크립트를 실행하고 wrangler.toml에 ID를 기입하는 작업

- [ ] `create-d1-dbs.sh` 실행 → 각 wrangler.toml의 `database_id` 업데이트
- [ ] `create-r2-buckets.sh` 실행
- [ ] `create-queues.sh` 실행
- [ ] `create-kv-namespaces.sh` 실행
- [ ] D1 마이그레이션 적용 (`wrangler d1 execute` × 10)
- [ ] Wrangler secrets 설정 (서비스별 `INTERNAL_API_SECRET`, `ANTHROPIC_API_KEY`, etc.)

### 🔜 Phase C — Pipeline Stage 1 Full Impl (E-01~E-03)
> svc-ingestion 고도화: 실제 파싱 파이프라인 연결

- [ ] **E-01** — 마스킹 미들웨어: PII 토크나이징 → svc-security 연동
- [ ] **E-02** — Stage 1 완성: Unstructured.io 연동, 파일 분류 로직
- [ ] **E-03** — Stage 2 완성: svc-extraction — Claude Sonnet/Haiku로 구조 추출

### 🔜 Phase D — Governance Baseline (E-04~E-05)
- [ ] **E-04** — Prompt Registry: svc-governance에 버전 관리/롤아웃 구현
- [ ] **E-05** — RBAC 적용: 모든 서비스에서 svc-security 통한 권한 검증

### 🔜 Phase E — Policy Inference + HITL (E-06~E-08, Phase 2)
- [ ] **E-06** — Stage 3: svc-policy 전체 구현 (Claude Opus 연동)
- [ ] **E-07** — HitlSession DO: 실제 리뷰 워크플로우 구현
- [ ] **E-08** — Review UI: app-web Persona B 화면 구현

### 🔜 Phase F — Ontology + Skill Packaging (Phase 3)
- [ ] Stage 4: svc-ontology — Neo4j Aura + SKOS/JSON-LD
- [ ] Stage 5: svc-skill — Skill Spec 완성, R2 패키징
- [ ] MCP 어댑터 생성

---

## 7) Risks & Assumptions

- PRD가 docx 단일 문서이므로 초기에 구조화 전환 필요
- Neo4j/Cloudflare/Anthropic 연동의 초기 비용/제약 확인 필요
- HITL UX 범위가 넓어 MVP 범위 고정 필요

---

## 8) Decision Log (요약)

- 2026-02-26: 신규 repo 생성 및 PRD seed 문서 반입
- 2026-02-26: Discovery-X 기반 Claude Code 운영 체계(.claude skills/agents) 이식
- 2026-02-26: 모노레포 스캐폴딩 완료 — Bun workspaces + Turborepo, 10 Workers 서비스, React+Vite SPA
- 2026-02-26: 공유 패키지 exports를 `./src/index.ts` (raw TS)로 설정 — Wrangler esbuild가 빌드 처리
- 2026-02-26: `packages/utils`에 `@cloudflare/workers-types` 추가 — Response/console 타입 해결
- 2026-02-26: typecheck 13/13 통과 확인
