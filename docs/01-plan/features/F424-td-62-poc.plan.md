---
id: AIF-PLAN-055
title: "F424 — TD-62 web-tree-sitter Workers polyfill PoC"
sprint: 256
f_items: [F424]
req: AIF-REQ-035
td: [TD-62, TD-28]
status: PLANNED
created: "2026-05-05"
author: "Master (session 268)"
---

# F424 — TD-62 web-tree-sitter Workers polyfill PoC

## Background

Sprint 255 F358 Phase 2 PR #50 자가보고 Match=100% / CI green / unit test PASS이었으나, **Cloudflare deploy validation에서 reject** (API code 10021):

```
node_modules/web-tree-sitter@0.26.8/lib/web-tree-sitter.js:1527-1528
await import("module"); var require = createRequire(import.meta.url)
```

Workers ESBuild bundle 시 `import.meta.url` undefined → `createRequire(undefined)` throw → cold-start fail. revert 결정 후 main 정합성 회복(commit `9fc024d`).

**autopilot Production Smoke Test 13회차 정확 재현**:
- autopilot 자체 마크 100%, CI all green, unit test 7/7 PASS
- production deploy validation 단계 미수행 → 결함 미인지
- Cloudflare deploy validation이 1차 방어선으로 reject → production downtime 0 유지
- 그러나 F358 Phase 2 진입 차단 상태 지속

**근본 원인 추정**:
- emscripten 자동 생성 ESM 출력은 Node.js fallback 가정 (`createRequire(import.meta.url)`)
- Workers ESM bundle에서 `import.meta.url`는 build-time에 정의되지 않거나 `undefined`
- `compatibility_flags=["nodejs_compat"]` (== nodejs_compat_v2)도 미해결 — 이는 `node:*` 모듈 polyfill이지 `import.meta.url` 정의는 아님

## Objective

Sprint 256은 PoC 단계. 본 Sprint의 DoD:

| # | DoD 항목 | 검증 방법 |
|---|---------|----------|
| (a) | 우회 패턴 3종 시도 결과 reports/td-62-poc-{date}.md 산출 | 파일 존재 + 패턴별 시도 결과 + 최종 권고 |
| (b) | 1개 이상 패턴이 PASS인 경우: `wrangler dev` 단독 import + parse 1건 PASS | local Workers 부팅 + Java HelloController parse 1건 AST 추출 확인 |
| (c) | `wrangler deploy --dry-run` 또는 staging deploy validation PASS | Cloudflare API 응답 확인 |
| (d) | SPEC §8 TD-62 본문에 PoC 결과 + Phase 2 재시도 GO/NO-GO 권고 추기 | SPEC.md commit 확인 |
| (e) | 모든 패턴 fail인 경우: emscripten output fork 권고 + 추정 작업량 명시 | reports에 fork 경로 + ~2 Sprint 추정 |
| (f) | Match Rate ≥ 90% (Plan vs 실 산출) | gap-detector |
| (g) | typecheck/lint 전체 PASS | pnpm typecheck && pnpm lint |
| (h) | F424 status DONE 마킹 + TD-62 status 갱신 (✅ resolved 또는 🟡 partial) | SPEC §6 + §8 |

**중요**: Sprint 256 = PoC만. F358 Phase 2 본 작업 재시도는 Sprint 257+에서 별도 진행. PoC 결과로 Phase 2 재시도 GO/NO-GO 판정만 산출.

## Scope

### In Scope (Sprint 256)
- 우회 패턴 3종 PoC (A/B/C) 시도 + 검증
- packages/utils/src/java-parsing/ 격리 PoC 디렉토리 (`scripts/poc/td-62/` 또는 `packages/utils/src/poc/`)
- wrangler dev 단독 import 부팅 검증 + Java parse 1건
- staging deploy validation 1차 호출
- TD-62 PoC 리포트 + 권고

### Out of Scope (Sprint 257+ 이관)
- F358 Phase 2 본 PR #50 코드 패턴 재이전 (Sprint 257)
- multi-path / Map<K,V> generic 처리 추가
- LPON 전수 production 재추출 (Phase 3, Sprint 258+)
- DIVERGENCE 5건 재실측, TD-24 마커 해소
- F356-A AI-Ready 수기 검증

## PoC 우회 패턴 3종

| 옵션 | 설명 | 시도 순서 | Stop condition |
|------|------|-----------|---------------|
| **A** | **wrangler [build].command + esbuild --define:import.meta.url stub** | 1차 시도 | wrangler dev 부팅 PASS 시 (b) 검증 후 종료 |
| **B** | **package.json alias로 cjs entry 강제 사용** (`web-tree-sitter/web-tree-sitter.cjs` import) | A fail 시 2차 | wrangler dev 부팅 PASS 시 (b) 검증 후 종료 |
| **C** | **patch-package — `lib/web-tree-sitter.js:1527` 라인 직접 patch** (`createRequire(import.meta.url)` → `() => undefined`) | A+B fail 시 3차 | wrangler dev 부팅 PASS 시 (b) 검증 후 종료. fragile 명시 |
| **D** (fallback) | 모든 패턴 fail → emscripten output fork 권고 + Sprint 257 ~2주 추정 | reports에 권고 작성 후 종료 | (e) DoD 충족 |

### 옵션 A — esbuild --define stub

```toml
# wrangler.toml
[build]
command = "esbuild src/index.ts --bundle --define:import.meta.url='\\\"file:///worker.js\\\"' --outfile=dist/index.js"
```

- **장점**: 빌드 타임 처리, runtime 영향 없음
- **단점**: wrangler 자체 binding 통합(D1/R2/Queue/Service Binding)이 [build] custom command와 깨질 수 있음
- **검증**: wrangler dev에서 D1 binding 1회 호출 + parse 1건 양립 확인 필수

### 옵션 B — package.json cjs alias

```json
{
  "imports": {
    "web-tree-sitter": {
      "workerd": "./node_modules/web-tree-sitter/web-tree-sitter.cjs",
      "default": "web-tree-sitter"
    }
  }
}
```

- **장점**: cjs entry는 `createRequire(import.meta.url)` 미사용, 표준 패턴
- **단점**: web-tree-sitter@0.26.8 cjs export 존재 여부 사전 확인 필요. ESM 전환 트렌드 역행
- **검증**: `node -e "console.log(require('web-tree-sitter/web-tree-sitter.cjs'))"` 로 cjs entry 존재 확인

### 옵션 C — patch-package 직접 patch

```bash
# patches/web-tree-sitter+0.26.8.patch
- await import("module"); var require = createRequire(import.meta.url);
+ var require = () => { throw new Error("Workers: Node.js fallback not available"); };
```

- **장점**: 라인 1개 수정, 즉효
- **단점**: emscripten 출력 fragile, web-tree-sitter 버전 업그레이드 시마다 재patch
- **검증**: patch 적용 후 wrangler dev 부팅 + parse 1건 + 다른 web-tree-sitter API 정상 동작 확인

## Sprint Steps (5 steps)

### Step 1 — PoC 환경 준비 (~30min)

- `scripts/poc/td-62/` 디렉토리 생성
- `scripts/poc/td-62/wrangler.toml` 신설 (단독 Workers, D1/R2 binding 없이 minimal)
- `scripts/poc/td-62/src/index.ts` web-tree-sitter import + parse 1건 호출 (Java HelloController 인라인)
- `scripts/poc/td-62/package.json` 또는 root `pnpm install web-tree-sitter@0.26.8` (이미 설치됨 — Sprint 255 PR #50 lockfile 잔존)

### Step 2 — 옵션 A 시도 (~1h)

- wrangler.toml `[build].command` + esbuild --define
- `wrangler dev` 부팅 시도 → fail 또는 PASS
- PASS 시: parse 1건 검증 → Step 4로 점프
- fail 시: 정확한 에러 로그 reports에 기록 → Step 3

### Step 3 — 옵션 B/C 시도 (~2h)

- 옵션 B (~1h): package.json `imports` cjs alias + cjs entry 존재 검증 + wrangler dev
- 옵션 C (~1h): patch-package + 라인 patch + wrangler dev
- PASS 시: parse 1건 검증 → Step 4
- 모두 fail 시: 옵션 D 권고로 Step 5 진입

### Step 4 — Production deploy validation (~1h)

- `wrangler deploy --dry-run` 또는 staging deploy 시도
- Cloudflare API 응답 확인 (10021 reject 재현 여부)
- PASS 시: PoC GO 판정 + Phase 2 재시도 권고
- fail 시: deploy 단계 재진단 (다른 에러 코드 또는 같은 10021)

### Step 5 — 리포트 작성 + SPEC 갱신 (~30min)

- `reports/td-62-poc-2026-05-{05~06}.md` — 패턴별 시도 결과 + 최종 권고 + Phase 2 재시도 GO/NO-GO
- SPEC.md §8 TD-62 본문에 PoC 결과 추기 + status 갱신
- SPEC.md §6 F424 status DONE 마킹
- typecheck/lint PASS 확인 + commit + push

## Risks (R)

| ID | Risk | Mitigation |
|----|------|-----------|
| R1 | wrangler [build].command이 wrangler binding 통합과 충돌 (옵션 A 한계) | 옵션 A fail 시 옵션 B/C로 즉시 전환. PoC 단계라 fallback 명시되어 있음 |
| R2 | web-tree-sitter@0.26.8 cjs entry 미존재 (옵션 B 차단) | `package.json` files 필드 확인 후 진입. cjs 미존재 시 옵션 B 즉시 skip |
| R3 | patch-package 적용 후 web-tree-sitter 다른 API (Parser.init, Language.load) 회귀 | 옵션 C 검증 시 parse + Language.load 양쪽 확인. 회귀 시 옵션 D 권고 |
| R4 | 모든 옵션 fail 가능성 (worst case) | 옵션 D 권고를 DoD (e)에 명시적 포함. PoC 결과 = NEGATIVE도 valid 산출물 |
| R5 | autopilot이 wrangler dev 환경 디버깅 미숙으로 false negative 판정 | Step 2/3에서 PASS 검증을 명확한 stdout 패턴(parse 결과 JSON 출력)으로 정의 |
| R6 | `wrangler deploy --dry-run`이 cold-start fail 미감지 (deploy validation은 별도) | Step 4에서 `--dry-run` 외에 staging deploy 시도 (reject 시 deploy validation 작동 확인) |

## Cost / Performance

- **Time**: ~5h (Step 1 30min + Step 2 1h + Step 3 2h + Step 4 1h + Step 5 30min)
- **LLM cost**: $0 (PoC는 LLM 호출 없음)
- **Network**: web-tree-sitter@0.26.8 npm download(이미 lockfile 잔존), wrangler dev local 부팅, Cloudflare staging deploy 1회

## Validation

### autopilot Production Smoke Test 13회차 패턴 회피
- DoD (b)와 (c) 분리: (b) wrangler dev 부팅 = local 검증, (c) staging deploy = production validation
- 단계별 stop condition 명시로 autopilot이 false PASS 마크 회피
- (e) NEGATIVE 결과도 valid DoD 충족 명시 → autopilot이 무리한 PASS 마크 회피

### Phase 2 재시도 진입 조건 (Sprint 257)
- DoD (b) + (c) 모두 PASS인 경우만
- DoD (e) NEGATIVE 결과인 경우 Sprint 257은 emscripten output fork (~2주) 또는 F358 무기한 보류

## References

- 회귀 commit: `eb1eda7` (PR #50 MERGED) → `9fc024d` (revert)
- Sprint 255 PDCA: `docs/01-plan/features/F358-phase-2.plan.md` (AIF-PLAN-054)
- TD-62 등록: SPEC.md §8 (세션 267)
- Cloudflare deploy validation 1차 방어 사례: rules/development-workflow.md "Autopilot Production Smoke Test"
- web-tree-sitter 0.26.8 source: `node_modules/web-tree-sitter/lib/web-tree-sitter.js:1527-1528`
