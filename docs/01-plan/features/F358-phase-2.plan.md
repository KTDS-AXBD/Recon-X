---
id: AIF-PLAN-054
title: "F358 Phase 2 — Tree-sitter Java 파서 production 통합 (+ F361 shared module)"
sprint: 257
f_items: [F358, F361]
req: AIF-REQ-035
td: [TD-26, TD-28]
status: PLANNED
created: "2026-05-04"
revised: "2026-05-05"
author: "Master (session 269, Sprint 257 retry)"
related: [AIF-PLAN-055]
---

> **Sprint 257 재시도 — Sprint 256 F424 (TD-62 PoC) 결과 반영판.** Sprint 255 PR #50은 production deploy validation FAILED (Cloudflare API code 10021)로 revert됨. 본 Plan은 동일 코드 베이스에 Sprint 256에서 확정된 **CJS alias + 2-patch + CompiledWasm + instantiateWasm hook** 4-step 우회 패턴을 추가 적용한다. 상세 패턴: `reports/td-62-poc-2026-05-05.md` §4 + AIF-PLAN-055.

# F358 Phase 2 — Tree-sitter Java 파서 production 통합

## Background

Sprint 254 (Phase 1 PoC, AIF-PLAN-053) 결과:
- WASM 호환성 **PASS** (grammar 405KB + runtime 192KB = 597KB / Workers 128MB의 0.46%)
- 평균 parse 1.22ms / file (Workers CPU 10ms/req의 12.2%, 58× margin)
- regex CLI 대비 **17건 silent drift 검출** (base_path_missing×2 + path_incomplete×7 + return_type_generic_loss×7 + mapper_skipped×1)
- Phase 2 권고: **GO**

TD-28 근본 원인 확정: `services/svc-ingestion/src/parsing/java-controller.ts:57` `basePath: ""` 미결합 + regex `\S+` return type pattern → generic 손실 + interface @Mapper skip.

Phase 2는 PoC 코드를 **production 통합**하는 단계:
1. PoC `extractClasses()` AST 로직을 공용 패키지로 이전 (**F361 자연 흡수, TD-26 해소**)
2. svc-ingestion `java-controller.ts` (regex) → Tree-sitter 호출로 교체
3. Workers 환경에서 WASM 실 번들 + 실 환경 E2E 검증
4. multi-path / Map<K,V> generics 등 추가 케이스 처리

## Objective

본 Sprint의 DoD:
- (a) `packages/utils/src/java-parsing/` 공용 모듈 신설 (F361 ✅)
- (b) `services/svc-ingestion/src/parsing/java-controller.ts` Tree-sitter 호출로 내부 교체 (외부 API `parseJavaController()` 시그니처 유지)
- (c) `services/svc-ingestion/wrangler.toml` `[[rules]]` WASM 번들링 추가 (3 env: default/staging/production)
- (d) `wrangler dev` 환경 + production deploy 양쪽 WASM 로드 + parse 실 E2E 1건 PASS
- (e) PoC 5 샘플 silent drift **17 → 0** 회귀 검증
- (f) 신규 case 처리: multi-path `@PostMapping({"/a","/b"})` + Map<K,V> generic
- (g) unit test ≥10건 PASS (기존 7 + 신규 3 이상)
- (h) typecheck/lint/test 전체 PASS, Match Rate ≥90%

Phase 3 (Sprint 256 후속): LPON 전수 production 재추출 + DIVERGENCE 5건 (TD-24) 재실측 + F356-A 수기 검증 통합.

## Scope

### In Scope (Sprint 255)
- packages/utils/src/java-parsing/ 신설 (loader + extractor + types)
- WASM 파일 위치 결정 + ESBuild + wrangler `[[rules]]` 번들 패턴
- svc-ingestion java-controller.ts 내부 구현 교체
- multi-path + Map<K,V> 처리 추가
- unit test 확장 + Workers E2E 1건
- F361 status DONE 마킹

### Out of Scope (Sprint 256 이관)
- LPON 전수 production 재추출
- DIVERGENCE 5건 재실측
- F356-A 수기 검증 결합
- TD-24 마커 해소
- Tree-sitter 다른 언어(Python/TypeScript) 확장

## WASM 번들 전략 결정

| 옵션 | 설명 | 채택 |
|------|------|------|
| **A. wrangler `[[rules]]` + ESBuild import** | `globs=["**/*.wasm"]` `type="CompiledWasm"` + 코드에서 `import javaWasm from "./tree-sitter-java.wasm"` | ✅ **채택** — 표준, wrangler 자동 번들 |
| B. `[wasm_modules]` 명시 매핑 | legacy, deprecated 권장 안 함 | ❌ |
| C. R2/KV fetch + Language.load | cold start 페널티 + 인프라 종속 | ❌ |

**runtime WASM 처리** (Sprint 256 F424 PoC 결과 갱신): Sprint 255는 `wrangler.toml [[rules]] type="Data"`로 했으나 Workers `WebAssembly.instantiate(bytes)` 런타임 컴파일 금지로 미작동. **확정 패턴**: `[[rules]] type="CompiledWasm" globs=["**/*.wasm"] fallthrough=true` + 코드에서 wasm import 후 `Parser.init({ instantiateWasm })` hook으로 pre-compiled `WebAssembly.Module` 전달.

## PoC 패턴 적용 (Sprint 256 F424 결과)

Sprint 256(F424)에서 확정한 4-step CF Workers 호환성 패턴을 본 Sprint 코드에 추가 적용한다. 미적용 시 Sprint 255 패턴 재현 (Cloudflare API code 10021 → revert).

### Step P1 — `patch-package` 도입 (CJS 패치)

```bash
cd packages/utils
pnpm add web-tree-sitter@0.26.8 patch-package
# package.json
"scripts": { "postinstall": "patch-package" }
```

`patches/web-tree-sitter+0.26.8.patch` 생성 (2개 라인):

```diff
# Patch 1: ENVIRONMENT_IS_NODE — CF Workers nodejs_compat은 process.versions.node 노출하지만 __dirname 미정의
- var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
+ var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer" && typeof __dirname !== "undefined";

# Patch 2: ENVIRONMENT_IS_WORKER — CF Workers self.location undefined
-   _scriptName = self.location.href;
+   _scriptName = (typeof self !== "undefined" && self.location) ? self.location.href : void 0;
```

### Step P2 — `wrangler.toml [alias]` CJS entry 강제

`services/svc-ingestion/wrangler.toml` 3 env 모두에 추가:

```toml
[alias]
"web-tree-sitter" = "./node_modules/web-tree-sitter/web-tree-sitter.cjs"

[[rules]]
type = "CompiledWasm"
globs = ["**/*.wasm"]
fallthrough = true  # default rule 충돌 경고 회피
```

### Step P3 — `instantiateWasm` hook으로 Parser.init 우회

`packages/utils/src/java-parsing/loader-workers.ts`:

```ts
// @ts-expect-error — wrangler [[rules]] type=CompiledWasm 빌드타임 변환, TS 타입 없음
import runtimeWasm from "../../wasm/web-tree-sitter.wasm";
// @ts-expect-error
import javaWasm from "../../wasm/tree-sitter-java.wasm";

let cachedParser: Parser | null = null;

export async function getJavaParser(): Promise<Parser> {
  if (cachedParser) return cachedParser;
  await Parser.init({
    instantiateWasm(imports, receive) {
      // CF Workers 안전: WebAssembly.instantiate(Module, imports) — instantiation only
      WebAssembly.instantiate(runtimeWasm as WebAssembly.Module, imports)
        .then((instance) => receive(instance, runtimeWasm as WebAssembly.Module));
    },
  } as unknown as EmscriptenModule);
  const parser = new Parser();
  const lang = await Language.load(javaWasm as WebAssembly.Module);
  parser.setLanguage(lang);
  cachedParser = parser;
  return parser;
}
```

### Step P4 — `wrangler dev` + `--dry-run` 사전 검증 (필수)

```bash
cd services/svc-ingestion
wrangler dev --local       # 200 OK 확인 (Cloudflare API code 10021 미발생)
wrangler deploy --dry-run  # 번들 사이즈 + Cloudflare validation 통과 확인
```

**autopilot Production Smoke Test 14회차 회피**: 본 검증 PASS 없이 PR 생성 금지. unit test PASS만으로는 production deploy validation 보장 안 됨 (Sprint 255 13회차 재현).

## Sprint Steps (8 steps)

### Step 1 — packages/utils/src/java-parsing/ 신설
- `tree-sitter-loader.ts`: Workers/Node 양립 WASM 로더 (top-level `let cachedParser` + lazy init)
- `extractor.ts`: PoC `extractClasses()` 이전 + multi-path/Map<K,V> 추가
- `types.ts`: ClassInfo, Endpoint, Annotation, FieldInfo (PoC types 이전)
- `index.ts`: barrel export
- WASM 파일 복사: `packages/utils/wasm/tree-sitter-java.wasm` (405KB)

### Step 2 — svc-ingestion java-controller.ts 내부 교체
- 기존 regex 함수 (RE_REQUEST_MAPPING_CLASS / RE_GET_MAPPING 등) 삭제
- 외부 API `parseJavaController(source, filename): CodeController | null` 시그니처 유지
- 내부에서 `@ai-foundry/utils/java-parsing` `extractClasses()` 호출 → kind="controller" + className 매칭 → CodeController 매핑
- `isController(content)`도 Tree-sitter 사용 (annotations에 RestController/Controller 있는지)

### Step 3 — wrangler.toml WASM 번들 설정
- 3 env (top-level + staging + production) 모두에 `[[rules]]` `globs=["**/*.wasm"]` `type="CompiledWasm"` 추가
- `package.json` workspace dependency: `@ai-foundry/utils`가 wasm 파일 export 가능하도록

### Step 4 — multi-path / Map<K,V> 처리 추가
- `@PostMapping({"/a","/b"})` → `array_initializer` 노드 처리, 각 path마다 endpoint 1건씩 emit
- `Map<String, List<Foo>>` → `extractFieldInfo()`/`getReturnType()` `generic_type` 재귀 처리

### Step 5 — unit test 확장
- 기존 `services/svc-ingestion/src/__tests__/java-controller.test.ts` 7건 — Tree-sitter 결과로 expected 갱신 (`basePath` 정확값 + endpoint full path)
- 신규 케이스 3건+: multi-path, Map<K,V>, @Mapper interface
- packages/utils 자체 테스트: `packages/utils/src/__tests__/java-parsing.test.ts` 신규

### Step 6 — Workers 실 환경 E2E
- `wrangler dev`로 svc-ingestion 띄움 → 샘플 Java 파일 R2 upload → parse 결과 D1 검증
- production deploy 후 동일 검증 1건

### Step 7 — Silent Drift 회귀 검증
- PoC 5 sample 재실행 (`scripts/java-ast/src/poc-tree-sitter.ts`) → diff count 17 → 0 확인
- 또는 svc-ingestion test 안에서 PoC 샘플 5건 직접 검증

### Step 8 — F361 + TD-26 마킹
- SPEC.md F361 [ ] → [x]
- §8 TD-26 해소 마킹 (취소선 + 세션번호)
- §8 TD-28 부분 해소 (Phase 2 까지) — Phase 3 완전 해소

## DoD

- [ ] `packages/utils/src/java-parsing/` 5 file (loader + loader-workers + extractor + types + index)
- [ ] WASM 파일 `packages/utils/wasm/{web-tree-sitter.wasm, tree-sitter-java.wasm}` 위치 + workspace export
- [ ] `patches/web-tree-sitter+0.26.8.patch` 2-line 패치 + `package.json postinstall: patch-package`
- [ ] `services/svc-ingestion/src/parsing/java-controller.ts` Tree-sitter 호출 (외부 시그니처 유지)
- [ ] `services/svc-ingestion/wrangler.toml` 3 env: `[alias]` + `[[rules]] type="CompiledWasm" fallthrough=true`
- [ ] **`wrangler dev` 로컬 부팅 200 OK + Cloudflare API code 10021 미발생** (Sprint 255 패턴 회피)
- [ ] **`wrangler deploy --dry-run` PASS** (번들 사이즈 ≤ 1MB, validation 통과)
- [ ] PoC 5 sample silent drift 0건 회귀 검증
- [ ] multi-path + Map<K,V> 신규 케이스 PASS
- [ ] unit test ≥10건 PASS (기존 7 + 신규 3 이상)
- [ ] Workers E2E (wrangler dev + production deploy) 각 1건 PASS
- [ ] typecheck 14/14 + lint 9/9 + test 전 통과
- [ ] Match Rate ≥90%
- [ ] F361 status DONE
- [ ] TD-26 해소 마킹 + TD-28 부분 해소 (Phase 3 완전 해소)

## Risks

| 위험 | 대응 |
|------|------|
| Workers ESBuild가 web-tree-sitter runtime WASM (npm 내부) 자동 처리 못 할 가능성 | locateFile 함수에서 직접 import 한 wasm 모듈 url 반환 시도 → 실패 시 R2 fetch 패턴 fallback |
| `parseJavaController()` 호출부(zip-extractor.ts:221) 동기 → Tree-sitter init이 비동기 | 모듈 top-level await로 Parser singleton 캐시 + 호출 시점 await 또는 sync 보장 패턴 검토 |
| WASM 콜드 스타트 + worker 메모리 사용량 | 실측 결과 Phase 1 1.22ms parse + 597KB / 부담 없음 |
| 기존 java-controller 7 unit test expected 갱신 시 회귀 가능성 | snapshot 패턴으로 PoC 결과 기준 expected 재생성 |
| F361 외 java-service.ts / java-datamodel.ts / mybatis-mapper.ts도 정리해야 하는가 | Sprint 255 In Scope: java-controller.ts만. 나머지는 Sprint 256 또는 후속 (scope 폭주 방지) |

## Out-of-scope (Sprint 256 이관)

- LPON 전수 production 재추출 + DIVERGENCE 마커 5건 재검증
- F356-A 수기 검증 결합
- TD-24 완전 해소
- java-service.ts / java-datamodel.ts / mybatis-mapper.ts 의 Tree-sitter 전환 (P3, 후속)

## 참조

- AIF-PLAN-053 / AIF-DSGN-053 / AIF-ANLS-053 / AIF-RPRT-053 (Sprint 254 Phase 1 PoC)
- AIF-PLAN-055 / AIF-DSGN-055 / AIF-ANLS-055 / AIF-RPRT-055 (Sprint 256 F424 TD-62 PoC)
- `reports/td-62-poc-2026-05-05.md` §4 (확정 우회 패턴) + §5 (적용 순서 7-step)
- `scripts/java-ast/src/poc-tree-sitter.ts` (PoC 구현)
- `reports/f358-poc-tree-sitter-2026-05-04.json` (PoC 산출물)
- AIF-REQ-035 PRD: `docs/req-interview/decode-x-v1.3-phase-3/prd-final.md`
- 회피 패턴 (재발 방지): rules/development-workflow.md "Autopilot Production Smoke Test"
