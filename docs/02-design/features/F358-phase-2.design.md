---
id: AIF-DSGN-054
title: "F358 Phase 2 Design — Tree-sitter Java parser production 통합 설계"
sprint: 255
f_items: [F358, F361]
req: AIF-REQ-035
plan: AIF-PLAN-054
td: [TD-26, TD-28]
status: Active
created: "2026-05-05"
author: "Master (session 267, post-merge retroactive)"
retroactive: true
retroactive_reason: "Sprint 255 autopilot이 코드 구현은 완결했으나 PDCA Design/Analysis/Report 3건 미작성. PR #50 MERGED 후 Master inline 작성."
---

# F358 Phase 2 — Tree-sitter Java parser production 통합 설계

## §1 개요

Sprint 254 PoC(Phase 1)에서 검증된 Tree-sitter Java 파서를 production svc-ingestion에 통합한다. Phase 1의 `scripts/java-ast/src/poc-tree-sitter.ts` AST 추출 로직을 `packages/utils/src/java-parsing/` 공용 모듈로 이전하고, 기존 regex 기반 `services/svc-ingestion/src/parsing/java-controller.ts`의 내부 구현을 Tree-sitter 호출로 교체한다.

## §2 모듈 분할 전략

### 2.1 packages/utils/src/java-parsing/ (공용 모듈, F361 흡수)

| 파일 | 역할 | 환경 |
|------|------|------|
| `loader.ts` | Tree-sitter `Parser`/`Language` 초기화 + parser singleton 캐시 | Node.js + Workers 양립 |
| `loader-workers.ts` | Workers 전용 wrapper. wrangler `[[rules]] type="Data"`로 import한 .wasm bytes를 `loader.ts`에 전달 | Workers only |
| `extractor.ts` | AST 추출 본체. PoC `extractClasses()` 이전 + multi-path/Map<K,V>/`element_value_array_initializer` 처리 추가 | 공통 |
| `types.ts` | `ClassInfo`, `Endpoint`, `FieldInfo`, `Annotation` 타입 | 공통 |
| `index.ts` | barrel export (`extractClasses`, `getJavaParser`, `initJavaParser`) | 공통 |

**Vitest 호환성**: `loader-workers.ts`만 .wasm을 import하므로 테스트 환경에서는 `loader.ts` 직접 사용 + `vi.mock(loader-workers)`로 우회.

### 2.2 packages/utils/wasm/ (바이너리)

| 파일 | 크기 | 출처 |
|------|------|------|
| `tree-sitter-java.wasm` | 414,641 B (405KB) | npm `tree-sitter-java@0.23.5` |
| `web-tree-sitter.wasm` | 196,763 B (192KB) | npm `web-tree-sitter@0.26.8` |

git tracked binary로 commit (CI/배포에서 reliable 참조).

### 2.3 services/svc-ingestion 통합

| 파일 | 변경 |
|------|------|
| `src/index.ts` | top-level `await initJavaParserWorkers()` — Workers cold-start 1회 init |
| `src/parsing/java-controller.ts` | regex (288줄) → `getJavaParser()` + `extractClasses()` 호출 (50줄) |
| `wrangler.toml` | `[[rules]] globs=["**/*.wasm"] type="Data"` (top-level only — staging/production env에 별도 등록 불요, top-level inheritance) |

## §3 WASM 번들 결정 — Plan 명시 `CompiledWasm` → 실제 `Data`

| 옵션 | 동작 | Tree-sitter 호환성 |
|------|------|------------------|
| `type="CompiledWasm"` | wrangler가 WASM을 자동 컴파일하여 `WebAssembly.Module` 반환 | ❌ Tree-sitter `Language.load(Uint8Array)`는 raw bytes 필요 |
| **`type="Data"`** ✅ | wrangler가 .wasm을 ArrayBuffer로 import 처리 | ✅ `new Uint8Array(buf)`로 `Language.load()` 호출 가능 |

Plan(AIF-PLAN-054)이 명시한 `CompiledWasm`은 부정확한 가정. 구현 단계에서 `Data`로 정정. 향후 wrangler API 변경 시 재평가.

## §4 Cold-start init 전략

```ts
// services/svc-ingestion/src/index.ts (top-level)
import { initJavaParserWorkers } from "@ai-foundry/utils/java-parsing/loader-workers";

await initJavaParserWorkers();  // top-level await — Workers 처음 요청 진입 전 1회 init
```

- Workers는 module-level top-level await를 cold-start 시 평가
- `_parser` singleton 변수는 module scope에 보존 → 재호출 시 즉시 반환
- 호출부(`zip-extractor.ts:221`의 `parseJavaController()`)는 동기처럼 `getJavaParser()` 호출만 하면 됨

## §5 호출부 호환성 — `parseJavaController()` 외부 API 시그니처 유지

```ts
// 기존 시그니처 보존
export function parseJavaController(source: string, filename: string): CodeController | null
export function isController(content: string): boolean
```

내부 구현만 Tree-sitter로 변경. zip-extractor.ts:221 호출부는 무수정.

## §6 multi-path / Map<K,V> 처리 — `element_value_array_initializer`

### 6.1 multi-path `@PostMapping({"/a","/b"})`
PoC는 string_literal + element_value_pair만 처리. Phase 2에서 `element_value_array_initializer` 노드 처리 추가 — 배열 안의 모든 string_literal을 path로 추출하여 endpoint를 N건 emit.

### 6.2 method={GET,POST} 다중 HTTP method
`@RequestMapping(method={RequestMethod.GET, RequestMethod.POST})` — `methods: ["GET", "POST"]` 배열로 추출.

### 6.3 Map<K,V> generic 보존
PoC `getReturnType()`에서 `generic_type` 노드의 `text`를 그대로 반환 → `Map<String, List<Foo>>` 등 nested generic 자연 보존.

## §7 Test 전략

| 테스트 | 위치 | 케이스 수 |
|--------|------|----------|
| packages/utils java-parsing | `packages/utils/src/__tests__/java-parsing.test.ts` | 6건 (loader init/parser singleton/extractClasses 기본 동작) |
| svc-ingestion java-controller | `services/svc-ingestion/src/__tests__/java-controller.test.ts` | 10건 (LPON CommonController + multi-path + Map<K,V> + basePath 정확 추출 등) |
| svc-ingestion routes | `services/svc-ingestion/src/__tests__/routes.test.ts` | 기존 + `vi.mock("loader-workers")` 추가 (WASM ESM 회피) |

## §8 위험 + 대응 (구현 후 회고)

| 위험 | 대응 결과 |
|------|---------|
| ESBuild가 web-tree-sitter runtime WASM 자동 처리 못 함 | `[[rules]] type="Data"`로 양 wasm 파일 모두 ArrayBuffer 처리 → loader-workers.ts에서 `wasmBinary` 옵션 전달 |
| 호출부 동기 → Tree-sitter init 비동기 | top-level await + module singleton으로 해결. cold-start 후엔 `getJavaParser()`이 동기 |
| Vitest WASM ESM import 실패 | `vi.mock(loader-workers)` + `loader.ts` 직접 사용. PoC도 `Parser.init({locateFile})` 패턴으로 호환 |
| F361 외 java-service.ts/java-datamodel.ts/mybatis-mapper.ts 잔존 regex | Sprint 256 후속 (P3, scope 폭주 방지) |

## §9 참조

- AIF-PLAN-054 (`docs/01-plan/features/F358-phase-2.plan.md`)
- AIF-PLAN-053 (Sprint 254 Phase 1 Plan)
- AIF-DSGN-053 (Sprint 254 Phase 1 Design)
- PoC 산출물: `scripts/java-ast/src/poc-tree-sitter.ts`, `reports/f358-poc-tree-sitter-2026-05-04.json`
- PR #50 (`eb1eda7`)
