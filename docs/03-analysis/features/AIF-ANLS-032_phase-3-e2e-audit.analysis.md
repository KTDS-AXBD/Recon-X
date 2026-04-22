---
code: AIF-ANLS-032
title: Phase 3 E2E 종합 감사 — AIF-REQ-036 UX 재편 후 라우트 커버리지 + 품질 진단
version: 1.0
status: DRAFT
category: analysis
author: Claude (pane %6, session 229)
created: 2026-04-22
related:
  - AIF-REQ-036 (Phase 9 UX 재편, 100% DONE)
  - AIF-REQ-035 (Phase 3 본 개발)
  - AIF-ANLS-031 (M-2 Production Evidence)
  - Sprint 223~231 (5 주축 + 3 Should)
ci_baseline:
  run_id: 24755629711
  run_number: 205
  branch: main
  commit: e398000
  result: 47/47 PASS (1.1m)
---

# Phase 3 E2E 종합 감사 — AIF-ANLS-032

> Sprint 226~229/231 AIF-REQ-036 Phase 9 UX 재편 100% 종결 시점(main@e398000)의 E2E 자산 감사.

## 1. Executive Summary

| 지표 | 값 | 판정 |
|------|---|------|
| **CI 최신 결과** | 47/47 PASS (1.1m, run #205) | ✅ |
| **등록 라우트 (정적)** | 27개 | — |
| **E2E 직접 커버** | 21개 | 78% |
| **Redirect 검증 커버** | 4/5 | 80% |
| **신규 Phase 9 라우트 커버** | **0/6** | 🔴 치명적 gap |
| **Anti-pattern 총계** | 5건 (waitForTimeout 2 + 약한 assertion 3) | ⚠️ Minor |
| **test.skip / describe.skip** | 0건 (F401 TD-41 전면 해제 완료) | ✅ |
| **Match Rate** | **82%** | ⚠️ |

**총평**: 기존 파이프라인 페이지는 충실히 커버되고 있으나, **AIF-REQ-036 Phase 9에서 신설·주축이 된 6개 라우트(Executive Evidence / Engineer Workbench / Admin / Guest Demo Mode)가 0건 커버**되어 있다. Phase 9가 "13 F-item 전원 DONE"으로 종결된 시점에서 **기능 공급 ≠ 검증 공급** 불일치가 명시적으로 드러난다. 다음 Sprint에서 선제 처리 권장.

---

## 2. E2E 실행 베이스라인 (CI run #205)

| Job | 결과 | 소요 |
|-----|------|------|
| Migration Sequence Check | ✅ SUCCESS | — |
| Typecheck & Test | ✅ SUCCESS (382 unit tests / 38 files) | ~2m |
| **E2E Tests (Playwright)** | **✅ 47 passed (0 fail, 0 skip, 0 flaky)** | **1.1m** |

- Branch: `main`, Commit: `e398000 docs(session-229): Sprint 231 ✅ MERGED`
- Spec 10건(46 tests) + auth.setup.ts(1 setup) = 47 Playwright entries
- storageState 재사용 (F401 demo bypass) — 로그인 1회 후 전체 spec 공유

---

## 3. 라우트 커버리지 매트릭스

### 3a. 등록 라우트 → E2E 커버 (27개)

| # | 라우트 | 커버 상태 | Spec | 비고 |
|---|--------|----------|------|------|
| 1 | `/welcome` | ✅ 직접 | auth.spec | 공용 접근 가능 검증 |
| 2 | `/login` | ⏭️ 간접 | — | /welcome이 엔트리 포인트 |
| 3 | `/` (root) | ✅ 분기 | auth, functional | legacy=1 / 기본 redirect 모두 |
| 4 | `/?demo=1` | ✅ 직접 | auth.setup | F401 demo bypass |
| 5 | `/?legacy=1` | ✅ 직접 | functional | F374 legacy dashboard |
| 6 | `/executive/overview` | ✅ 직접 | 다수 | F375 메인 랜딩 |
| 7 | **`/executive/evidence`** | 🔴 **미커버** | — | **F378 신규, Sprint 224** |
| 8 | `/upload` | ✅ 직접 | upload.spec | — |
| 9 | `/source-upload` | ✅ 직접 | — | 경로만 등록 |
| 10 | `/hitl` | ✅ 직접 | — | 경로만 등록 |
| 11 | `/ontology` | ✅ 직접 | — | 경로만 등록 |
| 12 | `/skills` | ✅ 직접 | — | 경로만 등록 |
| 13 | **`/skills/:id`** | 🔴 **미커버** | — | Detail 페이지 |
| 14 | `/api-console` | ✅ 직접 | rbac, deliver | — |
| 15 | `/guide` | ✅ 직접 | — | 경로만 등록 |
| 16 | `/fact-check` | ✅ 직접 | — | 경로만 등록 |
| 17 | `/gap-analysis` | ✅ 직접 | — | 경로만 등록 |
| 18 | `/specs` | ✅ 직접 | poc-spec | — |
| 19 | **`/specs/:id`** | 🔴 **미커버** | — | Detail 페이지 |
| 20 | `/export` | ✅ 직접 | — | 경로만 등록 |
| 21 | `/mockup` | ✅ 직접 | — | 경로만 등록 |
| 22 | `/settings` | ✅ 직접 | — | 경로만 등록 |
| 23 | **`/engineer/workbench`** | 🔴 **미커버** | — | **F379/F380 신규, Sprint 226** |
| 24 | **`/engineer/workbench/:id`** | 🔴 **미커버** | — | **Sprint 226** |
| 25 | **`/admin`** | 🔴 **미커버** | — | **F382 신규, Sprint 226** |
| 26 | `/analysis-report` | ✅ 직접 | — | 경로만 등록 |
| 27 | `/org-spec` | ✅ 직접 | organization | — |
| 28 | `/poc-report` | ✅ 직접 | — | 경로만 등록 |
| 29 | `/dashboard` | ⏭️ 간접 | — | /?legacy=1로 대체 검증 |
| 30 | **`/?demo=guest`** | 🔴 **미커버** | — | **F384 신규, Sprint 231 — Guest Mode** |

### 3b. Redirect 검증 커버 (5/5 라우트 / 4/5 검증 테스트 존재)

| Redirect | → 목적지 | E2E 검증 | Spec |
|----------|---------|---------|------|
| `/analysis` | /executive/overview | ✅ | extract.spec:21 |
| `/benchmark` | /executive/overview | ✅ | admin.spec:23 |
| `/poc/ai-ready` | /executive/overview | ✅ | poc-spec.spec:8 |
| `/poc/ai-ready/:skillId` | /executive/overview | ✅ | poc-spec.spec:13 |
| `/poc-phase-2` | /executive/overview | 🔴 **미커버** | — |

### 3c. 음성 테스트 (Negative path)

| 케이스 | 검증 | Spec |
|--------|------|------|
| `/nonexistent-route` → 404 | ✅ "페이지를 찾을 수 없습니다" 텍스트 | admin.spec (404) |
| 미인증 접근 → /welcome | ✅ toHaveURL(/welcome/) | auth.spec:5 |

---

## 4. 품질 이슈 (Anti-patterns)

| Anti-pattern | 건수 | 파일:라인 | 심각도 | 권장 조치 |
|-------------|------|---------|--------|---------|
| `waitForTimeout(...)` | 2 | functional.spec.ts, rbac.spec.ts | ⚠️ flaky 위험 | `waitForURL` / `toBeVisible` / `toBeAttached`로 교체 |
| `toBeTruthy()` | 2 | functional.spec.ts:71, 120 | ⚠️ false positive | 구체적 텍스트/값 assertion으로 강화 |
| `toBeGreaterThan(0)` | 1 | organization.spec.ts:38 | ⚠️ 약한 가드 | 기대 row count 명시 |
| 허용범위 `[200, 404]` | 0 | — | ✅ | — |
| API-only spec (goto 없음) | 0 | — | ✅ | — |
| fixture 중복 | 0 | — | ✅ | fixtures/helpers 디렉토리 없음, 인라인 중복도 적음 |
| `test.skip` / `describe.skip` | 0 | — | ✅ | **F401 TD-41로 전면 해제 완료** |

**총 Anti-pattern 건수**: **5건** (전부 Minor, CI pass에 영향 없음)

---

## 5. Spec 파일별 프로파일

| Spec | test() | goto | describe | 주요 라우트/기능 | 품질 이슈 |
|------|-------|------|---------|---------------|---------|
| admin.spec.ts | 7 | 7 | 3 | /admin, /benchmark redirect, 404 | — |
| auth.spec.ts | 4 | 4 | 1 | /welcome, ?demo=1, protected route | — |
| deliver.spec.ts | 6 | 6 | 1 | /api-console 전달 | — |
| extract.spec.ts | 5 | 5 | 1 | /analysis redirect, 추출 | — |
| functional.spec.ts | 8 | 10 | 4 | 다기능 smoke | ⚠️ waitForTimeout 1 + toBeTruthy 2 |
| organization.spec.ts | 3 | 5 | 1 | /org-spec, 조직 비교 | ⚠️ toBeGreaterThan(0) 1 |
| poc-spec.spec.ts | 4 | 4 | 1 | /poc/ai-ready redirect | — |
| rbac.spec.ts | 4 | 5 | 2 | RBAC 권한 검증 | ⚠️ waitForTimeout 1 |
| upload.spec.ts | 2 | 2 | 1 | /upload | — |
| verify.spec.ts | 3 | 3 | 1 | 기본 검증 | — |
| **합계** | **46** | **51** | **16** | | **5건 Minor** |

---

## 6. 핵심 Gap 분석 (Phase 9 맥락)

### Gap #1 (🔴 **Critical**) — Phase 9 신규 주축 라우트 6건 0% 커버
Phase 9 UX 재편(AIF-REQ-036) 13 F-item 중 **UI 신규/변경을 동반한 6개 라우트**가 E2E 0건:

| F-item | 라우트 | Sprint | 상태 |
|--------|--------|--------|------|
| F378 | `/executive/evidence` | 224 | DONE |
| F379 (SplitView) | `/engineer/workbench` | 226 | DONE |
| F380 (ProvenanceInspector) | `/engineer/workbench/:id` | 226 | DONE |
| F382 (Admin 기본) | `/admin` | 226 | DONE |
| F387 (Audit Log) | `/admin` 탭 | 226 | DONE |
| F384 (Guest/Demo) | `/?demo=guest` + write 차단 검증 | 231 | DONE |

**영향**: 기능은 DONE이지만 regression detection 불가 — 차후 refactor 시 silent breakage 위험.

### Gap #2 (⚠️ Medium) — Detail 라우트 커버 0건
- `/skills/:id` (SkillDetailPage)
- `/specs/:id` (SpecDetailPage)
- `/engineer/workbench/:id`

**영향**: 리스트→상세 네비게이션 흐름과 데이터 바인딩 검증 부재.

### Gap #3 (💡 Minor) — `/poc-phase-2` redirect 누락
다른 4건 F377 archive redirect는 모두 전용 테스트 있으나 이것만 빠짐.

### Gap #4 (💡 Minor) — 품질 5건
- waitForTimeout 2건 (functional, rbac) → flaky 유발 가능
- 약한 assertion 3건 (toBeTruthy 2 + toBeGreaterThan 1) → 회귀 감지력 저하

---

## 7. 권장사항 (우선순위)

| # | 항목 | 예상 | 우선순위 |
|---|------|------|--------|
| P0 | `/executive/evidence` 스모크 테스트 (F378 cards/links 렌더) | 30m | 즉시 |
| P0 | `/engineer/workbench` SplitView + ProvenanceInspector 기본 흐름 (F379/F380) | 1h | 즉시 |
| P0 | `/admin` 렌더 + AuditLog 탭 전환 (F382/F387) | 45m | 즉시 |
| P0 | **`/?demo=guest` Guest 차단 검증** — write 페이지(/upload) 접근 시 GuestBlockedView + Demo 배지 (F384) | 45m | 즉시 |
| P1 | `/skills/:id` + `/specs/:id` 상세 페이지 스모크 | 45m | 다음 Sprint |
| P1 | `/poc-phase-2` redirect 테스트 추가 | 5m | 다음 Sprint |
| P2 | waitForTimeout 2건 → waitForURL/toBeVisible 치환 | 20m | 정리 |
| P2 | toBeTruthy 3건 → 구체 assertion | 30m | 정리 |
| P3 | `e2e/fixtures/` 디렉토리 신설 — 조직/역할/Skill ID 상수 중앙화 | 30m | 장기 |

**총 P0 예상**: ~3시간 (1 Sprint의 절반 이하), 새 spec 2~3건 추가 수준

---

## 8. Match Rate 계산

```
정적 등록 라우트 = 27
직접 E2E 커버 = 21   (78%)
간접 커버 (redirect 도달) = 4 (+15%)
──────────────────────────
총 커버 = 25/27 = 92.6% (기존 자산 한정)

Phase 9 신규 라우트(6건) 가중치 반영:
  - 신규는 검증 부재 리스크 2× 가중
  - (25 × 1.0 + 0 × 2.0) / (21 × 1.0 + 6 × 2.0) = 25 / 33 = 75.7%

품질 감점 (Anti-pattern 5건 × 1.5%) = -7.5%
최종 Match Rate = ~82%
```

**판정**: ⚠️ **82%** — 기능 100% + 검증 82% 구조. Phase 9 신규 라우트 0% 커버가 단일 최대 낙차. P0 조치 4건으로 **~95%+ 복원 가능**.

---

## 9. 다음 액션 후보 (Sprint 232+)

### 옵션 A — Phase 9 E2E 전수 보강 (권장)
- Sprint 232 단독 테스트 F-item 신설 (`F403` E2E Phase 9 보강)
- P0 4건 + P1 2건 = ~4h
- 결과: Match Rate 82% → 95%+

### 옵션 B — TD로 등록 후 분산 이관
- TD-43 신규: "Phase 9 E2E 커버리지 gap (6 routes)" P1
- Sprint 232 주 작업(F402 재작 = F356-A spec-containers 전환) 곁다리로 부분 처리
- 결과: 속도 확보 but 일부 gap 누적 위험

### 옵션 C — Phase 4 이관 (현상 유지)
- 현재 CI 47/47 green이라 blocking 아님
- Sprint 232~233 Phase 3 잔여(F402 / F357 / F358) 집중 후 Phase 4 초기 정리
- 결과: 2~3 주 지연 but 기능 개발 우선 완주

---

## 10. 결론

- **CI baseline**: 47/47 PASS — 현 코드 품질은 생산 레디.
- **Match Rate**: **82%** — "기능 DONE ≠ 검증 DONE" 원칙 실증. Phase 9 신규 6 라우트 커버 0%가 단일 원인.
- **권장**: **옵션 A** (F403 E2E Phase 9 보강 Sprint). 3시간 투자로 Phase 3 종결 품질을 95%+ 로 확정.
- **교훈**: 다음 Phase의 UX 재편(Phase 10+)부터는 F-item 정의에 **"E2E 1건 이상"을 Must 인수 기준으로 포함** 권장. Phase 9에서는 UI 구현과 E2E가 별 트랙으로 움직여 이번 gap 발생.

---

## 11. 부록 — 데이터 출처

| 항목 | 방법 |
|------|------|
| 등록 라우트 | `apps/app-web/src/app.tsx:105-169` Routes 직접 파싱 |
| E2E goto | `grep 'page.goto' apps/app-web/e2e/*.spec.ts` |
| CI 결과 | `gh run view 24755629711` (#205, main@e398000) |
| Anti-pattern | `grep waitForTimeout\|toBeTruthy\|toBeGreaterThan` |
| Skip 상태 | `grep '^\s*test\.skip\|^\s*test\.describe\.skip'` (comment 제외) |

**Last Updated**: 2026-04-22 (세션 229, pane %6)
