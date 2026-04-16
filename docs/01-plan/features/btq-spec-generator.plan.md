---
title: "B/T/Q Spec 문서 생성기 — 추출 데이터 → 사람이 읽을 수 있는 Spec 문서 조립"
requirement: AIF-REQ-034
track: F
created: 2026-04-16
decisions:
  generation: "Template + LLM Hybrid"
  scope: "Both (Skill + Org)"
  format: "Markdown + JSON API"
  req: "AIF-REQ-034 확장"
---

# B/T/Q Spec 문서 생성기 Plan

## 1. 문제 정의

현재 Decode-X는 추출 데이터를 **AI-Ready 점수(signal scorer)**로 채점하지만, 추출된 정보를 **사람이 읽을 수 있는 Spec 문서**로 조립하는 레이어가 없다. 4/17 보고에서 "점수"보다 "실제 Spec 문서"가 설득력 있음이 확인됨.

### 현재 상태
- ✅ AI-Ready 6기준 scorer (`scoring/ai-ready.ts`) — B/T/Q signal 감지
- ✅ Drill-down UI (`poc-ai-ready-detail.tsx`) — 점수 + signal 표시
- ✅ Deliverables export 5종 (`/deliverables/export/*`) — Org 단위 마크다운 렌더러
- ✅ Prototype generator (`prototype/`) — Org 단위 WP 생성 (6종 Spec + ZIP)
- ❌ **Skill 단위 B/T/Q Spec 문서 생성** — 없음
- ❌ **Org 단위 B/T/Q 종합 Spec 문서** — 없음

### 목표
추출 데이터(policies, extraction results, ontology terms, adapters)를 **B/T/Q 3종 Spec 문서**로 조립. Skill 단위 + Org 단위 모두 지원.

---

## 2. 아키텍처

### 2.1 생성 방식: Template + LLM Hybrid

| 구분 | Template (기계적) | LLM (Haiku) |
|------|-------------------|-------------|
| **역할** | 섹션 구조, 테이블, 목록, 메타데이터 | 요약 문단, Gap 코멘터리, 권고사항 |
| **비중** | ~80% | ~20% |
| **비용** | 0원 | Haiku tier (~$0.01/skill) |

### 2.2 데이터 흐름

```
┌─────────────────────────────────────────────────────────┐
│ Skill 단위 생성                                          │
│                                                         │
│  SkillPackage (R2) ─┐                                   │
│  ├─ policies[]      │                                   │
│  ├─ technicalSpec   ├─→ SpecDataCollector ──→ B/T/Q     │
│  ├─ ontologyRef     │       (Skill 스코프)    Generators │
│  ├─ adapters        │                         ├─ BusinessSpecGen │
│  └─ trust/prov      │                         ├─ TechnicalSpecGen │
│                     │                         └─ QualitySpecGen │
│  Extraction (D1) ───┘                              │    │
│  ├─ processes[]                                    ↓    │
│  ├─ entities[]                              SpecDocument │
│  ├─ apis[] / tables[]                       (JSON + MD)  │
│  └─ rules[]                                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Org 단위 생성 (집계)                                      │
│                                                         │
│  collectOrgData() ───→ Skill별 SpecDocument[] ──→ OrgSpecAggregator │
│  (기존 prototype/                                        │
│   collector.ts 재활용)    Cross-skill 통계 + 종합 요약     │
└─────────────────────────────────────────────────────────┘
```

### 2.3 모듈 구조 (신규)

```
services/svc-skill/src/
├── spec-gen/                        # 신규 디렉토리
│   ├── types.ts                     # SpecDocument, SpecSection 타입
│   ├── collector.ts                 # Skill 단위 데이터 수집 (R2 + D1 + Service Binding)
│   ├── generators/
│   │   ├── business.ts              # Business Spec: 업무규칙/정책/용어사전
│   │   ├── technical.ts             # Technical Spec: API/ERD/데이터흐름/에러
│   │   └── quality.ts               # Quality Spec: 성능/보안/테스트/운영
│   ├── llm-enhancer.ts              # LLM 보강 (요약, 코멘터리) — callLlm(Haiku)
│   ├── markdown-renderer.ts         # SpecDocument → Markdown 변환
│   └── org-aggregator.ts            # Org 단위 집계 + 종합 문서
├── routes/
│   └── spec.ts                      # 신규: GET /skills/:id/spec/:type, GET /admin/org-spec/...
```

---

## 3. B/T/Q Spec 문서 설계

### 3.1 Business Spec (업무 명세서)

| 섹션 | 소스 | 생성 방식 |
|------|------|-----------|
| **① 개요 (Executive Summary)** | policies count, domain, subdomain | LLM 요약 |
| **② 업무 규칙 (Business Rules)** | policies[].condition/criteria/outcome | Template: if-then 테이블 |
| **③ 프로세스 맵** | extraction.processes[] + relationships[] | Template: 단계별 목록 |
| **④ 엔티티 정의** | extraction.entities[] + attributes | Template: 엔티티-속성 테이블 |
| **⑤ 정책 체계 (Policy Registry)** | policies[] grouped by domain/type | Template: 그룹별 코드 테이블 |
| **⑥ 용어사전 (Glossary)** | ontology terms (via Service Binding) | Template: 용어-정의-URI 테이블 |
| **⑦ Gap & 권고** | scorer signals + missing areas | LLM 코멘터리 |

### 3.2 Technical Spec (기술 명세서)

| 섹션 | 소스 | 생성 방식 |
|------|------|-----------|
| **① 아키텍처 개요** | extraction result meta, provenance | LLM 요약 |
| **② API 명세** | technicalSpec.apis[] + MCP adapter | Template: endpoint 테이블 + req/res 스키마 |
| **③ 데이터 모델 (ERD)** | technicalSpec.tables[] + columns | Template: 테이블-컬럼 정의 |
| **④ 데이터 흐름** | technicalSpec.dataFlows[] | Template: source→target 테이블 |
| **⑤ 에러 명세** | technicalSpec.errors[] | Template: 코드-예외-처리 테이블 |
| **⑥ 어댑터 현황** | adapters.mcp, adapters.openapi | Template: 어댑터 유무 + 키 |
| **⑦ Gap & 권고** | scorer signals (apiHit, dataFieldHit, adapterHit) | LLM 코멘터리 |

### 3.3 Quality Spec (품질 명세서)

| 섹션 | 소스 | 생성 방식 |
|------|------|-----------|
| **① 품질 개요** | trust score, review status | LLM 요약 |
| **② 성능 요구** | quality keywords from policies (SLA, RPS, latency) | Template: 추출된 수치 목록 |
| **③ 보안 요구** | security keywords (암호화, 마스킹, 감사) | Template: 보안 항목 체크리스트 |
| **④ 추적성 (Traceability)** | provenance, source excerpts coverage | Template: 문서ID-정책 매핑 |
| **⑤ 검증 현황** | trust levels, review dates | Template: 정책별 검증 상태 테이블 |
| **⑥ Gap & 권고** | scorer signals (qualityKwHit, trustScoreOk, excerptOk) | LLM 코멘터리 |

---

## 4. API 설계

### 4.1 Skill 단위 API

```
GET /skills/:skillId/spec/:type
  type = business | technical | quality | all
  Query: ?format=json|markdown (default: json)

Response (JSON):
{
  skillId: string,
  type: "business" | "technical" | "quality",
  generatedAt: ISO8601,
  sections: [
    { id: string, title: string, content: string (markdown), order: number }
  ],
  metadata: {
    domain: string,
    policyCount: number,
    aiReadyScore: { business: number, technical: number, quality: number }
  }
}

Response (Markdown): text/markdown, filename: {skillId}-{type}-spec.md
```

### 4.2 Org 단위 API

```
GET /admin/org-spec/:orgId/:type
  type = business | technical | quality | all
  Query: ?format=json|markdown

Response (JSON):
{
  organizationId: string,
  type: "business" | "technical" | "quality",
  generatedAt: ISO8601,
  summary: { skillCount, policyCount, avgScore },
  sections: SpecSection[],
  perSkill: [{ skillId, domain, sections: SpecSection[] }]
}
```

### 4.3 라우팅 추가 (`svc-skill/src/index.ts`)

```
/skills/:id/spec/business   → handleSkillSpec(req, env, id, "business")
/skills/:id/spec/technical   → handleSkillSpec(req, env, id, "technical")
/skills/:id/spec/quality     → handleSkillSpec(req, env, id, "quality")
/skills/:id/spec/all         → handleSkillSpec(req, env, id, "all")
/admin/org-spec/:orgId/:type → handleOrgSpec(req, env, orgId, type)
```

---

## 5. 프론트엔드

### 5.1 Drill-down 확장 (`poc-ai-ready-detail.tsx`)

현재 3탭(Business/Technical/Quality)에 **각 탭 하단에 "Spec 문서 보기" 섹션** 추가:
- 마크다운 렌더링 (기존 `MarkdownContent` 컴포넌트 재활용)
- "다운로드 .md" 버튼

### 5.2 Org Spec 페이지 (신규)

`/org-spec` 페이지: 조직 선택 → B/T/Q 3탭 → 종합 Spec 문서 뷰
- Export Center의 SI 산출물 탭과 유사한 UX (좌측 목차 + 우측 마크다운 프리뷰)

---

## 6. 재활용 자산

| 기존 자산 | 재활용 방법 |
|-----------|------------|
| `prototype/collector.ts` | Org 단위 데이터 수집 (CollectedData) 그대로 사용 |
| `prototype/generators/business-logic.ts` | Business Spec의 업무규칙 생성 패턴 참조 |
| `export/policy-md-generator.ts` | 정책 마크다운 렌더링 재활용 |
| `scoring/ai-ready.ts` | B/T/Q signal을 Gap 분석에 활용 |
| `assembler/adapter-writer.ts` | 어댑터 정보 조회 패턴 |
| `routes/admin.ts` handleSkillDetail | Skill R2 조회 + 점수 계산 패턴 |
| `app-web MarkdownContent` | 프론트엔드 마크다운 렌더링 |

---

## 7. Sprint 분할

### Sprint 208 (Core): Skill 단위 B/T/Q Spec 생성기 + API

**범위**: `spec-gen/` 모듈 전체 + `routes/spec.ts` + 라우팅 + 테스트
**파일 변경**: ~8개 신규, 1개 수정 (`index.ts`)
**KPI**: LPON 샘플 5개 Skill에 대해 B/T/Q Spec 생성 + JSON/MD 반환 확인
**예상 규모**: ~1,200줄 (generators 3×200 + collector 150 + types 100 + route 150 + renderer 100 + tests 300)

### Sprint 209 (Extend): Org 단위 집계 + 프론트엔드

**범위**: `org-aggregator.ts` + Org API + drill-down UI 확장 + org-spec 페이지
**파일 변경**: ~4개 신규, 3개 수정
**KPI**: LPON Org 전체 B/T/Q 종합 Spec 문서 + drill-down에서 Spec 확인
**예상 규모**: ~800줄

---

## 8. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| LLM 요약 비용 | Org 단위에서 skill 수 × Haiku 호출 | 캐싱 (D1 spec_cache 테이블, TTL 24h) |
| Extraction 데이터 부재 | 일부 Skill에 technicalSpec 없음 | Template fallback: "데이터 미확보" 표시 |
| Workers 30s 타임아웃 | Org 전체 집계 시 데이터 수집 지연 | ctx.waitUntil + 비동기 생성 + 캐시 조회 |

---

## 9. 완료 기준

- [ ] Skill 단위 B/T/Q 3종 Spec JSON API 동작 (`GET /skills/:id/spec/{type}`)
- [ ] Markdown 다운로드 동작 (`?format=markdown`)
- [ ] Org 단위 종합 Spec API 동작 (`GET /admin/org-spec/:orgId/{type}`)
- [ ] Drill-down UI에서 Spec 문서 렌더링
- [ ] LPON 894개 Skill 중 상위 5개 B/T/Q Spec 검증
- [ ] typecheck + lint PASS
- [ ] AIF-REQ-034 범위 갱신 (SPEC.md)
