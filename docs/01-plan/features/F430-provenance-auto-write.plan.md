---
id: AIF-PLAN-061
title: "F430 — provenance.yaml auto-write (detector 결과 → spec-container 표준 위치 정착)"
sprint: 263
f_items: [F430]
req: AIF-REQ-035
related_features: [F354, F426, F427, F428, F429]
status: PLANNED
created: "2026-05-06"
author: "Master (session 275, Sprint 263)"
related: [AIF-PLAN-060]
---

# F430 — provenance.yaml auto-write

## Background

Sprint 259~262에서 BL-level divergence detector를 5종 → **12종**으로 확장하고 multi-domain coverage **31.6%** (12/38 BL)에 도달. detector 결과는 현재 `reports/sprint-NNN-*.json`에만 누적되며, spec-container 표준 위치인 **`provenance.yaml`로 자동 반영되지 않음**.

**현 상태 진단**:

- 7 spec-containers 중 **`lpon-refund` 1개만** `divergenceMarkers:` 섹션 보유 (5 markers, 모두 `status: OPEN`).
- 나머지 6개 (lpon-budget/charge/gift/payment/purchase/settlement)는 `sources` + `inputCompleteness`만 있고 `divergenceMarkers:` 섹션 자체가 부재.
- `crossCheck()` 함수가 권고를 산출하지만 **read-only** — yaml write는 사용자 수동 작업.

**가치**:

- 신뢰도 70~85%의 12종 detector 결과를 운영 게이트로 승격 (F354 자동화 5/5 완성 + Sprint 262 보편 패턴의 실 활용).
- F354 BL-024 등 manual-curated DIVERGENCE markers 5건이 코드 변경(F359 등)으로 RESOLVED 됐는지 자동 동기화.
- 6개 빈 provenance.yaml에 신규 ABSENCE markers append 능력 → spec-container 운영 메타데이터 균질화.

## Objective

본 Sprint의 DoD:

- (a) `packages/utils/src/divergence/provenance-writer.ts` 신규 — string-based YAML 패치 (js-yaml 의존 없이, 기존 `provenance-cross-check.ts` 정규식 패턴 일관 유지).
- (b) 핵심 함수 3종:
  - `updateMarkerStatus(yamlText, ruleId, newStatus)` — 기존 `divergenceMarkers[].status` 전환 (OPEN → RESOLVED).
  - `appendDivergenceMarker(yamlText, marker)` — 신규 ABSENCE marker append (섹션 부재 시 신설).
  - `recomputeDivergenceSummary(yamlText)` — `divergenceSummary.totalMarkers` + `bySeverity` 자동 재계산.
- (c) `scripts/divergence/write-provenance.ts` CLI 신규 — `--dry-run` (default) / `--apply` 옵션, 7 containers 일괄 처리.
- (d) **결정 사항 반영** (세션 275 사용자 인터뷰):
  - **Apply 안전**: dry-run 기본 + `--apply` opt-in (CI 안전 + 검토 워크플로우 보존).
  - **신규 markers 정책**: severity=`MEDIUM` default + recommendation=`TODO: manual review (auto-detected by F430 Sprint 263)` template.
  - **PRESENCE 처리**: 기존 OPEN markers의 status 전환만 (별도 섹션 없음, reports에는 그대로 보존).
- (e) 단위 테스트 ≥10건:
  - status 전환 (OPEN → RESOLVED, idempotent)
  - append 신규 (섹션 부재, 섹션 존재)
  - severity default + recommendation template
  - divergenceSummary 재계산 (단일/복수)
  - YAML 들여쓰기 + 주석 보존
- (f) 7 containers `--dry-run` 실측 + lpon-refund `--apply` 1회 git diff 검증.
- (g) `reports/sprint-263-provenance-writer-2026-05-06.{json,md}` 실파일.
- (h) Match Rate ≥ 90% + typecheck/lint/test (utils 패키지) 130+/130+ PASS.

## Scope

### In Scope
- `provenance-writer.ts` 라이브러리 (string-based YAML 변형 3 함수).
- `write-provenance.ts` CLI (multi-domain dry-run + apply).
- 단위 테스트 + 합성 fixture (lpon-refund snapshot 활용).
- 7 spec-containers `provenance.yaml` 실측 + 1개 apply.
- SPEC.md §5/§6/§8 갱신 + reports.

### Out of Scope
- js-yaml 의존성 추가 (string-based 일관 유지).
- PRESENCE 자동 입증을 별도 섹션으로 추가 (사용자 결정으로 reject — reports에 보존).
- `divergenceMarkers[].sourceReference.lines` 정확한 line range 추정 (detector marker.sourceLine 단일 필드만 기록).
- spec-container 외 위치 (R2 published skill packages) provenance 갱신 (별도 Sprint 후보).

## Implementation Plan

### Task 1: Library — `provenance-writer.ts`
- `updateMarkerStatus()` — `divergenceMarkers:` 섹션 안에서 `ruleId: <X>` 블록을 찾아 같은 블록 내 `status: <Y>`를 정규식 치환. idempotent (이미 RESOLVED면 no-op).
- `appendDivergenceMarker()` — 섹션 부재 시 `divergenceSummary` 직전 위치에 새 섹션 + 헤더 주석 + marker 1건 삽입. 섹션 존재 시 마지막 marker 뒤에 append.
- `renderDivergenceMarker()` — `BLDivergenceMarker` (auto-detected) → YAML 블록 string 변환. severity=MEDIUM default, recommendation=TODO template.
- `recomputeDivergenceSummary()` — markers parse → severity 카운트 → `totalMarkers` + `bySeverity.{HIGH,MEDIUM,LOW}` 갱신.

### Task 2: CLI — `write-provenance.ts`
- `detect-bl.ts` 출력 JSON 또는 직접 detector 실행 결과 입력.
- 7 containers loop:
  1. `provenance.yaml` 읽기 → manual markers 파싱.
  2. detector 결과와 cross-check.
  3. status 전환 권고 + 신규 ABSENCE 패치 산출.
  4. `--dry-run`: unified diff 출력 + summary.
  5. `--apply`: file write + 변경 통계 출력.
- exit code: dry-run 변경 발견 시 1 (CI gate 활용 가능), apply 성공 시 0.

### Task 3: Unit tests
- `packages/utils/test/provenance-writer.test.ts` 신규.
- 케이스 매트릭스 (10+):
  1. status 전환 OPEN → RESOLVED (단일)
  2. status 전환 idempotent (이미 RESOLVED)
  3. status 전환 ruleId 미존재 (no-op)
  4. append (섹션 부재, 신규 섹션 + 헤더 주석 생성)
  5. append (섹션 존재, 마지막 marker 뒤)
  6. append severity=MEDIUM default
  7. append recommendation=TODO template
  8. recomputeDivergenceSummary 단일 (5 → 6 markers)
  9. recomputeDivergenceSummary bySeverity 갱신
  10. YAML 들여쓰기 보존 (2-space)
  11. 헤더 주석 (`# -----`) 보존

### Task 4: Verify
- `cd packages/utils && pnpm test` (130+/130+ PASS).
- `pnpm typecheck && pnpm lint`.
- `tsx scripts/divergence/write-provenance.ts --all-domains --dry-run` 실행 → diff 출력 캡처.
- `tsx scripts/divergence/write-provenance.ts --container lpon-refund --apply` 실행 → `git diff .decode-x/spec-containers/lpon-refund/provenance.yaml` 검증.
- 변경 후 `tsx scripts/divergence/detect-bl.ts --all-domains` 재실행 → cross-check 권고 0건 (idempotent 입증) 또는 1회 cycle 내 수렴.

### Task 5: Doc + Commit
- `reports/sprint-263-provenance-writer-2026-05-06.{json,md}`.
- SPEC.md §5 마지막 실측 갱신 + §6 Sprint 263 블록 + §8 TD 갱신 (해당 시).
- Conventional commit: `feat: Sprint 263 — F430 provenance.yaml auto-write (string-based YAML 패치 + dry-run/apply CLI)`.

## DoD

- ✅ `provenance-writer.ts` + 3 핵심 함수 export
- ✅ CLI dry-run 기본 + `--apply` 게이트
- ✅ 단위 테스트 ≥10건 PASS
- ✅ 7 containers dry-run 실측 + lpon-refund apply 1회
- ✅ idempotent (재실행 시 변경 0)
- ✅ Match Rate ≥ 90%
- ✅ typecheck/lint/test 전부 green

## Risk

- **R1**: 정규식 기반 YAML 변형의 fragility — 헤더 주석/들여쓰기/멀티라인 string 보존 실패 가능성. 대응: 단위 테스트 11번 (들여쓰기 보존) + 12번 (헤더 주석 보존)으로 회귀 잡기.
- **R2**: lpon-refund의 `auditEvidence`/`recommendation` 등 nested 필드 보존 실패. 대응: 블록 단위 매칭 시 `(?=\n\s*-\s+marker:|\n[a-zA-Z]|$)` lookahead로 다음 marker 또는 다음 top-level key까지만 캡처. status 치환은 같은 블록 내 첫 `status:` 한정.
- **R3**: 6 containers의 `inputCompleteness` 다음에 신규 `divergenceMarkers:` 섹션 삽입 시 위치 결정. 대응: `divergenceSummary:` 직전 또는 파일 끝 직전에 삽입 (둘 중 하나 발견되면 그 위치, 둘 다 없으면 파일 말미).

## References

- `packages/utils/src/divergence/provenance-cross-check.ts` (정규식 파싱 패턴 참고)
- `.decode-x/spec-containers/lpon-refund/provenance.yaml` (snapshot reference)
- `scripts/divergence/detect-bl.ts` (CLI 패턴 참고)
- AIF-PLAN-057~060 (Sprint 259~262 detector 시리즈)
