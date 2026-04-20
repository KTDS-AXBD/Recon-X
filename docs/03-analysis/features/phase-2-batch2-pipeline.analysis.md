---
code: AIF-ANLY-phase-2-batch2
title: Phase 2 Batch 2 (Sprint 212 + 213) 통합 Gap Analysis + E2E Audit
version: 1.0
status: Active
category: ANALYSIS
system-version: 0.7.0
created: 2026-04-20
updated: 2026-04-20
author: Sinclair Seo
related:
  - docs/02-design/features/sprint-212.design.md
  - docs/02-design/features/sprint-213.design.md
  - docs/req-interview/decode-x-v1.3-phase-2/prd-final.md
---

# Phase 2 Batch 2 통합 Gap Analysis + E2E Audit

> PDCA Check Phase — Sprint 212 (PR #15 @ `10fca6a`) + Sprint 213 (PR #16 @ `ec9ea72`) merge 후 master 기준 독립 검증.

## Executive Summary

| Sprint | Commit/SPEC 자가보고 | 독립 검증 | 판정 |
|:------:|:---:|:---:|:---:|
| 212 | 100% (42 tests) | **87%** (7 tests 실제) | **⚠️ Gap** |
| 213 | 100% (50 tests) | **95%** (15 tests 실제) | **✅ Pass** |
| **Batch 2 종합** | 100% | **91%** | **✅ Pass** |

**핵심 발견**:
- Sprint 212 `parseMyBatisMapper` 미구현 + `requiredParams` DIVERGENCE 누락 (2 FAIL)
- Sprint 213 table-level UNIQUE(cols) 스킵 (1 MINOR)
- 두 Sprint 공통: 커밋 메시지의 테스트 수(42/50)는 워크스페이스 전체 합산 — 신규 기여는 각 7/15건
- E2E Audit: **scope out** (Sprint 212/213 UI/라우트 변경 없음, CLI/utility 전용)

---

## 1. Sprint 212 — Match Rate 87% (⚠️ Gap)

### 1.1 Design 항목 검증 (PASS = 15 / 17)

Design `docs/02-design/features/sprint-212.design.md` 기준:

| # | Design 항목 | 결과 | 위치 |
|:--:|---|:-:|---|
| 1 | `ReconcileMarker` 타입 | PASS | `packages/types/src/reconcile.ts:1` |
| 2 | `DocEndpointSpec` | PASS | `reconcile.ts:3-8` |
| 3 | `DocApiSpec` | PASS | `reconcile.ts:10-13` |
| 4 | `ReconcileResult` | PASS (minor deviation) | `reconcile.ts:15-22` — `exactOptionalPropertyTypes` 대응으로 `\| undefined` 사용 (허용) |
| 5 | `ReconciliationReport` | PASS | `reconcile.ts:24-34` |
| 6 | 매칭 키 `${method} ${normalizedPath}` | PASS | `buildKey()` |
| 7 | path normalize `{id}→:id`, trailing slash | PASS | `normalizePath()` |
| 8 | SOURCE_MISSING 판정 | PASS | `reconcile.ts:50-60` |
| 9 | DOC_ONLY 판정 | PASS | `reconcile.ts:63-73` |
| 10 | DIVERGENCE paramCount | PASS | `reconcile.ts:76-90` |
| 11 | **DIVERGENCE requiredParams** | **FAIL** | Design §3 명시되었으나 미구현, 테스트도 없음 |
| 12 | CLI `--dir` | PASS | `scripts/java-ast/src/index.ts:21` |
| 13 | CLI `--out` | PASS | `index.ts:22` |
| 14 | CLI `--project` | PASS | `index.ts:23` |
| 15 | CLI `--verbose` | PASS | `index.ts:24` |
| 16 | type re-export | PASS | `packages/types/src/index.ts:17` |
| 17 | function re-export | PASS | `packages/utils/src/index.ts:10` |

### 1.2 FAIL (2건)

**FAIL-1: `parseMyBatisMapper()` 완전 누락**
- Design §1 아키텍처 다이어그램에 `parseJavaController / parseJavaService / parseJavaDataModel / parseMyBatisMapper` 4종 명시
- `SourceAnalysisResult.stats.mapperCount` 필드는 존재하나 (`runner.ts:147`, `types.ts:45`) 항상 0
- MyBatis XML (`<select>/<insert>/<update>/<delete>`) 파싱 로직 전혀 없음
- **영향**: LPON 결제는 MyBatis 사용 → Sprint 214b Track A Fill 시점에 가시화됨

**FAIL-2: `requiredParams` DIVERGENCE 누락**
- Design §3: DIVERGENCE 사유 2종 명시 (`paramCount` + `requiredParams`)
- 구현 (`reconcile.ts:76-90`): `paramCount`만
- 테스트 시나리오도 없음

### 1.3 설계-구현 구조적 편차 (LOW)

- Sprint 212 Plan §배경: "기존 파서(`java-controller.ts`, `java-service.ts`, `java-datamodel.ts`)를 CLI로 조립"
- 실제 `scripts/java-ast/src/runner.ts`: 5종 regex (`RE_CONTROLLER`, `RE_SERVICE`, `RE_ENTITY`, `RE_LOMBOK`, `HTTP_ANNOTATIONS`) 인라인 재구현, svc-ingestion 파서 import 전무
- **결과**: DRY 위반 — Worker-side parser와 CLI-side parser 동시 유지 → 버그 수정 drift 위험

### 1.4 PRD Must Have vs 구현 편차 (MEDIUM)

- PRD `prd-final.md` §4.1 M-2: "Tree-sitter(Java) 기반 1차 구현 → WASM fallback. javaparser는 PoC 비교용"
- 실제: Tree-sitter 없음, WASM 없음, javaparser 없음 → **regex 기반**
- SPEC.md line 472에는 "javaparser JVM 대안으로 Node CLI 자체 구현"으로 기록됨 (의도적 변경)
- 그러나 PRD §4.1은 미갱신 → **PRD↔Code 문서 drift**
- 견고성 우려 (`runner.ts:60-63`):
  ```ts
  const commas = (line.match(/,/g) ?? []).length;
  const paramCount = hasParams ? commas + 1 : 0;
  ```
  → `Map<String, Object>` 같은 제네릭 param에서 miscount 발생 가능

### 1.5 Added features (Design 외)

- `normalizePath` 테스트: `{id}`/`:id` 동일 취급 (Design §6 테스트 매트릭스에 없음)
- `mixed scenario` 테스트 (3종 마커 조합)
- `projectName/analyzedAt` 보고서 메타데이터 테스트

### 1.6 테스트 수치 검증

- 커밋 메시지 / SPEC: "42 tests PASS"
- 실제 `packages/utils/src/__tests__/reconcile.test.ts`: **7 `it()` 블록** (21 `expect`)
- 42건은 `packages/utils` 워크스페이스 전체 vitest 실행 결과 (기존 테스트 포함). Sprint 212 신규 기여 = 7건

---

## 2. Sprint 213 — Match Rate 95% (✅ Pass)

### 2.1 Design 항목 검증 (PASS = 16 / 17)

Design `docs/02-design/features/sprint-213.design.md` 기준:

| # | Design 항목 | 결과 |
|:--:|---|:-:|
| 1~5 | 타입 `ErdColumn/ErdIndex/ErdEntity/ErdRelation/ErdParseResult` | PASS |
| 6 | §2.1 전처리 (semicolon split, 주석) | PASS |
| 7 | §2.2 CREATE TABLE/INDEX/ALTER 분류 | PASS |
| 8 | §2.3 FOREIGN KEY 파싱 | PASS |
| 9 | §2.3 PRIMARY KEY (composite) | PASS |
| 10 | **§2.3 table-level UNIQUE(<cols>)** | **PARTIAL** — 코드 `parseColumnDef():173-175` "skip for now" 명시 |
| 11~15 | §2.4 컬럼 파싱 (NOT NULL / UNIQUE / DEFAULT / CHECK 중첩 / 주석) | PASS |
| 16~18 | §5 CLI (file / stdin / JSON output) | PASS |
| 19~25 | §6 엣지케이스 (CHECK 중첩, 멀티라인, INDEX, unknown, 한글 주석) | PASS |

### 2.2 MINOR (1건)

**MINOR-1: Table-level `UNIQUE(<cols>)` 스킵**
- Design §2.3: "UNIQUE (<cols>) → 복합 UNIQUE 처리"
- 코드 (`erd-parser.ts:173-175`): `return null; // handled separately if needed; skip for now`
- 테스트 커버리지 없음
- PoC 스코프로는 허용 수준이나 Design 명시를 위반

### 2.3 테스트 수치 검증

- 커밋 / SPEC: "50/50 tests PASS"
- 실제 `erd-parser.test.ts`: **15 `it()` 블록** (26 `expect`)
- 50건은 유사 워크스페이스 합산 (테이블 수 × 관계 수 × 기타)

### 2.4 KPI 검증

| KPI | 목표 | 실제 | 상태 |
|---|:-:|:-:|:-:|
| 추출 테이블 | ≥ 5 | 7 (인라인 DDL fixture) | PASS |
| 추출 관계 | ≥ 10 | 10 | PASS (경계) |
| Vitest green | pass | 15/15 | PASS |
| typecheck 0 | 0 | 0 | PASS |

### 2.5 MINOR-2: 테스트 fixture scope 편차

- Plan §KPI: "LPON `0001_init.sql` 기반"
- Design §5 CLI 예시: `반제품-스펙/pilot-lpon-cancel/working-version/migrations/0001_init.sql`
- 실제 테스트: **인라인 DDL 문자열** 사용 (`erd-parser.test.ts:6-97`, ~95줄)
- 사유 (타당): Workers-typed 패키지라 `node:fs` 사용 불가
- 영향: 실 파일 기반 E2E 미커버. 스크립트 `scripts/erwin-extract/index.ts` (stdin/file I/O)는 별도 테스트 없음

### 2.6 Added features (Design 외, 엔지니어링 개선)

- `splitStatements()`: SQL 문자열(`'` `"`) 인식 세미콜론 분리
- `splitByTopLevelComma()`: 괄호·문자열 인식 톱레벨 콤마 분리
- `stripLeadingComments()`: 파일 헤더 `--` 주석 제거
- `normalizeBodyComments()`: trailing `-- comment`가 컬럼별로 유지되도록 재정렬

→ 실 DDL에서 파서가 견고히 동작하도록 하는 합당한 추가 기능

---

## 3. PRD Must Have 기여도 매트릭스

| PRD §4.1 Must Have | Batch 2 기여 | 달성률 |
|---|---|:-:|
| M-1 FX-SPEC v1.1 | — (Sprint 211에서 FX-SPEC-003로 이행) | 0% (scope out) |
| **M-2 Java/Spring AST 파서** | Sprint 212 — regex CLI (Tree-sitter 아님) | **~60%** |
| **M-3 Source-First Reconciliation** | Sprint 212 — 3 markers + paramCount | **~75%** |
| **M-4 ERWin ERD 경로 A** | Sprint 213 — DDL → entity/relation | **~90%** |
| M-5 Track A 6서비스 Fill | — (Sprint 214a/b/c) | 0% |
| M-6 Track B 결제 E2E | — (Sprint 215) | 0% |
| M-7 Working Prototype 하네스 | — (Sprint 216) | 0% |
| M-8 `/callback/{job-id}` 루프 | — (Sprint 211 FX-SPEC-003) | 0% |

**Batch 2 누적 달성**: Phase 2 Must Have 8건 중 ~2.25건 (≈ 28%) — 6-sprint Phase 2에서 2-sprint 배치로 on-plan

### PRD MVP 최소 기준 (§5.2)

| Criterion | Status after Batch 2 |
|---|:-:|
| [x] FX-SPEC v1.1 | ✅ (Sprint 211, FX-SPEC-003로 대체) |
| [ ] Track A ≥ 4/6 완결성 95% | 미착수 |
| [ ] Track B E2E Working Prototype | 미착수 |
| [x] **ERWin ERD 경로 1개 PoC** | ✅ (Sprint 213) |
| [~] **Source-First Reconciliation 1서비스 감사 로그** | 부분 — 3종 마커 엔진 존재, LPON 결제 실 감사 로그 미실행 |

---

## 4. E2E Audit (Phase 6b)

### 4.1 Scope 판정

Sprint 212/213 변경 파일 전수 (30 files):
- `packages/types/` (타입)
- `packages/utils/` (reconcile, erd-parser, 테스트)
- `scripts/java-ast/` (offline CLI)
- `scripts/erwin-extract/` (offline CLI)
- `docs/01-plan`, `docs/02-design`, `docs/03-report`, `.sprint-context`

**`apps/app-web/` 또는 `services/*/src/routes/` 변경 0건 확인.**

### 4.2 라우트 커버리지

- 등록 라우트: 변경 없음 (Phase 1 기존 10+ 페이지 유지)
- E2E spec: 10개 (admin/auth/deliver/extract/functional/organization/poc-spec/rbac/upload/verify) — Sprint 212/213 영향 없음
- 미커버: **해당 없음** — 신규 라우트 0건

### 4.3 기능 커버리지

- 신규 UI 기능: 0건
- 신규 API 엔드포인트: 0건
- 감사 대상 아님

### 4.4 품질 Anti-pattern

Sprint 212/213이 E2E spec을 수정/추가한 바 없으므로 감사 대상 아님.

### 4.5 결론

**E2E Audit = N/A (out of scope for Batch 2)**

향후 Sprint 214b (결제 서비스 Fill) + Sprint 215 (Track B Handoff E2E) 시점에 신규 라우트/UI가 추가되면 재감사 필요.

---

## 5. Cross-Cutting 관찰

### 5.1 커밋 메시지 자가보고 과신

두 Sprint 모두 "Match Rate 100%" 자가 보고. 독립 검증 결과:
- Sprint 212: 2 FAIL (MyBatis parser, requiredParams DIVERGENCE) + LOW 구조 편차
- Sprint 213: 1 PARTIAL (table-level UNIQUE)

autopilot 자가평가 체크리스트의 **Design 항목별 상호 검증이 결여**됨. 테스트 통과 = 100%로 단순 계산하는 경향.

### 5.2 svc-ingestion Java 파서 고아화

Phase 1 잔재 (`services/svc-ingestion/src/parsing/java-controller.ts`, `java-service.ts`, `java-datamodel.ts`)는 미참조 상태로 남음. Sprint 212 CLI가 재구현 → drift 위험. 추후 `packages/utils/src/java-parsing/`으로 통합 이관 권장.

### 5.3 CLI 통합 테스트 부재

`scripts/java-ast/` + `scripts/erwin-extract/` 디렉토리에 테스트 전무. argv/stdin/file I/O 미검증. PoC 단계라 허용되나 Phase 3 production 전환 전 보강 필수.

### 5.4 실 파일 E2E 미커버 (erd-parser)

`0001_init.sql` 실 파일 경로는 Design/Plan에 명시되었으나 테스트는 인라인 DDL만 사용. Node 환경 별도 테스트로 보강 필요.

---

## 6. 권장사항

### 6.1 즉시 iterate 대상 (Batch 3 착수 전, 0.5~1h)

1. **Sprint 212 touch-up (0.5h)** — `requiredParams` DIVERGENCE 분기 + 1 테스트 추가. FAIL-2 해소. → Match 92%로 복귀
2. **PRD §4.1 M-2 갱신** — regex CLI 결정을 PRD에 반영하거나, Tree-sitter 업그레이드를 `AIF-REQ-{신규}` Phase 3 스코프로 등록. 현재 PRD↔Code silent drift 해소

### 6.2 Phase 7 백로그 (비차단)

3. **`parseMyBatisMapper` 구현** — Sprint 214b 착수 시점에 자연 가시화. TD 등록
4. **Java 파서 공유 추출** — svc-ingestion 파서 → `packages/utils/` 이관, CLI/Worker 공용화
5. **Table-level `UNIQUE(cols)`** — Sprint 213 보정, 저빈도이나 Design 일치
6. **CLI 통합 테스트** — `scripts/java-ast`, `scripts/erwin-extract` smoke 테스트
7. **erd-parser 실파일 E2E** — `0001_init.sql` Node 환경 테스트

### 6.3 Iterate 불필요

Batch 2 combined Match **91% ≥ 90%** 임계값 상회. 잔여 gap은 (a) Sprint 214/217 자연 흡수 가능, (b) PRD 문서 drift (코드 iterate로 해결 불가). → **`/pdca iterate decode-x-phase-2-batch2` NOT recommended**.

---

## 7. Phase 7 Gap Fix 판정

| 기준 | 결과 |
|---|:-:|
| Batch 2 Match ≥ 90% | ✅ (91%) |
| Sprint별 개별 Match ≥ 90% | ⚠️ 212=87% < 90% |
| E2E HIGH gap 존재 | ❌ N/A (scope out) |

**Phase 7 판정**: Sprint 212만 **선택적 touch-up**. 0.5h 내 requiredParams 보정으로 92%로 끌어올릴 수 있어요. Batch 2 전체는 Pass로 종결하고 Batch 3(214a/b/c) 진행 가능.

---

## 8. 다음 액션 제안

| 옵션 | 내용 | 소요 |
|---|---|:-:|
| A | Sprint 212 touch-up 즉시 → Match 92% → Phase 8 session-end | 0.5h |
| B | Phase 7 skip → Batch 3 착수 (Sprint 214a/b/c 3병렬) | 0h |
| C | PRD §4.1 M-2 갱신 + TD 등록 → Batch 3 착수 | 0.25h |

---

## 9. 검증 참조 파일 (절대 경로)

- `/home/sinclair/work/axbd/Decode-X/docs/02-design/features/sprint-212.design.md`
- `/home/sinclair/work/axbd/Decode-X/docs/02-design/features/sprint-213.design.md`
- `/home/sinclair/work/axbd/Decode-X/docs/req-interview/decode-x-v1.3-phase-2/prd-final.md`
- `/home/sinclair/work/axbd/Decode-X/packages/types/src/reconcile.ts`
- `/home/sinclair/work/axbd/Decode-X/packages/utils/src/reconcile.ts`
- `/home/sinclair/work/axbd/Decode-X/packages/utils/src/__tests__/reconcile.test.ts`
- `/home/sinclair/work/axbd/Decode-X/packages/utils/src/erd-parser.ts`
- `/home/sinclair/work/axbd/Decode-X/packages/utils/src/erd-parser.test.ts`
- `/home/sinclair/work/axbd/Decode-X/scripts/java-ast/src/{index,runner,types}.ts`
- `/home/sinclair/work/axbd/Decode-X/scripts/erwin-extract/index.ts`
