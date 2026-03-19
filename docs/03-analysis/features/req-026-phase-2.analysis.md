---
code: AIF-ANLS-026D
title: "반제품 생성 엔진 Phase 2 — Gap Analysis"
version: "1.1"
status: Active
category: ANLS
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
feature: req-026-phase-2
refs: "[[AIF-DSGN-026D]] [[AIF-REQ-026]]"
---

# 반제품 생성 엔진 Phase 2 — Gap Analysis

> **Design Doc**: [[AIF-DSGN-026D]] `docs/02-design/features/req-026-phase-2.design.md`
> **Implementation**: `services/svc-skill/src/prototype/` + `packages/types/src/prototype.ts`
> **Analysis Date**: 2026-03-20

---

## 1. Overall Match Rate: 93% (수정 후)

| Category | 초기 | 수정 후 | 비고 |
|----------|:----:|:------:|------|
| Types (S1) | 88% | 98% | sourceServices 추가, organizationName 추가 |
| Migration (S2) | 95% | 95% | 파일명만 다름 (0004 vs 0006) |
| API Endpoints (S3) | 85% | 98% | orgName 버그 수정, 202 응답 수정 |
| Collector (S4.1) | 90% | 90% | 의도적 변경 (병렬 수집, 헤더 기반 org 필터) |
| Generators (S4.3) | 92% | 92% | 추가 기능은 개선 사항 |
| Orchestrator (S4.2) | 70% | 70% | Sprint 2 TODO 5건 (의도적 스코프 아웃) |
| Packager (S6) | 100% | 100% | 완전 일치 |
| wrangler.toml (S5) | 100% | 100% | 완전 일치 |
| Route Registration | 100% | 100% | 완전 일치 |
| Test Coverage | 85% | 98% | Zod 테스트 13건 추가 |
| **Overall** | **88%** | **93%** | **90% 달성** |

---

## 2. 수정 완료 항목

### BUG-1 수정: orgName 파라미터 분리 ✅

- `GeneratePrototypeRequestSchema`에 `organizationName` (optional) 추가
- `routes/prototype.ts`에서 `orgName = organizationName ?? organizationId` fallback
- README/manifest에 올바른 조직명 표시

### BUG-2 수정: 202 Accepted 응답 ✅

- `created()` (201) → 커스텀 202 응답으로 변경
- 비동기 작업에 적합한 HTTP 의미론

### sourceServices 추가 ✅

- `PrototypeOriginSchema`에 `sourceServices` (optional) 필드 추가
- Design S1과 일치

### Zod 테스트 추가 ✅

- `prototype-types.test.ts` 신규 (13 tests)
- OriginSchema, RequestSchema, OptionsSchema, ManifestSchema, RecordSchema 검증

---

## 3. 잔여 Gap (Sprint 2 의도적 스코프 아웃)

| Item | 상태 | 비고 |
|------|:----:|------|
| `generateDataModel()` | TODO | terms → DDL + types.ts |
| `generateFeatureSpec()` | TODO | skills → 기능 명세 |
| `generateArchitecture()` | TODO | 전체 → 아키텍처 문서 |
| `generateApiSpec()` | TODO | skills → OpenAPI 3.x |
| `generateClaudeMd()` | TODO | 전체 → CLAUDE.md |

이 5건은 Plan 문서에 Sprint 2로 명시된 의도적 스코프 아웃이며, Match Rate 산정에서 제외.

---

## 4. 구현 통계

| 항목 | 수치 |
|------|------|
| 신규 파일 | 12개 (types 1 + migration 1 + prototype 모듈 7 + tests 4) |
| 수정 파일 | 8개 (env, wrangler, index, 기존 테스트 3, INDEX.md) |
| 총 테스트 | 262 (신규 48 + 기존 214) |
| typecheck | 18/18 통과 |
| D1 마이그레이션 | 로컬 적용 완료 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-20 | Initial gap analysis (88%) | Sinclair Seo |
| 1.1 | 2026-03-20 | Bug fixes + Zod tests → 93% | Sinclair Seo |
