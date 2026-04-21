---
code: AIF-REVH-r1-package
title: AIF-REQ-036 R1 외부 AI 검토용 복붙 패키지
version: 1.0
status: Ready (R1 대상 = PRD v0.2)
category: REVIEW
system-version: 0.7.0
created: 2026-04-21
updated: 2026-04-21
author: Sinclair Seo
related:
  - docs/req-interview/decode-x-v1.3-phase-3-ux/prd-final.md
  - docs/req-interview/decode-x-v1.3-phase-3-ux/review-history.md
  - docs/03-analysis/features/provenance-coverage-2026-04-21.md
---

# R1 외부 AI 검토용 복붙 패키지 — AIF-REQ-036 (PRD v0.2)

> **사용법**: 아래 전체를 복사하여 Claude Opus / GPT-5 / Gemini 2.5 Pro 중 **2개 이상** 모델에 붙여넣으세요.
> 각 모델 응답은 `review-history.md` §R1 결과 표에 기록해요.

---

## 📋 검토 프롬프트

```
당신은 소프트웨어 제품 기획 리드 및 SI 조직 CTO 관점의 PRD 리뷰어입니다.
첨부된 PRD(v0.2 — Provenance 실측 반영본)와 실측 보고서를 다음 기준으로 100점 만점 평가해 주세요.

평가 기준:
1. 문제 정의의 구체성 (20점) — Pain Points가 숫자·사건·사용자 시나리오로 근거되는가
2. 범위 명확성 (20점) — MVP/Should/Out-of-scope 경계가 모호하지 않은가
   (특히 v0.2에서 Split View 우측 스코프 축소 결정이 타당한가)
3. 기술 접근의 타당성 (15점) — AXIS DS npm + CF Access + Feature Flag 조합이 실행 가능한가
4. 성공 지표 측정 가능성 (15점) — "본부장 3분 설득력", "Split View 클릭 수 3 이하"가 실측 가능한가
5. 일정·리소스 현실성 (15점) — 1인 3 Sprint로 MVP 완결 가능한가
6. 리스크 누락 여부 (10점) — Provenance 불완전성 외 놓친 리스크는?
   (특히 v0.2 R5 "본부장 체감 품질 저하" 대응이 충분한가)
7. 다른 REQ(특히 Phase 3 본 PRD)와의 충돌·종속성 (5점) — 명확한가

특별 관점:
- v0.1 대비 v0.2 변경점의 정당성에 중점 평가
- 변경 요지: sourceLineRange 스키마 부재(채움률 0%) 실측 → Split View 우측 = 재구성 마크다운
  section 앵커 스크롤로 축소, 원본 SI 산출물 페이지 앵커 Out-of-Scope, F364(Phase 4+) 분리,
  Ambiguity 0.10→0.08

출력 형식:
- Total Score (/100)
- 항목별 점수 + 1~2문장 근거
- Top 5 개선 제안 (우선순위 순)
- 블로커 리스크 (있는 경우)
- v0.2 변경점 정당성 평가 (PASS/FAIL + 이유)

첨부물은 아래 두 문서입니다:
1. PRD v0.2 본문
2. Provenance 실측 보고서
```

---

## 📎 첨부 #1 — PRD v0.2 본문

```markdown
# Decode-X v1.3 Phase 3 UX 재편 PRD (v0.2)

**버전**: v0.2 (Provenance 실측 반영)
**날짜**: 2026-04-21 (세션 220 작성 → 세션 221 실측 반영)
**작성자**: AX BD팀 (Sinclair Seo)
**상태**: 외부 AI 검토 대기 (R1 대상 = v0.2)

> **세션 221 Provenance 실측 결과** — `sourceLineRange` 스키마 부재(채움률 0% 확정), `pageRef` optional, `documentId` 100% 보장. MVP 스코프 축소로 "원본 소스 줄 하이라이트"와 "원본 SI 산출물 페이지 앵커"는 **Out-of-Scope**로 이동. Split View 우측은 **재구성 마크다운 section 앵커 스크롤**로 재정의. 스키마/상류 파이프라인 확장은 **F364**(Phase 4+) 분리.

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Phase 3 품질 도구와 Foundry-X Production E2E 실사례를 **본부장이 3분 내에 설득되고, 전문 엔지니어가 Spec→Source를 3클릭 내에 역추적할 수 있는** 듀얼 트랙 UX 레이어로 재편한다. AXIS Design System(조직 공용 DS)의 첫 Full 소비자로서 토큰 + React 컴포넌트 전환 + 도메인 특화 컴포넌트 기여까지 수행한다.

**배경:**
- Phase 2 본 개발 완주 (Match 95.6%, MVP 5/5, round-trip 91.7%) — 실 동작은 입증
- 그러나 **자가보고 99.7% vs 독립 검증 95.6% drift** 재발 위험 잔존. 숫자는 있으나 "한 화면에서 3분 내 설득"되는 UX 없음
- 기존 UX: 5 페르소나 혼재 + 5그룹 24페이지(Sprint 흔적 누적) + 더미 로그인(DEMO_USERS 하드코딩) + provenance UI 단일 화면 부재
- AXIS DS가 Foundry-X/Launch-X/Eval-X로 확장되기 전에 **Decode-X가 첫 소비자 레퍼런스**를 선점할 기회

**목표:**
- **True Must (P0)**:
  1. Executive View (본부장 3분 설득력) — Foundry-X 핸드오프 실사례 타임라인 중심
  2. Engineer Workbench (Split View 기반 Spec↔Source 역추적)
  3. Google OAuth (Allowlist + 역할 기반) + 5 페르소나 폐기
  4. 페이지 Archive(5) + 재설계(5) + 이관(11) 실행
- **Should (P1)**: AXIS DS Full 전환 — 토큰 + 핵심 컴포넌트 8종 교체 + 도메인 특화 컴포넌트 3종 AXIS DS 레포 기여
- **Out-of-scope**: Figma Sync, @axis-ds/prototype-kit 연동, 모바일 최적화, 외부 감사 로그인

---

## 2. 문제 정의 (Why)

### 2.1 현재 Pain Points

| Pain | 심각도 | 근거 |
|------|:------:|------|
| Spec↔원본 역추적 동선 단절 | P0 | policy/rule/skill 하나 검증에 skill-detail → source-upload → 외부 IDE 3~5 탭. TD-24(DIVERGENCE 마커) 검증 직서 성립 불가 |
| 메뉴 노이즈 (24 페이지 중 사용 빈도 낮음 다수) | P1 | benchmark/poc-ai-ready/poc-phase-2-report 등 Sprint 흔적 누적. Archive 기준 부재 |
| 페르소나→OAuth 전환 미실행 | P0 | DEMO_USERS 7명 하드코딩 + localStorage 가짜 로그인. 본부장 리뷰/외부 회람 불가 |
| 본부장 3분 설득 대시보드 없음 | P1 | 자가보고-독립검증 drift(99.7 vs 95.6) 재발 위험 |

### 2.2 Not-Do 리스크

**메뉴 비대화 관성 고착** — Sprint마다 페이지 증설을 반복하여 이미 24 페이지. Phase 3 종료 시 30+ 관측. Archive 기준이 서지 않으면 기술부채 식 누적.

### 2.3 착수 Timing

**Sprint 219부터 병행 착수** — Phase 3 품질 도구가 완성될 때 UX가 동시에 ready 상태가 되어야 본부장 리뷰 D-day에 같이 들어감.

---

## 3. 범위 (What)

### 3.1 In Scope (MVP)

#### (1) 인증 & Audience 레이어

- **Google OAuth 도입** — Cloudflare Access + Google IdP, Allowlist 기반
- **D1 `users` 테이블 신설** — `email (PK)`, `primary_role (executive|engineer|admin)`, `status`, `last_login`, `created_at`
- **기존 5 페르소나 완전 삭제** — Analyst/Reviewer/Developer/Client/Executive 라벨 UI 제거, DEMO_USERS 폐기
- **4 역할**: Executive, Engineer, Admin, Guest (비인증)
- **모드 토글** — 상단 Executive ↔ Engineer 수동 전환 (세션 범위, 재로그인 시 primary_role 복귀)

#### (2) 메뉴 구조 (모드별 사이드바)

| 모드 | 메뉴 구성 |
|------|-----------|
| **Executive** | Overview(대시보드) / Evidence(analysis-report + org-spec + poc-report) / Export |
| **Engineer** | Workbench(Skill Catalog → Split View → Provenance) / Replay(Stage 재실행) / Spec Catalog / Verify(HITL + Fact Check + Gap Analysis) / Tools(Ontology) |
| **Admin** | Users / Organization / Health / Usage Dashboard |
| **Guest** | 랜딩 1페이지만 |

#### (3) Executive View 구성

- **Foundry-X 핸드오프 실사례 타임라인** (메인 위젯)
  - 6개 서비스(예산/충전/구매/결제/환불/선물)의 Production round-trip 성공 사례를 시간순
  - 각 사례: 아이콘 + 1줄 요약 + "Engineer View에서 자세히 보기" 링크
- **Evidence 서브메뉴**: 기존 analysis-report / org-spec / poc-report를 재배치

#### (4) Engineer Workbench — Spec→Source 역추적 Split View (v0.2 재정의)

- **진입점**: Skill Catalog (필터: 도메인/서비스/상태/품질 점수)
- **Detail 화면 구성**:
  - 좌측: Spec (policy/rule/term/API) — 현재 `skill-detail.tsx` 확장
  - 우측: **재구성 마크다운 문서**(`반제품-스펙/*/*.md`) — spec-container의 `provenance.yaml` `sources[].path` 기반으로 로드, `section` 필드로 **heading 앵커 스크롤**. monospace 또는 렌더링된 마크다운 선택 가능
- **provenance 자동 해상도** — R2 + D1 + spec-container 디렉토리의 path/section을 1회 API 호출로 집약 (`GET /skills/:id/provenance/resolve` 신설)
- **그래프 탐색** — provenance 링크로 다른 Skill/Policy/Term 이동
- **Stage Replay 보조 탭** (`/workbench/replay?sourceId=...`)

> **v0.2 스코프 축소 (Provenance 실측 반영)**:
> - ❌ Out-of-Scope: 원본 소스코드 줄 하이라이트 (sourceLineRange 스키마 부재, F364 분리)
> - ❌ Out-of-Scope: 원본 SI 산출물(DOCX/PPT/Word) 페이지 앵커 (백포인터 부재, Phase 4+)
> - △ Optional: `Policy.source.pageRef` 활용은 "있으면 사용, 없으면 section 대체" 패턴 (F365 실측 시 결정)
> - ✅ In-Scope: 재구성 마크다운 section heading 앵커 스크롤, documentId 기반 네비게이션

#### (5) Archive 실행

| 행동 | 대상 페이지 | 수 |
|------|-------------|---|
| **Archive (하드 삭제)** | `analysis`, `poc-phase-2-report`, `poc-ai-ready`, `poc-ai-ready-detail`, `benchmark` | 5 |
| **재설계** | `dashboard`, `login`, `skill-detail`, `upload + source-upload 통합` | 5 |
| **Executive Evidence로 이관** | `analysis-report`, `org-spec`, `poc-report` | 3 |
| **Engineer Workbench로 이관** | `hitl`, `fact-check`, `gap-analysis`, `spec-catalog`, `spec-detail`, `ontology` | 6 |
| **Admin으로 이관** | `api-console`, `settings` | 2 |
| **공용/유지** | `export-center`, `guide`, `not-found`, `mockup`(Guest) | 4 |

Archive 방식: **하드 삭제** (`apps/app-web/src/pages/_archived/`로 git mv + 라우트 제거 + 부수 코드 해소).

#### (6) AXIS Design System 연동

- **Tier 1 (S219~S221)**: `@axis-ds/tokens` CSS variable로 주입, 기존 `styles/theme.css` 교체
- **Tier 2 (S221)**: `@axis-ds/react`로 shadcn UI 8종 교체 (Button/Card/Tabs/Dialog/Input/Select/Tooltip/Badge)
- **Tier 3 (S222 Should)**: 도메인 특화 컴포넌트 3종을 AXIS DS 레포에 기여
  - `SpecSourceSplitView` (좌 Spec / 우 Source+Doc 탭)
  - `ProvenanceInspector` (provenance 그래프 우측 drawer)
  - `StageReplayer` (Stage 1-5 단계 버튼 + 중간 결과 카드)

#### (7) Feature Flag 롤아웃

- 기존 무인증 UX를 `?legacy=1` 플래그로 잔존
- 신규 UX 기본. 관리자 스모크 후 legacy 삭제

### 3.2 Out of Scope

- Figma Sync (`@axis-ds/figma-sync`)
- @axis-ds/prototype-kit 연동 (Foundry-X 쪽 작업)
- 모바일/태블릿 최적화
- Guest/Demo 읽기 전용 데이터 모드 (S222 Should로 분리)
- 외부 감사 로그인
- **Split View 우측 원본 소스코드 줄 하이라이트** (sourceLineRange 스키마 부재, F364 분리) — v0.2 추가
- **원본 SI 산출물(DOCX/PPT) 페이지 앵커 연결** (백포인터 부재, Phase 4+) — v0.2 추가

---

## 4. Audience & Persona

| 역할 | 인증 | 기본 진입점 | 목표 사용 시나리오 |
|------|------|-------------|---------------------|
| Guest | 없음 | `/welcome` | Decode-X 소개 3줄 요약 + Google 로그인 CTA |
| Executive | Google OAuth | Executive View Overview | Foundry-X 타임라인에서 실사례 1건을 3분 내 파악 |
| Engineer | Google OAuth | Engineer Workbench | Skill 1건 → Split View → 재구성 마크다운 + section heading 포커스 도달 클릭 ≤3 |
| Admin | Google OAuth | Admin Users | OAuth allowlist CRUD + 사용 빈도 대시보드 |

---

## 5. 성공 지표 (KPI)

| KPI | 목표 | 측정 방법 |
|-----|------|-----------|
| **본부장 3분 설득력** | 동료 1명이 Foundry-X 실사례 1건을 설명 없이 3분 내 파악 | 관찰 스크립트 + 녹화 1회 (Sprint 221 완료 시) |
| **Spec→Source 역추적 클릭 수** | ≤ 3 클릭 (판정 기준: **재구성 마크다운 문서 도달 + section heading 포커스**) | E2E 스크립트 또는 수동 관찰 (임의 policy/rule/skill 10건 샘플) |

**후순위 체크리스트** (KPI 아님):
- 페이지 수 40% 감축 (24→14 이하) — Archive 자동 결과
- AXIS DS 핵심 컴포넌트 교체율 ≥80% — 구현 체크리스트
- Legacy flag 삭제 완료

---

## 6. 접근 방식 (How)

### 6.1 기술 스택 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| AXIS DS 소비 | npm registry + 버전 pinning | 안정성, 기여 시 upstream release 경유 |
| OAuth 구현 | Cloudflare Access + Google IdP | 앱 코드 OAuth 로직 zero, Allowlist 가능 |
| 롤아웃 | Feature Flag `?legacy=1` 듀얼 화면 | 기존 사용자 방해 ZERO, 롤백 쉬움 |
| Split View 백엔드 | 기존 provenance + 보강 | svc-skill에 `GET /skills/:id/provenance/resolve` 신규 가능성 |

### 6.2 선행 작업 (Sprint 219 진입 전)

1. ✅ **Provenance 데이터 완전성 실측** (세션 221 완료) — `docs/03-analysis/features/provenance-coverage-2026-04-21.md`
   - 결과: `sourceLineRange` 스키마 부재(0% 확정), `pageRef` optional, `documentId` 100% 보장
   - 판정: 60% 임계값 FAIL → **F364 분리** + MVP 스코프 축소로 실행 가능
2. **AXIS DS npm publish 실측** — `@axis-ds/tokens`, `@axis-ds/react` npm view 확인
3. **Cloudflare Access Free tier 50석 범위 확인** — KTDS-AXBD org 현황

### 6.3 Sprint 분해

| Sprint | 주요 F-item | 종속 |
|--------|-------------|------|
| **S219 (병행)** | F370 OAuth + F371 D1 users + F372 랜딩 + F373 AXIS 토큰 + F374 Feature Flag skeleton | Phase 3 F355b/F362와 동시 pane |
| **S220** | F375 Executive View + F376 Foundry-X 타임라인 + F377 Archive 실행 + F378 Evidence 서브메뉴 | REQ-035 Phase 3 Foundry-X 데이터 있으면 유리 |
| **S221** | F379 Engineer Workbench Split View + F380 Provenance Inspector + F381 AXIS 컴포넌트 8종 교체 + F382 Admin 기본 | Provenance 데이터 완전성 확보 |
| **S222 (Should)** | F383 AXIS 기여 + F384 Guest/Demo | S221 완료 후 |

---

## 7. 종속 관계 & 우선순위

```
우선순위:
REQ-035 Must (TD-24 DIVERGENCE, TD-25 Foundry-X E2E)
  > REQ-036 Must (Executive View + Engineer Workbench + OAuth)
  > REQ-035 Should (AI-Ready 채점기, AgentResume, Tree-sitter, comparator)
  > REQ-036 Should (AXIS DS 기여, Guest/Demo)
```

**데이터 흐름**:
- REQ-035 Must 산출물(AI-Ready 점수, Foundry-X E2E 증거, DIVERGENCE 마커) = REQ-036 Executive View 위젯의 데이터 소스
- REQ-036 완성도는 REQ-035 Must 완성도에 유기적으로 연결

---

## 8. 마일스톤 & 완료 조건

| Milestone | 완료 조건 | Sprint |
|-----------|-----------|--------|
| M-UX-1: 인증 & 기반 | OAuth 동작 + users 테이블 CRUD + 랜딩 페이지 + AXIS 토큰 적용 | S219 |
| M-UX-2: Executive View | Overview + Foundry-X 타임라인 + Archive 5건 + Evidence 서브메뉴 | S220 |
| M-UX-3: Engineer Workbench | Split View 동작 + Provenance Inspector + AXIS 컴포넌트 8종 교체 + Admin 기본 | S221 |
| M-UX-4 (Should): AXIS 기여 | 도메인 특화 컴포넌트 3종 PR 생성 + Guest/Demo 모드 | S222 |

**MVP 종료 조건** (S221 완료):
- [ ] KPI 2종 (본부장 3분 테스트 PASS + Split View 클릭 ≤3) 측정 완료
- [ ] Legacy Feature Flag 삭제 가능 상태 (스모크 테스트 통과)
- [ ] Production 배포 완료 (Cloudflare Pages)

---

## 9. 리스크 & 가정

### 9.1 주요 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | ✅ **Provenance 데이터 불완전** (세션 221 해소) | ~~Split View 해상도 저하, KPI#2 측정 불가~~ | **완료**: sourceLineRange 스키마 부재 확정 → MVP 스코프 축소(재구성 마크다운 section 앵커만) + F364 분리 |
| R2 | AXIS DS 골포림/미성숙 | 범위 2배 폭증, PRD 착수 지연 | S219 첫 날 npm publish 실측, 미성숙 시 MVP에서 Tier 3(AXIS 기여)만 S222로 미룸 |
| R3 | Cloudflare Access 플랜 한계 | 유료 플랜 필요 시 승인 지연 | 무료 tier 50석 범위 확인 (KTDS-AXBD org 대부분 커버) |
| R4 | 본부장 피드백으로 범위 변경 | 재작업 소요 | S220 종료 시 중간 리뷰 세션 + S221 시작 시 반영 윈도우 1일 |
| R5 | **v0.2 스코프 축소 후 본부장 체감 품질 저하** (신규) | "원본 소스 직접 연결 불가"로 설득력 저하 가능 | Executive View는 Foundry-X 타임라인 중심이라 영향 작음. Engineer View만 우측 재구성 마크다운. 필요 시 F365 pageRef 실측 후 부분 보강 |

### 9.2 가정

- Sprint 219~221 기간 Sinclair 1인 주 개발자
- AXIS DS 레포에 접근/기여 가능 (IDEA-on-Action org 권한)
- Cloudflare Access + Google IdP 설정 권한 확보

---

## 10. 착수 기준

- R1 + R2 평균 ≥ 74 (Phase 1/2 선례)
- Ambiguity ≤ 0.15

**Phase 1/2 선례**:
- Phase 1: R2 68, Ambiguity 0.15 → 착수 성공
- Phase 2: R2 74, Ambiguity 0.120 → 착수 성공
- Phase 3 본: R1 74 / R2 77, Ambiguity 0.122 → 착수 성공

### Ambiguity 추정 (자체 평가)

| 축 | v0.1 명확도 | v0.2 명확도 (실측 반영) |
|----|:-----------:|:------------------------:|
| 목적 / 타깃 Audience | ★★★★★ | ★★★★★ |
| 범위 (MVP/Should/Out) | ★★★★☆ | ★★★★★ (Split View 스코프 명확) |
| 기술 결정 | ★★★★☆ (Provenance 실측 의존) | ★★★★★ (실측 완료, F364 분리) |
| Timeline | ★★★★★ | ★★★★★ |
| KPI | ★★★★★ | ★★★★★ (판정 기준 구체화) |
| **Ambiguity 추정** | 0.10 | **0.08** (실측으로 가장 큰 불확실성 해소) |

---

## 11. 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|-----------|
| v0.1 | 2026-04-21 | 초안 작성 (interview-log 5파트 기반, 세션 220) |
| v0.2 | 2026-04-21 | Provenance 실측 반영 (세션 221): Split View 우측 = 재구성 마크다운 section 앵커로 축소, sourceLineRange/원본 SI 페이지 앵커 Out-of-Scope 이동, F364/F365 분리, R1 해소 + R5 추가, Ambiguity 0.10→0.08 |
```

---

## 📎 첨부 #2 — Provenance 실측 보고서

```markdown
# AIF-REQ-036 Provenance 실측 — Spec→Source 역추적 스키마 갭 분석

> **세션 221, 2026-04-21** — AIF-REQ-036 Phase 3 UX 재편 PRD v0.1 Draft의 **최대 리스크**였던 "Provenance 데이터 불완전성"을 실측했어요. Production 샘플링 불필요 — 스키마 수준에서 결정적 결론이 나왔음.

## 1. 실측 방법

PRD의 **Spec→Source 역추적 Split View** 요구사항을 3개 필드 요구로 분해:

| 요구 필드 | 기능 목적 | 측정 방법 |
|----------|---------|----------|
| `sourceLineRange` | 우측 원본 소스의 라인 하이라이트 | 스키마 존재 여부 + 채움률 |
| `pageRef` (doc page anchor) | PDF/DOCX 페이지 앵커 | 스키마 존재 ✓, 채움률은 production 샘플링 필요 |
| `documentId` | 원본 문서 식별자 | 스키마 존재 ✓ (필수 필드) |

**조사 경로**: `packages/types/src/skill.ts` Zod 스키마, `infra/migrations/db-skill/*.sql`, `services/svc-skill/src/converter.ts` + `queue/handler.ts` R2 직렬화, `.decode-x/spec-containers/lpon-charge/provenance.yaml` 원천 예시.

## 2. 결정적 발견

### 2.1 sourceLineRange: **스키마 부재 (채움률 0% 확정)**

`packages/types/src/skill.ts:32-48` `PolicySchema.source` 구조:

```typescript
source: z.object({
  documentId: z.string(),
  pageRef: z.string().optional(),
  excerpt: z.string().optional(),
})
```

`ProvenanceSchema`도 `sourceDocumentIds: string[]`만 보유. **어떤 수준에서도 라인 범위 필드가 없음.**

→ PRD v0.1의 "우측 소스 줄 하이라이트" 요구사항은 **현 스키마로 불가능**.

### 2.2 원천(spec-container)도 라인 범위 미보유

`.decode-x/spec-containers/lpon-charge/provenance.yaml`:

```yaml
sources:
  - type: reverse-engineering
    path: "반제품-스펙/pilot-lpon-cancel/01-business-logic.md"
    section: "시나리오 1: 충전 (Top-up)"
    businessRules: [BL-001, ..., BL-008]
    confidence: 0.92
```

**`section` 문자열만 존재**. 라인 번호/오프셋 없음. 게다가 `path`가 **재구성 마크다운**(반제품-스펙/*)이지, 원본 SI 산출물(DOCX/PPT/Word)이 아님.

### 2.3 D1 skills 테이블도 provenance 메타 없음

누적 마이그레이션(0001~0008): `r2_key`, `domain`, `trust_score`, `spec_container_id` 등 카탈로그 메타만. provenance 전체 객체는 R2 JSON에만 존재.

### 2.4 상류 파이프라인(Stage 1~3) 라인 추적 부재

`svc-ingestion`은 청크 단위 분할까지만. `svc-extraction`/`svc-policy`는 LLM 프롬프트에 excerpt 전달은 하지만, **원본 문서 내 라인 오프셋을 보존하는 로직 없음**. 상류에서부터 라인 범위 데이터가 생성되지 않음.

## 3. 영향

| PRD v0.1 요구 | 현 스키마 가능성 | 판정 |
|---|---|---|
| 좌측 skill/policy detail | ✅ D1 + R2 조회로 가능 | OK |
| 우측 재구성 마크다운 표시 (path + section heading 스크롤) | ✅ `sources[].path` + `section` 활용 | OK (MVP) |
| 우측 원본 소스 **줄 하이라이트** | ❌ 필드 부재 | **불가** |
| PDF/DOCX **페이지 앵커** 스크롤 | △ `pageRef` optional, production 채움률 미측정 | 부분 가능 |
| KPI "Spec→Source 클릭 ≤3" | ✅ 재구성 문서 기준으로 측정 시 달성 가능 | OK (재정의) |

## 4. 권고

### 4.1 AIF-REQ-036 MVP 스코프 축소 (즉시)

- Split View 우측 = **재구성 마크다운**(반제품-스펙/*/*.md) + section heading 앵커 스크롤만 제공
- "원본 소스 줄 하이라이트" / "원본 산출물 페이지 앵커"는 MVP **제외**
- KPI "Spec→Source 클릭 ≤3" 판정 기준을 **재구성 마크다운 문서 도달 + section heading 포커스**로 재정의

### 4.2 F364 신규 등록 (Phase 4+ 이관)

**F364 — Provenance v2: sourceLineRange 스키마 + 상류 파이프라인 라인 추적**

- `PolicySchema.source.lineRange: { start: number; end: number }` 추가
- `svc-ingestion` 청크 분할 시 라인 오프셋 보존 → `svc-extraction`/`svc-policy` LLM 프롬프트에 라인 정보 주입
- `svc-skill/converter.ts` spec-container ↔ SkillPackage 변환 시 라인 정보 유지
- D1 마이그레이션 신설 (skills 또는 별도 `skill_source_lines` 테이블)
- 예상 규모: **2~3 Sprint** (Stage 1~3 전반 변경 + 기존 3,924 skill 재생성)
- 우선순위: **P2** (AIF-REQ-036 MVP 완결 후 착수)

### 4.3 F365 선택적 — pageRef 채움률 실측

F364 착수 전 production 10건 샘플(pension/giftvoucher) `Policy.source.pageRef` 채움률 측정. 30% 미만이면 F364에 "pageRef 보완" 포함, 30% 이상이면 F364 MVP에서 pageRef는 "있으면 사용, 없으면 section 대체" 패턴 채택. 예상 1h.

## 5. 결론

| 항목 | 결과 |
|---|---|
| sourceLineRange 채움률 | **0% (스키마 부재)** |
| pageRef 채움률 | 미측정 (production 샘플링 선택 사항, F365) |
| documentId 채움률 | 100% (스키마 required) |
| **AIF-REQ-036 MVP 실행 가능 여부** | ✅ 스코프 축소 후 실행 가능 |
| F-item 분리 필요성 | ✅ 확정 — F364 신규 등록 |
| 60% 임계값 판정 | **FAIL** (sourceLineRange 부재) → F364 분리 **필수** |
```

---

## 🔖 R1 후속 액션

R1 결과를 받으면 다음을 수행해요:

1. `review-history.md` §R1 결과 표에 모델별 점수/주요 지적/반영 여부 기록
2. 반영 필요 항목 → PRD v0.3 패치
3. v0.3 → R2 프롬프트 패키징 (동일 구조)
4. R2 통과 → AIF-REQ-036 상태 **TRIAGED → PLANNED** 전환 + Sprint 배치
