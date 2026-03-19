---
code: AIF-PLAN-026D
title: "반제품 생성 엔진 — Working Prototype Generator (Phase 2)"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: req-026-phase-2
refs: "[[AIF-PLAN-026]] [[AIF-PLAN-027]] [[AIF-REQ-026]] [[AIF-REQ-027]]"
---

# 반제품 생성 엔진 — Working Prototype Generator (Phase 2)

> **Parent**: [[AIF-PLAN-026]] Foundry-X 통합 로드맵 Phase 2
> **Parallel**: [[AIF-PLAN-027]] 반제품 스펙 포맷 정의 (별도 pane에서 진행)
> **REQ**: AIF-REQ-026 (P1, IN_PROGRESS) — Phase 2
> **Predecessor**: Phase 1-3 완료 (org MCP 서버 + meta-tool 3종, 619 tools)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI Foundry 5-Stage 파이프라인은 개별 결과물(policies, skills, ontologies)을 생성하지만, 이들을 "새 프로젝트의 출발점"이 되는 통합 패키지로 조립하는 자동화가 없음. 현재는 MCP 도구로만 접근 가능하며, Foundry-X에서 `foundry-x init`으로 부트스트래핑할 수 없음 |
| **Solution** | svc-skill에 Working Prototype Generator를 추가하여, Stage 1~5 결과물 전체를 Working Prototype 패키지(6개 스펙 문서 + 메타데이터 + MCP 도구)로 자동 변환. R2에 ZIP 패키지로 저장하고 API로 다운로드 가능하게 구현 |
| **Function/UX Effect** | `POST /prototype/generate?org=lpon` → LPON 848 policies + 7,332 terms + 85 docs → Working Prototype ZIP 생성 → R2 저장 → `GET /prototype/:id/download` → Foundry-X에서 `init --from-foundry` 입력으로 사용 |
| **Core Value** | "역공학의 출력이 자동으로 순공학의 입력이 된다." — 수동 스펙 작성(REQ-027) 없이도 파이프라인 데이터에서 직접 반제품을 생성하여, PoC 구축 시간을 대폭 단축 |

---

## 1. 배경 및 현재 상태

### 1.1 Phase 1-3 완료 현황

| 항목 | 상태 | 비고 |
|------|:----:|------|
| MCP 서버 | ✅ | 2서버 (LPON + Miraeasset) |
| MCP tools | ✅ | 619 unique (616 기존 + 3 meta-tool) |
| AgentTaskType | ✅ | 7종 (기존 4 + 신규 3) |
| org MCP | ✅ | `POST /mcp/org/:orgId` |
| SVC_ONTOLOGY binding | ✅ | svc-mcp-server → svc-ontology |

### 1.2 기존 Stage 5 출력

현재 svc-skill의 출력:
- `.skill.json` — 개별 Skill 패키지 (R2 저장)
- MCP adapter — svc-mcp-server에서 tool로 노출
- OpenAPI adapter — REST API로 노출

**부재**: Stage 1~4 결과물을 종합한 "프로젝트 수준" 출력 → 이것이 Working Prototype

### 1.3 REQ-027과의 관계

```
REQ-027 (다른 pane): 스펙 포맷 수동 정의 + LPON 파일럿 → 포맷 확정
    ↕ 양방향 피드백
REQ-026 Phase 2 (이 pane): 확정된 포맷 기반 자동 생성 엔진 구현
```

- REQ-027이 정의한 6개 문서 포맷을 엔진의 출력 스키마로 채택
- 엔진이 생성한 결과물로 REQ-027의 "Working Version 검증"을 가속

---

## 2. Working Prototype 출력 포맷

### 2.1 디렉토리 구조

PRD §4.1의 6개 문서 + 기존 Plan §3.2의 WP 구조를 통합:

```
working-prototype-{orgId}/
├── .foundry/
│   ├── origin.json              # 원천 추적 메타데이터
│   └── manifest.json            # WP 패키지 매니페스트 (버전, 생성 파라미터)
├── CLAUDE.md                    # AI Agent 컨텍스트 (자동 생성)
├── specs/
│   ├── 01-business-logic.md     # 비즈니스 로직 명세 (PRD 문서 1)
│   ├── 02-data-model.md         # 데이터 모델 명세 (PRD 문서 2)
│   ├── 03-feature-spec.md       # 기능 정의서 (PRD 문서 3)
│   ├── 04-architecture.md       # 아키텍처 정의서 (PRD 문서 4)
│   ├── 05-api-spec.yaml         # API 명세 — OpenAPI 3.x (PRD 문서 5)
│   └── 06-screen-spec.md        # 화면 정의 (PRD 문서 6, 후순위)
├── schemas/
│   ├── database.sql             # CREATE TABLE DDL
│   └── types.ts                 # Zod 스키마 + TS 타입
├── rules/
│   └── business-rules.json      # 정책 트리플 (구조화된 JSON)
├── ontology/
│   └── terms.jsonld             # SKOS/JSON-LD 용어 사전
├── mcp-tools.json               # MCP 도구 정의 (Foundry-X 자동 등록용)
└── README.md                    # 프로젝트 개요 + 사용법
```

### 2.2 핵심 파일별 데이터 소스 매핑

| 출력 파일 | 데이터 소스 | API | LLM 사용 |
|-----------|------------|-----|:--------:|
| `origin.json` | 파이프라인 메타데이터 | 내부 조합 | ❌ |
| `CLAUDE.md` | policies + ontologies + skills 요약 | 전체 | ✅ Sonnet |
| `01-business-logic.md` | policies (condition-criteria-outcome) | `svc-policy GET /policies` | ✅ Sonnet (시나리오 보강) |
| `02-data-model.md` | ontologies + terms + 원본 테이블 정의 | `svc-ontology GET /terms`, `GET /graph` | ✅ Sonnet (DDL 생성) |
| `03-feature-spec.md` | skills + policies + extractions | `svc-skill GET /skills`, `svc-extraction GET /extractions` | ✅ Sonnet (기능 명세 생성) |
| `04-architecture.md` | extractions (process/entity) + 소스 분석 | `svc-extraction GET /extractions` | ✅ Sonnet |
| `05-api-spec.yaml` | skills + FactCheck gaps + 원본 API | `svc-skill`, `svc-analytics /factcheck` | ✅ Sonnet (OpenAPI 생성) |
| `06-screen-spec.md` | 원본 화면 설계서 (파싱 결과) | `svc-ingestion GET /documents` | ✅ Sonnet |
| `database.sql` | ontologies (terms→DDL 변환) | `svc-ontology` | ✅ Sonnet |
| `types.ts` | database.sql 기반 Zod 생성 | 로컬 변환 | ❌ |
| `business-rules.json` | policies 전량 (JSON 구조화) | `svc-policy` | ❌ |
| `terms.jsonld` | ontologies SKOS export | `svc-ontology` | ❌ |
| `mcp-tools.json` | svc-mcp-server tools/list | `svc-mcp-server` | ❌ |

---

## 3. 실행 계획

### Sprint 1: 타입 정의 + 생성기 스캐폴딩 (이번 세션)

| # | 태스크 | 산출물 | 비고 |
|---|--------|--------|------|
| 1-1 | WP 매니페스트 Zod 스키마 정의 | `packages/types/src/prototype.ts` | origin.json + manifest.json 스키마 |
| 1-2 | svc-skill에 prototype 라우트 추가 | `services/svc-skill/src/routes/prototype.ts` | POST /prototype/generate, GET /prototype/:id |
| 1-3 | Data Collector 구현 — 5개 서비스에서 데이터 수집 | `services/svc-skill/src/prototype/collector.ts` | Service Binding으로 내부 호출 |
| 1-4 | Business Logic Generator (P0 문서 1) | `services/svc-skill/src/prototype/generators/business-logic.ts` | policies → 시나리오 플로우 마크다운 |
| 1-5 | Rules JSON Export (기계적 변환) | `services/svc-skill/src/prototype/generators/rules-json.ts` | policies → business-rules.json |

### Sprint 2: 나머지 생성기 + R2 패키징

| # | 태스크 | 산출물 |
|---|--------|--------|
| 2-1 | Data Model Generator (문서 2) | `generators/data-model.ts` — terms → DDL + Zod |
| 2-2 | Feature Spec Generator (문서 3) | `generators/feature-spec.ts` — skills + policies → 기능 정의 |
| 2-3 | Architecture Generator (문서 4) | `generators/architecture.ts` — extractions → 아키텍처 |
| 2-4 | API Spec Generator (문서 5) | `generators/api-spec.ts` — skills → OpenAPI YAML |
| 2-5 | CLAUDE.md Generator | `generators/claude-md.ts` — 전체 요약 |
| 2-6 | R2 ZIP 패키징 + 다운로드 API | `routes/prototype.ts` 확장 |

### Sprint 3: E2E 검증 + Foundry-X 연동

| # | 태스크 | 산출물 |
|---|--------|--------|
| 3-1 | LPON WP 생성 E2E 테스트 | `tests/prototype.test.ts` |
| 3-2 | Miraeasset WP 생성 테스트 | 퇴직연금 도메인 |
| 3-3 | Production 배포 + 실 데이터 검증 | staging → production |

---

## 4. 아키텍처

### 4.1 svc-skill 확장

```
svc-skill/
├── src/
│   ├── routes/
│   │   ├── skills.ts            # 기존 Skill CRUD
│   │   ├── evaluate.ts          # 기존 평가
│   │   └── prototype.ts         # [신규] WP 생성/조회/다운로드
│   ├── prototype/               # [신규 모듈]
│   │   ├── collector.ts         # 5개 서비스 데이터 수집기
│   │   ├── orchestrator.ts      # 생성 오케스트레이터
│   │   ├── packager.ts          # ZIP 패키징 + R2 저장
│   │   └── generators/          # 문서별 생성기
│   │       ├── business-logic.ts
│   │       ├── data-model.ts
│   │       ├── feature-spec.ts
│   │       ├── architecture.ts
│   │       ├── api-spec.ts
│   │       ├── screen-spec.ts
│   │       ├── claude-md.ts
│   │       ├── rules-json.ts
│   │       └── terms-jsonld.ts
│   ├── assembler/               # 기존 Skill 패키징
│   └── bundler/                 # 기존 번들링
```

### 4.2 Service Binding 의존성

```
svc-skill (WP Generator)
  ├── SVC_POLICY    → GET /policies?org={orgId}&status=approved
  ├── SVC_ONTOLOGY  → GET /terms?org={orgId}, GET /graph
  ├── SVC_EXTRACTION → GET /extractions?org={orgId}
  ├── SVC_INGESTION → GET /documents?org={orgId}
  ├── SVC_LLM_ROUTER → POST /complete (Sonnet tier, 문서 생성용)
  └── R2 (SKILL_BUCKET) → ZIP 패키지 저장
```

### 4.3 API 엔드포인트

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/prototype/generate` | WP 생성 시작 (비동기, Queue) | `X-Internal-Secret` |
| GET | `/prototype` | WP 목록 조회 | `X-Internal-Secret` |
| GET | `/prototype/:id` | WP 상태/메타 조회 | `X-Internal-Secret` |
| GET | `/prototype/:id/download` | WP ZIP 다운로드 | `X-Internal-Secret` |

---

## 5. 데이터 모델

### 5.1 D1 테이블 (db-skill 확장)

```sql
CREATE TABLE prototypes (
  prototype_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'generating',  -- generating|completed|failed
  r2_key TEXT,                                 -- working-prototypes/{id}.zip
  doc_count INTEGER DEFAULT 0,
  policy_count INTEGER DEFAULT 0,
  term_count INTEGER DEFAULT 0,
  skill_count INTEGER DEFAULT 0,
  generation_params TEXT,                      -- JSON: 생성 파라미터
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 6. 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R-1 | LLM 비용 — 6개 문서 생성에 Sonnet 대량 호출 | API 크레딧 소진 | 기계적 변환 우선, LLM은 시나리오 보강에만 사용. 캐싱 활용 |
| R-2 | Workers 30초 타임아웃 — WP 생성이 30초 초과 | 생성 실패 | Queue 비동기 처리 + 문서별 개별 생성 후 조합 |
| R-3 | REQ-027 포맷 변경 시 생성기 수정 필요 | 재작업 | 생성기를 템플릿 기반으로 설계, 포맷 변경 시 템플릿만 교체 |
| R-4 | Service Binding 추가 필요 (SVC_POLICY, SVC_EXTRACTION, SVC_INGESTION) | wrangler.toml 변경 | 기존 패턴 따라 추가 |

---

## 7. 의존성

| 의존성 | 상태 | 비고 |
|--------|:----:|------|
| svc-skill Production 배포 | ✅ | 현재 운영 중 |
| SVC_ONTOLOGY binding | ✅ | Phase 1-3에서 추가 |
| SVC_LLM_ROUTER binding | ✅ | 기존 |
| SVC_POLICY binding | ❌ 신규 | wrangler.toml 추가 필요 |
| SVC_EXTRACTION binding | ❌ 신규 | wrangler.toml 추가 필요 |
| SVC_INGESTION binding | ❌ 신규 | wrangler.toml 추가 필요 |
| LPON 파이프라인 데이터 | ✅ | 848 policies, 7,332 terms |
| REQ-027 스펙 포맷 확정 | 🔄 진행 중 | 다른 pane에서 병렬 진행 |
