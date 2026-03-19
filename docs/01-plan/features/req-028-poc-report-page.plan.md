---
code: AIF-PLAN-028
title: "반제품 스펙 PoC 전체 과정 보고서 — Production 게시"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
feature: req-028-poc-report-page
refs: "[[AIF-REQ-028]] [[AIF-RPRT-027]] [[AIF-REQ-027]]"
---

# 반제품 스펙 PoC 전체 과정 보고서 — Production 게시

> **Summary**: AIF-REQ-027의 인터뷰→PRD→PDCA→스펙→Working Version 전 과정을 app-web의 새 페이지로 구성하여 Production 사이트에 게시한다. 본부장 리뷰용.
>
> **Project**: AI Foundry
> **Version**: v0.6.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-20
> **Status**: Active

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AIF-REQ-027의 PoC 결과물(6개 스펙, Working Version, 테스트 결과)이 로컬 파일로만 존재하여 본부장이 직접 확인할 수 없음 |
| **Solution** | app-web에 `/poc-report` 페이지를 추가하여 전체 과정(인터뷰→PRD→스펙→코드→테스트)을 인터랙티브하게 열람 가능하도록 구성 |
| **Function/UX Effect** | 본부장이 Production URL 접속만으로 PoC 전 과정과 결과를 확인. 6개 스펙 문서 탭 전환, Working Version 코드 하이라이팅, 테스트 결과 시각화 |
| **Core Value** | "역공학→스펙→코드" 파이프라인의 실증 결과를 의사결정권자에게 직관적으로 전달하여 Go/No-Go 판단 지원 |

---

## 1. Overview

### 1.1 Purpose

AIF-REQ-027에서 생성된 전체 산출물을 Production 사이트(`ai-foundry.minu.best`)의 단일 페이지에서 열람할 수 있게 한다. 본부장이 별도 도구 없이 웹 브라우저만으로 PoC 결과를 확인하고 판단할 수 있어야 한다.

### 1.2 Background

- AIF-REQ-027 완료: 6개 스펙 문서(112KB) + Working Version(14파일, 1,610줄) + 24 테스트 100% 통과
- 현재 산출물은 `반제품-스펙/` 디렉토리에 Markdown 파일로만 존재
- 본부장은 GitHub/IDE 접근 없이 웹에서 확인 필요
- 기존 app-web에 `MarkdownContent` 컴포넌트(자체 Markdown 렌더러)가 이미 존재

### 1.3 Related Documents

- AIF-REQ-027 산출물: `반제품-스펙/` 디렉토리 전체
- 완료 보고서: [[AIF-RPRT-027]]
- app-web 구조: 23개 페이지, React Router, Cloudflare Pages

---

## 2. Scope

### 2.1 In Scope

- [ ] `/poc-report` 라우트 추가 (app-web)
- [ ] PoC 보고서 페이지 구현 — 7개 섹션 탭 구성
- [ ] 마크다운 콘텐츠를 정적 임포트 (빌드 시 번들링)
- [ ] Working Version 코드 하이라이팅 뷰
- [ ] 테스트 결과 시각화 (24/24 통과, BL 커버리지)
- [ ] Sidebar 메뉴에 "PoC 보고서" 항목 추가
- [ ] Production 배포 (Cloudflare Pages)

### 2.2 Out of Scope

- 백엔드 API 신규 구현 (정적 콘텐츠로 번들링)
- 실시간 데이터 연동 (D1/R2 조회)
- 편집/수정 기능 (읽기 전용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | 7개 섹션 탭: 개요 / 인터뷰 / PRD / 스펙(6문서) / 코드 / 테스트 / PDCA | High |
| FR-02 | 각 스펙 문서를 탭 내 서브탭으로 전환 (BL/데이터/기능/아키텍처/API/화면) | High |
| FR-03 | Working Version 소스코드를 구문 강조(syntax highlight)로 표시 | Medium |
| FR-04 | 테스트 결과를 시각적으로 표시 (통과율, BL 커버리지 차트) | Medium |
| FR-05 | Executive Summary 카드 (핵심 수치: 6문서, 14파일, 24테스트, 0회 개입) | High |
| FR-06 | 마크다운 콘텐츠 렌더링 (기존 MarkdownContent 컴포넌트 활용) | High |
| FR-07 | 인쇄/PDF 내보내기 지원 (print CSS) | Low |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| 성능 | 페이지 로드 < 2초 (정적 번들) |
| 접근성 | 비개발자(본부장)가 이해 가능한 UI |
| 반응형 | 태블릿/데스크톱 지원 |

---

## 4. Page Design

### 4.1 정보 아키텍처 (7개 섹션)

```
[탭 1: 개요]
  ├── Executive Summary 카드 (핵심 수치)
  ├── 타임라인 (인터뷰 → PRD → Plan → Design → Do → Check → Report)
  └── Value Delivered 테이블

[탭 2: 인터뷰]
  └── interview-log.md 렌더링

[탭 3: PRD]
  ├── prd-final.md 렌더링
  └── AI 검토 요약 (3라운드 스코어 추이)

[탭 4: 스펙 문서]  ← 핵심
  ├── [서브탭] 비즈니스 로직 (01-business-logic.md)
  ├── [서브탭] 데이터 모델 (02-data-model.md)
  ├── [서브탭] 기능 정의서 (03-functions.md)
  ├── [서브탭] 아키텍처 (04-architecture.md)
  ├── [서브탭] API (05-api.md)
  └── [서브탭] 화면 (06-screens.md)

[탭 5: Working Version]
  ├── 파일 트리 (14파일)
  ├── 소스코드 뷰어 (구문 강조)
  └── 아키텍처 다이어그램

[탭 6: 테스트 결과]
  ├── 통과율 게이지 (24/24 = 100%)
  ├── BL 커버리지 차트 (17/47)
  └── 테스트 케이스 목록

[탭 7: PDCA]
  ├── Plan 문서 요약
  ├── Design 문서 요약
  └── Report 문서 전문
```

### 4.2 콘텐츠 번들링 전략

마크다운 파일을 **빌드 시 정적 임포트**하여 번들에 포함:

```typescript
// src/data/poc-report.ts
export const pocReportData = {
  interview: import.raw('./반제품-스펙/interview-log.md'),
  prd: import.raw('./반제품-스펙/prd-final.md'),
  specs: {
    businessLogic: import.raw('./반제품-스펙/pilot-lpon-cancel/01-business-logic.md'),
    dataModel: import.raw('./반제품-스펙/pilot-lpon-cancel/02-data-model.md'),
    functions: import.raw('./반제품-스펙/pilot-lpon-cancel/03-functions.md'),
    architecture: import.raw('./반제품-스펙/pilot-lpon-cancel/04-architecture.md'),
    api: import.raw('./반제품-스펙/pilot-lpon-cancel/05-api.md'),
    screens: import.raw('./반제품-스펙/pilot-lpon-cancel/06-screens.md'),
  },
  code: {
    // Working Version 소스코드 (key: 파일경로, value: 코드 문자열)
  },
  testResults: {
    total: 24, passed: 24, failed: 0,
    files: [
      { name: 'charging.test.ts', tests: 7, passed: 7 },
      { name: 'cancel.test.ts', tests: 8, passed: 8 },
      { name: 'payment.test.ts', tests: 9, passed: 9 },
    ],
    blCoverage: { total: 47, referenced: 17 },
  },
};
```

### 4.3 Vite Raw Import

Vite의 `?raw` suffix로 마크다운 파일을 문자열로 임포트:

```typescript
import interviewMd from '../../반제품-스펙/interview-log.md?raw';
```

별도 플러그인 불필요. 빌드 시 문자열로 번들됨.

---

## 5. Implementation Plan

### 5.1 파일 구조

```
apps/app-web/src/
├── pages/
│   └── poc-report.tsx           ← 메인 페이지 (탭 컨테이너)
├── components/
│   └── poc-report/
│       ├── OverviewTab.tsx      ← 개요 + Executive Summary
│       ├── InterviewTab.tsx     ← 인터뷰 로그 렌더링
│       ├── PrdTab.tsx           ← PRD + AI 검토 요약
│       ├── SpecDocsTab.tsx      ← 6개 스펙 서브탭
│       ├── CodeViewerTab.tsx    ← Working Version 코드 뷰어
│       ├── TestResultsTab.tsx   ← 테스트 결과 시각화
│       └── PdcaTab.tsx          ← PDCA 문서 요약
└── data/
    └── poc-report-data.ts       ← 정적 콘텐츠 임포트
```

### 5.2 구현 순서

1. [ ] `poc-report-data.ts` — 마크다운/코드 파일 정적 임포트
2. [ ] `OverviewTab.tsx` — Executive Summary + 타임라인
3. [ ] `SpecDocsTab.tsx` — 6개 스펙 문서 서브탭 (핵심)
4. [ ] `CodeViewerTab.tsx` — 소스코드 뷰어
5. [ ] `TestResultsTab.tsx` — 테스트 결과
6. [ ] 나머지 탭 (Interview, PRD, PDCA)
7. [ ] `poc-report.tsx` — 메인 페이지 + 탭 조합
8. [ ] `app.tsx` 라우트 추가 + `Sidebar.tsx` 메뉴 추가
9. [ ] typecheck + lint
10. [ ] Production 배포

---

## 6. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| 마크다운 파일 크기(112KB)로 번들 증가 | Low | 해당 페이지 lazy load로 분리 |
| 코드 하이라이팅 라이브러리 번들 크기 | Medium | `<pre><code>` + CSS 클래스로 간소화, 또는 기존 CodeBlock 컴포넌트 활용 |
| 본부장이 기술 용어를 이해 못함 | Medium | 개요 탭에 비기술적 요약 배치, 각 섹션에 "이 문서는..." 설명 추가 |

---

## 7. Success Criteria

- [ ] Production URL(`ai-foundry.minu.best/poc-report`)에서 7개 탭 모두 정상 렌더링
- [ ] 본부장이 비기술적 요약(개요 탭)을 읽고 핵심 결과를 이해
- [ ] 6개 스펙 문서가 마크다운 렌더링으로 가독성 있게 표시
- [ ] Working Version 코드가 구문 강조로 표시

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`/pdca design req-028-poc-report-page`)
2. [ ] 구현 시작 (Do phase)
3. [ ] Production 배포 후 본부장 리뷰

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-20 | 초안 작성 | Sinclair Seo |
