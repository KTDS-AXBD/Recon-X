---
id: AX-ANLS-F388
title: F388 Section-only Fallback 실사용자 파일럿
type: Analysis
status: PLANNED
sprint: 226
date: 2026-04-21
author: Sinclair Seo
related_req: AIF-REQ-036
---

# F388 Section-only Fallback 실사용자 파일럿

> **목적**: AIF-REQ-036 R2 ChatGPT 지적 (RP-7) 조기 검증 — Section heading 포커스 UX가
> 실사용자에게 "충분히 유용한가"를 3명 인터뷰로 측정한다.

---

## 1. 배경

`provenance.resolve` API의 `sources[].section` 값이 있을 때,
Engineer Workbench Split View 우측 패널은 해당 section heading으로 스크롤한다.
원본 소스코드 줄 하이라이트(F364, Out-of-Scope)가 없는 대신 Section 단위 앵커가 대체 UX다.

R2 DeepSeek 리뷰: "Section-only fallback이 실제 사용에서 충분한가"에 대한 조건부 승인.
→ **3명 인터뷰**로 Sprint 226 내 조기 검증 예정.

---

## 2. 인터뷰 설계

### 2.1 대상

| 번호 | 역할 | 배경 |
|------|------|------|
| P1 | 퇴직연금 도메인 Analyst | 실제 산출물 검토 경험 有 |
| P2 | 내부 Developer | Skill 통합 작업 경험 有 |
| P3 | 기획자(PM/BD) | 기술 배경 없는 비전문가 |

### 2.2 시나리오

**Task 1 — 정책 역추적 (KPI-2)**
1. Skill 카탈로그에서 임의 Skill 1건 선택
2. "Workbench에서 보기" 클릭
3. 좌측 패널에서 정책 1건 클릭
4. 우측 패널의 해당 section으로 이동 확인
5. Provenance 뱃지 클릭 → Inspector drawer 열기

측정: 총 클릭 수 (KPI-2 목표: ≤ 3회)

**Task 2 — Section 포커스 체감**
1. 관련 section이 화면에 표시되었을 때: "이 정보가 도움이 되나요?" 5점 척도
2. "원본 소스코드 줄 번호가 표시되면 더 좋겠나요?" Yes/No

**Task 3 — Provenance Inspector 탐색**
1. sources 탭 → 소스 경로/섹션 확인
2. 이해 가능 여부: "이 정보가 무엇인지 알겠나요?" 5점 척도

### 2.3 성공 기준

| 지표 | 목표 |
|------|------|
| Task 1 클릭 수 | ≤ 3회 (3명 평균) |
| Task 2 Section 체감 | ≥ 3.5/5 평균 |
| Task 3 이해 가능성 | ≥ 3/5 평균 |
| "줄 번호 필요" 응답 | ≤ 2/3명 (필요 없으면 F364 우선순위 낮춤) |

---

## 3. 실행 계획

| 단계 | 시기 | 담당 |
|------|------|------|
| 인터뷰 대상 섭외 | Sprint 226 구현 완료 후 | Sinclair |
| 파일럿 실행 | Sprint 226 배포 후 1주일 내 | Sinclair |
| 결과 기록 | 인터뷰 당일 | Sinclair |
| F388 DONE 전환 | 결과 기록 완료 후 | Sinclair |

---

## 4. 결과 기록 (작성 예정)

> *Sprint 226 배포 후 파일럿 실행 결과를 이 섹션에 기록*

| 참가자 | Task 1 클릭 수 | Task 2 체감 | Task 3 이해 | 줄 번호 필요 |
|--------|:-------------:|:-----------:|:-----------:|:-----------:|
| P1 | — | — | — | — |
| P2 | — | — | — | — |
| P3 | — | — | — | — |
| **평균** | — | — | — | — |

### 4.1 결론 및 Action Items

> (파일럿 완료 후 작성)
