---
code: AIF-ANLS-027
title: E2E Test Audit Report
version: 1.0
status: Active
category: Analysis
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# AIF-ANLS-027: E2E Test Audit Report

## Executive Summary

| 항목 | 값 |
|------|---|
| 테스트 프레임워크 | Playwright 1.59, Chromium headless |
| 백엔드 연결 | Staging (`ai-foundry.minu.best`) via Vite proxy |
| 인증 방식 | Demo login + storageState 재사용 |
| 총 Spec 파일 | 8 (setup 1 + test 7) |
| 총 테스트 | 41 + 1 setup |
| 총 코드 라인 | 470 |
| 실행 시간 | ~21초 |
| 통과율 | **100%** (41/41) |
| 라우트 커버리지 | **100%** (25/25) |
| Match Rate | **100%** |

## 실행 결과

| 지표 | 값 |
|------|---|
| 총 tests | 41 |
| Passed | 41 (100%) |
| Failed | 0 |
| Skipped | 0 |
| Flaky | 0 |
| 실행 시간 | 21.1s |

## 라우트 커버리지 매트릭스

| 라우트 | E2E Spec | 커버 유형 | 테스트 깊이 |
|--------|----------|----------|-----------|
| `/login` | auth.spec.ts | ✅ 직접 | Functional (렌더링 + 로그인 + 로그아웃) |
| `/` | extract.spec.ts, auth.spec.ts, functional.spec.ts | ✅ 직접 | Functional (네비게이션 + 통계 카드 데이터 검증) |
| `/upload` | extract.spec.ts, functional.spec.ts | ✅ 직접 | Functional (파일선택 버튼 + 검색 입력 + 통계) |
| `/source-upload` | extract.spec.ts | ✅ 직접 | Smoke |
| `/analysis` | extract.spec.ts | ✅ 직접 | Smoke |
| `/analysis-report` | extract.spec.ts | ✅ 직접 | Smoke |
| `/hitl` | verify.spec.ts, functional.spec.ts | ✅ 직접 | Functional (정책 목록 로딩 + 선택) |
| `/fact-check` | verify.spec.ts, rbac.spec.ts | ✅ 직접 | Functional (RBAC 역할별 검증) |
| `/gap-analysis` | verify.spec.ts | ✅ 직접 | Smoke |
| `/trust` | verify.spec.ts | ✅ 직접 | Smoke |
| `/skills` | deliver.spec.ts, functional.spec.ts | ✅ 직접 | Functional (검색 필터 + 품질 버튼) |
| `/skills/:id` | deliver.spec.ts | ✅ 간접 | Navigation (카탈로그 → 클릭) |
| `/specs` | deliver.spec.ts | ✅ 직접 | Smoke |
| `/specs/:id` | deliver.spec.ts | ✅ 간접 | Navigation (카탈로그 → 클릭) |
| `/export` | deliver.spec.ts | ✅ 직접 | Smoke |
| `/api-console` | deliver.spec.ts | ✅ 직접 | Smoke |
| `/agent-console` | admin.spec.ts | ✅ 직접 | Smoke |
| `/mockup` | admin.spec.ts | ✅ 직접 | Smoke |
| `/poc-report` | admin.spec.ts | ✅ 직접 | Smoke |
| `/ontology` | admin.spec.ts | ✅ 직접 | Smoke |
| `/benchmark` | admin.spec.ts | ✅ 직접 | Smoke |
| `/audit` | admin.spec.ts | ✅ 직접 | Smoke |
| `/settings` | admin.spec.ts | ✅ 직접 | Smoke |
| `/guide` | admin.spec.ts | ✅ 직접 | Smoke |
| `*` (404) | admin.spec.ts | ✅ 직접 | Smoke |

### 커버리지 요약
- 직접 커버: 23 / 25 (92%)
- 간접 커버 (네비게이션): 2 / 25 (8%)
- 미커버: 0
- **총 커버리지: 25/25 (100%)**

## Redirect 검증

| Redirect | E2E 검증 | 비고 |
|----------|---------|------|
| 미인증 → `/login` | ✅ auth.spec.ts | `ProtectedRoute` → `<Navigate to="/login">` |

- 등록 redirect: 1건
- E2E 검증: 1건 (100%)

## 테스트 깊이 분석

| 깊이 | 테스트 수 | 비율 |
|------|----------|------|
| Smoke (h1 heading 확인) | 19 | 46% |
| Functional (상호작용 포함) | 22 | 54% |

### Functional 테스트 상세

| Spec | 테스트 | 검증 내용 |
|------|-------|----------|
| auth.spec.ts | 4 | 미인증 redirect, 로그인 flow, 로그아웃 |
| functional.spec.ts | 8 | Dashboard Quick Action 네비게이션, 통계 카드 데이터 로딩(`\d+(건\|개)`), 최근활동/알림 섹션, Upload 파일선택+검색, HITL 정책 선택, Skill 검색 필터+품질 버튼 |
| rbac.spec.ts | 4 | Reviewer: Review Actions 표시, Analyst: Review Actions 미표시, 사이드바 사용자명/역할 |
| deliver.spec.ts | 2 | Skill/Spec detail 카탈로그 → 클릭 네비게이션 |

## 품질 이슈

| Anti-pattern | 건수 | 파일 | 심각도 | 평가 |
|-------------|------|------|--------|------|
| `waitForTimeout` | 5 | functional.spec.ts (1), rbac.spec.ts (4) | ⚠️ 낮음 | 검색 debounce 대기 + gap 클릭 후 렌더링 대기. 짧은 500ms이므로 flaky 위험 낮음 |
| API-only E2E | 0 | — | ✅ | |
| 약한 assertion | 0 | — | ✅ | |
| 허용범위 assertion | 2 | deliver.spec.ts | ⚠️ 낮음 | `toContain("/skills/")` — 동적 ID이므로 정당한 사용 |
| fixture 중복 | 0 | — | ✅ | |

## RBAC 커버리지

| 역할 | 테스트 | 검증 항목 |
|------|-------|----------|
| Executive (admin-001) | auth + smoke 전체 | 기본 인증, 모든 페이지 접근 |
| Reviewer (reviewer-001) | rbac.spec.ts | fact-check Review Actions 표시 확인 |
| Analyst (analyst-001) | rbac.spec.ts | fact-check Review Actions 미표시 + 사이드바 정보 |
| Developer (developer-001) | rbac.spec.ts | 사이드바 사용자명/역할 표시 |
| Client | ❌ 미테스트 | 해당 역할 데모 사용자 없음 |

## 발견된 버그 (수정 완료)

| 버그 | 원인 | 수정 |
|------|------|------|
| `/api-console` 빈 페이지 | vite.config.ts `proxy["/api"]`가 `/api-console` 프론트엔드 라우트까지 staging으로 프록시 | `"/api"` → `"/api/"` 로 수정 (trailing slash) |

## 권장사항

| 우선순위 | 항목 | 상태 |
|---------|------|------|
| ~~P1~~ | `/specs/:id` 동적 라우트 커버 | ✅ 완료 |
| ~~P2~~ | Dashboard/Upload/HITL/Skill Functional 업그레이드 | ✅ 완료 |
| ~~P3~~ | RBAC 역할별 테스트 | ✅ 완료 |
| ~~P4~~ | Dashboard 통계 카드 데이터 검증 | ✅ 완료 |
| P5 | `waitForTimeout` → `waitForResponse` 또는 `waitForSelector`로 대체 | 미착수 |
| P6 | CI 통합: GitHub Actions에 E2E job 추가 (`bun run test:e2e`) | 미착수 |
| P7 | 파일 업로드 E2E: 실제 테스트 파일 드래그&드롭 + 파싱 완료 확인 | 미착수 |
| P8 | 다중 Organization 전환 E2E: Miraeasset ↔ LPON 전환 시 데이터 갱신 확인 | 미착수 |

## 파일 구조

```
apps/app-web/
├── playwright.config.ts     # Chromium, staging proxy, storageState
├── e2e/
│   ├── .auth/user.json      # storageState (gitignored)
│   ├── auth.setup.ts        # 데모 로그인 → storageState 저장
│   ├── auth.spec.ts         # 인증 4건
│   ├── extract.spec.ts      # Extract 그룹 5건
│   ├── verify.spec.ts       # Verify 그룹 4건
│   ├── deliver.spec.ts      # Deliver 그룹 7건
│   ├── admin.spec.ts        # Experience + Admin + 404 10건
│   ├── functional.spec.ts   # Functional 8건 (P2+P4)
│   └── rbac.spec.ts         # RBAC 역할별 4건 (P3)
└── package.json             # test:e2e, test:e2e:ui 스크립트
```

## 실행 방법

```bash
cd apps/app-web

# 전체 E2E 실행 (staging 연결)
bun run test:e2e

# UI 모드 (디버깅)
bun run test:e2e:ui

# 특정 spec만
DEV_PROXY=remote npx playwright test e2e/auth.spec.ts

# 결과 리포트
npx playwright show-report
```
