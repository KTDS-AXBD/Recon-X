---
code: AIF-REVH-decode-x-v1.3-phase-3-ux
title: Decode-X v1.3 Phase 3 UX 재편 외부 AI 검토 이력
version: 0.4
status: Round 1 Complete (79/100, 추가 라운드 권장) — 대상 = PRD v0.2
category: REVIEW
system-version: 0.7.0
created: 2026-04-21
updated: 2026-04-21
author: Sinclair Seo
related:
  - docs/req-interview/decode-x-v1.3-phase-3-ux/prd-final.md
  - docs/req-interview/decode-x-v1.3-phase-3-ux/interview-log.md
  - docs/03-analysis/features/provenance-coverage-2026-04-21.md
---

# 외부 AI 검토 이력 — AIF-REQ-036

> Phase 1/2/3 본 PRD와 동일한 2라운드 검토 프로세스.
> ~~PRD v0.1~~ **PRD v0.2 (Provenance 실측 반영)** → R1 피드백 → v0.3 → R2 피드백 → v1.0 final.
>
> **v0.2 변경점 (세션 221)**: Split View 우측 스코프 축소(재구성 마크다운 section 앵커), sourceLineRange/원본 SI 산출물 페이지 앵커 Out-of-Scope, F364/F365 분리, R1 리스크 해소 + R5 신설, Ambiguity 0.10→0.08.

---

## R1 (Complete, 2026-04-21) — PRD v0.2 (실측 반영본)

### 요약

- **종합 스코어**: **79 / 100** (80점 기준에 -1점, 추가 라운드 권장)
- **Ready 판정**: 1/3 (Gemini Ready, ChatGPT Conditional, DeepSeek Conditional)
- **Actionable items**: 52건 (flaws:6, gaps:5, risks:41, 가중 64)
- **호출 경로**: OpenRouter 프록시 (openai/gpt-4.1, google/gemini-2.5-flash, deepseek/deepseek-chat-v3)
- **소요**: 40.9초 / 23,776 tokens
- **산출물**: `review/round-1/{feedback.md, chatgpt-feedback.md, gemini-feedback.md, deepseek-feedback.md, scorecard.md, scorecard.json, actionable-items.json}`

### 스코어카드 내역

| 항목 | 점수 | 비고 |
|------|:----:|------|
| 1. 가중 이슈 밀도 (초안 스킵) | 20/20 | flaw:6 gap:5 risk:41 (가중 64) |
| 2. Ready 판정 비율 | 20/30 | 1/3 Ready |
| 3. 핵심 요소 커버리지 | 22/30 | 사용자/이해관계자, 핵심 기능 범위, Out-of-scope, MVP 기준 (최소) |
| 4. 다관점 반영 여부 | 17/20 | 비즈니스 관점 (최소) |
| **총점** | **79/100** | 추가 라운드 권장 |

### R1 결과 (모델별)

### 검토 프롬프트 (사용자 복사용)

아래 프롬프트를 Claude Opus / GPT-5 / Gemini 2.5 Pro 중 2개 이상 모델에 붙여넣으세요. `prd-final.md` 본문(v0.2) + `provenance-coverage-2026-04-21.md`를 함께 첨부.

```
당신은 소프트웨어 제품 기획 리드 및 SI 조직 CTO 관점의 PRD 리뷰어입니다.
첨부된 PRD(v0.2 — Provenance 실측 반영본)를 다음 기준으로 100점 만점 평가해 주세요.

평가 기준:
1. 문제 정의의 구체성 (20점) — Pain Points가 숫자·사건·사용자 시나리오로 근거되는가
2. 범위 명확성 (20점) — MVP/Should/Out-of-scope 경계가 모호하지 않은가
3. 기술 접근의 타당성 (15점) — AXIS DS npm + CF Access + Feature Flag 조합이 실행 가능한가
4. 성공 지표 측정 가능성 (15점) — "본부장 3분 설득력", "Split View 클릭 수 3 이하"가 실측 가능한가
5. 일정·리소스 현실성 (15점) — 1인 3 Sprint로 MVP 완결 가능한가
6. 리스크 누락 여부 (10점) — Provenance 불완전성 외 놓친 리스크는?
7. 다른 REQ(특히 Phase 3 본 PRD)와의 충돌·종속성 (5점) — 명확한가

출력 형식:
- Total Score (/100)
- 항목별 점수 + 1~2문장 근거
- Top 5 개선 제안 (우선순위 순)
- 블로커 리스크 (있는 경우)

PRD 본문:
[docs/req-interview/decode-x-v1.3-phase-3-ux/prd-final.md 전체 붙여넣기]
```

### R1 결과

| Reviewer | 판정 | 주요 지적 | 반영 여부 |
|----------|:----:|-----------|:---------:|
| ChatGPT (gpt-4.1) | Conditional | (1) 본부장 3분 설득 UX mock/예시 부재 (2) 3클릭 역추적 fallback flow 미정의 (3) Archive 결정의 정량 데이터(DAU/세션) 부재 (4) QA/smoke/regression test 전략 부재 (5) 사용자 온보딩·FAQ 전이 계획 부재 (6) 운영/모니터링/장애 대응 플랜 없음 (7) AXIS DS Tier 3 기여 일정 과소평가 (8) 1인 병행 PRD 컨텍스트 스위칭 과소평가 | Pending |
| Gemini (gemini-2.5-flash) | **Ready** | (1) 감사 로그(Audit Log) 기능 부재 (Admin) (2) 데이터 거버넌스/규제 준수 증거 기능 부족 (3) MLOps 파이프라인 통합 비전 부재 (4) 멀티모달 Provenance 확장성 미고려 (5) '놀교 동료' KPI 객관성 보강 필요 (6) Foundry-X 사례 비즈니스 임팩트 스토리텔링 강화 | Partial (선택 반영) |
| DeepSeek (deepseek-chat-v3) | Conditional | (1) F365 pageRef 30%+ 실측 결과 확보 전제 (2) AXIS DS core team 기술 협약 필요 (3) CF Access 무료 티어 공식 확인서 필요 (4) Split View 좌우 동기화 스크롤/리사이즈 복잡도 과소평가 (5) `GET /skills/:id/provenance/resolve` MSA 일관성 미검토 (6) D1 `users` 추가가 타 서비스에 미치는 영향 평가 부재 (7) git blame/commit history 대체 연동 제안 (8) OAuth Allowlist 백오피스 MVP 포함 권고 | Pending |

### Top 개선 제안 (교집합 기반 우선순위)

1. **Fallback/Graceful degradation 플로우 명시** (ChatGPT+DeepSeek 공통) — Provenance section-only 케이스 UI flow, DS 미성숙 시 기존 컴포넌트 유지
2. **QA/테스트/운영 플랜 보강** (ChatGPT) — E2E/smoke/regression + OAuth 운영/모니터링
3. **Archive 정량 데이터 근거 보강** (ChatGPT) — 페이지별 이용률, 세션 수 측정 또는 `N/A` 명시
4. **사용자 온보딩 계획 추가** (ChatGPT) — 역할별 가이드, FAQ, Feature Flag 전환 안내
5. **AXIS DS Tier 3 스코프 재평가** (ChatGPT+DeepSeek 공통) — Tier 3 기여를 S222 Should로 명시적 후순위, Tier 2 범위 고정
6. **선행 작업 3종 PASS/FAIL 기준 구체화** (DeepSeek) — CF Access 50석 공식 문서, AXIS DS npm publish view, Google Workspace SAML 상태
7. **감사 로그 기능 포함 여부 결정** (Gemini) — Admin 역할에 audit log 섹션 스텁 추가 또는 Phase 4+로 명시적 분리
8. **OAuth Allowlist 백오피스 MVP 포함** (DeepSeek) — Admin/Users 페이지 필수 기능 범위 명시

### Ambiguity 재추정 (R1 기반)

| 차원 | v0.2 자체 추정 | R1 반영 조정 |
|------|:--------------:|:------------:|
| Goal Clarity | ★★★★★ (0.95) | ★★★★☆ (0.85) — 3분 설득 UX mock 부재 |
| Constraint Clarity | ★★★★★ (0.95) | ★★★★☆ (0.85) — 선행 3종 통과 기준 모호 |
| Success Criteria | ★★★★★ (0.95) | ★★★★☆ (0.80) — KPI 측정 주체/객관성 |
| Context Clarity | ★★★★★ (0.95) | ★★★★☆ (0.80) — 정량 사용 데이터 없음 |
| **가중 평균** | 0.95 | 0.825 |
| **Ambiguity (1 − 평균)** | **0.08** | **0.175** (목표 0.15 근사) |


---

## R2 (Pending) — PRD v0.2

### 검토 프롬프트

R1 반영 후 v0.2 대상. 동일 모델 2개 이상에 재검토.

```
당신은 이 PRD의 R1 검토 후 v0.2 반영본을 평가하는 리뷰어입니다.
R1에서 지적된 {TOP 5 개선 사항}이 v0.2에 어떻게 반영되었는지 검토하고,
잔여 이슈가 있는지 동일 기준(1~7)으로 재평가해 주세요.
```

---

## Ambiguity 지표

| 측정 시점 | 값 | 출처 |
|-----------|:--:|------|
| v0.1 자체 추정 | 0.10 | prd-final.md §10.3 |
| v0.2 자체 추정 | 0.08 | prd-final.md §10.3 (실측 반영) |
| **R1 종료 시** | **0.175** | R1 결과 반영 조정 (R1 섹션 참조) |
| R2 종료 시 | TBD | - |
| **목표** | ≤ 0.15 | Phase 1/2/3 선례 |

## 착수 판단

- 기준: R1 + R2 평균 ≥ 74 AND Ambiguity ≤ 0.15
- **R1 단독 판정**: 79 / 100 (기준 근소 미달) + Ambiguity 0.175 (목표 초과)
- **결과**: ⚠️ **추가 라운드 권장** — v0.3 패치 후 R2 수행

## Phase 1/2/3 선례 비교

| Phase | R1 | R2 | Ambiguity | 착수 결과 |
|-------|:--:|:--:|:---------:|:---------:|
| Phase 1 | 68 | — | 0.15 | 성공 (1.5일 압축 완주) |
| Phase 2 | — | 74 | 0.120 | 성공 (Match 95.6%) |
| Phase 3 본 | 74 | 77 | 0.122 | Ready (착수 정당화 완료) |
| **REQ-036 UX** | **79** | TBD | **0.175(R1)** | R2 대기 (v0.3 패치 선행) |
