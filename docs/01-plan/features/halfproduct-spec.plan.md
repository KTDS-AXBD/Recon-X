---
code: AIF-PLAN-027
title: "반제품 스펙 포맷 정의 및 파일럿 생성"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: halfproduct-spec
refs: "[[AIF-PLAN-026]] [[AIF-REQ-027]] [[AIF-REQ-026]]"
---

# 반제품 스펙 포맷 정의 및 파일럿 생성

> **Parent**: [[AIF-PLAN-026]] Foundry-X 통합 로드맵 Phase 2
> **PRD**: `반제품-스펙/prd-final.md` (v3 Final, 3회 AI 리뷰)
> **REQ**: AIF-REQ-027 (P0, IN_PROGRESS)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI Foundry는 policies 3,675, skills 26 bundled, ontologies 848, terms 8,773건을 추출했지만, 이들은 개별 조각(condition-criteria-outcome, SKOS, .skill.json)일 뿐 "하나의 시스템을 만들 수 있는 통합 스펙"으로 조립되지 않음. 본부장이 "어느 수준의 스펙까지 나올 수 있는지" 직접 확인 필요 |
| **Solution** | 역공학 결과물을 6개 스펙 문서(비즈니스 로직/데이터 모델/기능 정의/아키텍처/API/화면)로 변환하는 포맷과 생성 프로세스 정의. LPON 온누리상품권으로 파일럿, 퇴직연금 후속 확장 |
| **Function/UX Effect** | LPON 848 policies + 7,332 terms + 85 parsed docs → 6개 반제품 스펙 문서 → Claude Code에 입력 → Working Version(핵심 로직 실동작) 자동 생성. 본부장이 체크리스트로 "맞다/틀리다" 판정 가능 |
| **Core Value** | "역공학의 출력이 곧 순공학의 입력이 된다." — AI Foundry가 추출한 도메인 지식이 단순 보고서가 아닌 실행 가능한 시스템 스펙으로 변환됨을 입증. PoC 구축 시간 2~4주 → 수일 단축 가능성 검증 |

---

## 1. 배경 및 현재 상태

### 1.1 AI Foundry 파이프라인 결과물 현황

| 추출물 | LPON 온누리상품권 | 퇴직연금 | 비고 |
|--------|:-:|:-:|------|
| Documents (parsed) | 85/88 | 13/15 | Stage 1 |
| Extractions | 111 completed | N/A | Stage 2 |
| Policies (approved) | 848 | 2,827 | Stage 3 |
| Ontologies (terms) | 848 (7,332 terms) | N/A (1,441 terms) | Stage 4 |
| Skills | 859 (11 bundled) | 3,065 (15 bundled) | Stage 5 |
| FactCheck coverage | 31.2% (119/382 매칭) | 미실행 | 소스코드↔문서 |
| 소스코드 AST 분석 | ✅ 완료 (AST parser) | ❌ 미분석 | D2 100건만 존재 |

### 1.2 현재 결과물의 한계 (PRD §2.1)

| 추출물 | 현재 형태 | 반제품 스펙에 필요한 수준 |
|--------|-----------|--------------------------|
| Policies | condition-criteria-outcome 트리플 | 시나리오 맥락 + 플로우 연결 + 예외 분기 |
| Ontologies | SKOS/JSON-LD 용어 그래프 | CREATE TABLE + FK + 인덱스 수준의 데이터 모델 |
| Skills | .skill.json MCP 도구 단위 | 시스템 전체 아키텍처 + 모듈 구성 |
| Structure | 프로세스/엔티티 그래프 | 입력/출력/선행조건/에러 케이스 수준의 기능 정의 |

### 1.3 LPON 파일럿 선택 근거

- **데이터 풍부도**: 85 docs, 848 policies, 7,332 terms — 파일럿에 충분
- **FactCheck 완료**: 소스코드↔문서 커버리지 31.2%, 외부 API 83.7% — 갭이 어디인지 파악됨
- **AST 분석 완료**: Spring Boot 소스코드 AST 파서로 382 source items 식별
- **도메인 분류 완료**: 17개 도메인(회원79, 충전49, 선물42, 거래40, 메시지38 등)

---

## 2. 목표

### 2.1 이번 PDCA 사이클 목표

1. **스펙 포맷 확정**: 6개 문서 각각의 구조/섹션/상세도 기준 확정
2. **LPON 파일럿 P0 문서 3종 생성**: 비즈니스 로직 명세, 데이터 모델 명세, 기능 정의서
3. **Working Version 생성 검증**: P0 문서 → Claude Code → 핵심 로직 실동작 PoC
4. **검증 루프**: 본부장 체크리스트 + AI Agent 생성 + 자동화 테스트

### 2.2 성공 기준 (PRD §5 기반)

| 지표 | 목표값 | 측정 방법 |
|------|--------|-----------|
| 비즈니스 로직 커버리지 | ≥ 80% | LPON 848 policies 중 스펙에 반영된 비율 |
| Working Version 생성률 | ≥ 1건 | 스펙만으로 Working Version 생성 성공 여부 |
| 사람 개입 횟수 | ≤ 10회 | Working Version 생성 시 수동 보정 횟수 |
| 테스트 통과율 | ≥ 80% | 자동 생성 코드의 테스트케이스 통과율 |

---

## 3. 실행 계획

### Sprint 1: 스펙 포맷 확정 + P0 비즈니스 로직 명세 (이번 세션)

| # | 태스크 | 입력 | 산출물 | 예상 |
|---|--------|------|--------|------|
| 1-1 | Design 문서 작성 — 6개 스펙 문서 포맷 상세 설계 | PRD §4.1~4.2, LPON 데이터 | `halfproduct-spec.design.md` | 즉시 |
| 1-2 | LPON 비즈니스 로직 명세 (문서 1) 생성 | policies 848 + FactCheck + 원본 산출물 | `output/lpon/01-business-logic.md` | 즉시 |
| 1-3 | Working Version 생성 시도 (P0 1건) | 비즈니스 로직 명세 | PoC 코드 + 테스트 결과 | 후속 |

### Sprint 2: P0 나머지 + P1 문서

| # | 태스크 | 입력 | 산출물 |
|---|--------|------|--------|
| 2-1 | LPON 데이터 모델 명세 (문서 2) | ontologies 848 + terms 7,332 + 원본 테이블 정의 | `output/lpon/02-data-model.md` |
| 2-2 | LPON 기능 정의서 (문서 3) | skills 859 + policies + 원본 요구사항 | `output/lpon/03-feature-spec.md` |
| 2-3 | LPON 아키텍처 정의서 (문서 4) | structure + 소스코드 AST | `output/lpon/04-architecture.md` |
| 2-4 | LPON API 명세 (문서 5) | skills + 원본 API 명세 + FactCheck gaps | `output/lpon/05-api-spec.md` |

### Sprint 3: 검증 + 퇴직연금 확장

| # | 태스크 | 입력 | 산출물 |
|---|--------|------|--------|
| 3-1 | Working Version 통합 생성 + 테스트 | 6개 스펙 전체 | PoC 코드 + 품질 리포트 |
| 3-2 | 본부장 리뷰 체크리스트 준비 | PRD §4.2.2 | 검증 체크리스트 문서 |
| 3-3 | 퇴직연금 도메인 P0 문서 3종 생성 | Miraeasset 데이터 | `output/miraeasset/01~03.md` |

---

## 4. 데이터 소스 매핑

반제품 스펙 6개 문서 각각이 어떤 AI Foundry 데이터를 입력으로 사용하는지:

| # | 스펙 문서 | AI Foundry Source | API Endpoint | 보충 소스 |
|---|-----------|-------------------|--------------|-----------|
| 1 | 비즈니스 로직 명세 | `svc-policy` policies (condition-criteria-outcome) | `GET /policies?org=lpon&status=approved` | 원본 산출물, FactCheck 매칭 결과 |
| 2 | 데이터 모델 명세 | `svc-ontology` terms + Neo4j 그래프 | `GET /terms?org=lpon`, `GET /graph` | 원본 테이블 정의서, ERD |
| 3 | 기능 정의서 | `svc-skill` skills + policies | `GET /skills?org=lpon&status=bundled` | 원본 요구사항 정의서 |
| 4 | 아키텍처 정의서 | `svc-extraction` structure (process/entity) | `GET /extractions?org=lpon` | 소스코드 AST, 원본 프로그램 명세 |
| 5 | API 명세 | skills + FactCheck gaps | `GET /skills` + `GET /factcheck/domain-summary` | 원본 API 명세서 |
| 6 | 화면 정의 | 원본 화면 설계서 (파싱 완료) | `GET /documents?org=lpon&type=screen-design` | UX 패턴 |

---

## 5. 산출물 디렉토리 구조

```
반제품-스펙/
├── prd-final.md                    # PRD (완료)
├── review/                         # 리뷰 이력
├── output/
│   ├── lpon/                       # LPON 온누리상품권 파일럿
│   │   ├── 01-business-logic.md    # 비즈니스 로직 명세
│   │   ├── 02-data-model.md        # 데이터 모델 명세
│   │   ├── 03-feature-spec.md      # 기능 정의서
│   │   ├── 04-architecture.md      # 아키텍처 정의서
│   │   ├── 05-api-spec.md          # API 명세
│   │   └── 06-screen-spec.md       # 화면 정의 (후순위)
│   └── miraeasset/                 # 퇴직연금 (후속)
│       └── ...
└── validation/
    ├── checklist.md                # 본부장 검증 체크리스트
    └── working-version/            # Working Version PoC
```

---

## 6. 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R-1 | LPON policies 848건이 도메인 전체를 커버하지 못할 수 있음 | 비즈니스 로직 명세 불완전 | FactCheck gap 영역은 명시적으로 "미문서화" 표기, 외부 API 커버리지 83.7% 활용 |
| R-2 | 원본 산출물 접근 제한 (보안) | 일부 소스코드 참조 불가 | R2에 저장된 파싱 결과만으로 작업 가능, 원본 필요 시 개별 요청 |
| R-3 | Claude Code가 생성한 Working Version의 품질이 기대치 미달 | PoC 가치 입증 실패 | 반복 개선 루프(스펙 보강 → 재생성), 사람 개입 허용 (≤10회) |
| R-4 | 퇴직연금 도메인은 소스코드 미분석 | 데이터 모델/API 명세 생성 어려움 | LPON 우선 완료 후 퇴직연금은 policy 기반 + 원본 산출물 직접 참조 |

---

## 7. 의존성

| 의존성 | 상태 | 비고 |
|--------|:----:|------|
| LPON 파이프라인 5-Stage 완료 | ✅ | 848 policies, 7,332 terms, 859 skills |
| svc-mcp-server Production 배포 | ✅ | 619 tools, meta-tool 3종 |
| FactCheck 커버리지 분석 | ✅ | 31.2%, 도메인별 분류 완료 |
| AST 소스코드 분석 | ✅ | 382 source items |
| 원본 산출물 R2 저장 | ✅ | 85 docs parsed |
| 퇴직연금 소스코드 분석 | ❌ | 후속 Sprint 3에서 필요 시 |
