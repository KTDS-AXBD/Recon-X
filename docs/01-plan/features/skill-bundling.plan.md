---
code: AIF-PLAN-025
title: "Skill 번들링 — LLM 의미 분류 기반 재패키징"
version: "1.0"
status: Draft
category: PLAN
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
feature: skill-bundling
---

# Skill 번들링 — LLM 의미 분류 기반 재패키징

> **Summary**: 1 skill = 1 policy (859개)를 LLM 의미 분류로 기능 단위 ~25개 번들로 재패키징하여 Claude Code 스킬로 활용 가능하게 함
>
> **Project**: AI Foundry
> **Version**: v0.6.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Stage 5 파이프라인이 policy 1개당 skill 1개를 생성하여 859개의 파편화된 스킬이 만들어짐. 각 스킬이 단일 정책만 포함하여 Claude Code 스킬이나 MCP 도구로 활용이 불가능 |
| **Solution** | LLM 의미 분류로 859개 정책을 ~25개 기능 도메인으로 클러스터링 후, 기능 단위 스킬 번들로 재패키징. trust score 재산정 포함 |
| **Function/UX Effect** | Mock-up Skill 호출 탭에서 기능 단위 스킬 목록 표시, 스킬 선택 시 포함된 정책들 표시, 컨텍스트 기반 자동 정책 매칭 |
| **Core Value** | 추출된 도메인 지식을 Claude Code/MCP에서 실제로 활용 가능한 형태로 전환 — AI Foundry의 핵심 가치인 "재사용 가능한 AI Skill 자산화" 실현 |

---

## 1. Overview

### 1.1 Purpose

AI Foundry의 5-Stage 파이프라인에서 생성된 스킬을 **Claude Code 스킬** 형태로 활용할 수 있도록 패키징 단위를 재설계한다. 현재 1:1(policy:skill) 구조를 기능 단위 번들(N:1)로 변환하여, 하나의 스킬이 관련된 여러 정책을 포함하고 자연어 시나리오에 대해 적절한 정책을 자동 선택할 수 있게 한다.

### 1.2 Background

**현재 구조의 문제점:**

| 항목 | 현재 | 문제 |
|------|------|------|
| 스킬 수 | LPON 859개 / Miraeasset 3,065개 | 사용자가 탐색 불가능 |
| 패키지 단위 | 1 policy per skill | 의미 있는 기능 단위가 아님 |
| trust score | 전체 0점 (draft) | 품질 판단 불가 |
| policy code | `POL-PENSION-*` (giftvoucher에도) | 도메인 코드 불일치 |
| 활용 방법 | 불명확 | 스킬을 어떻게 써야 하는지 안내 없음 |

**Claude Code 스킬 형태 목표:**

```
# 온누리상품권 충전 관리 (Charging Management)

이 스킬은 상품권 충전과 관련된 25개의 정책을 포함합니다.
충전 한도, 자동충전, 충전 취소, 조건별 금액 설정 등의
비즈니스 규칙을 적용합니다.

## 사용 시점
- 충전 요청의 유효성을 검증할 때
- 자동충전 조건을 확인할 때
- 충전 한도 초과 여부를 판단할 때

## 포함 정책
- POL-GV-CH-001: 충전 한도 정책
- POL-GV-CH-002: 자동충전 조건 정책
- ...
```

### 1.3 Related Documents

- Requirements: [[AIF-REQ-025]] Skill 번들링 재설계
- PRD: `docs/AI_Foundry_PRD_TDS_v0.7.4.docx` §15 Skill Package Spec
- Current Pipeline: `services/svc-skill/src/assembler/skill-builder.ts`
- Queue Handler: `services/svc-skill/src/queue/handler.ts`

---

## 2. Current State Analysis

### 2.1 태그 분포 (LPON 100건 샘플)

| 카테고리 | 대표 태그 | 빈도 |
|----------|----------|------|
| 운영/관리 | 운용관리, 운용, 배치, 코드 | 28 |
| API/시스템 | API, 오류처리, 응답, 상태변경 | 28 |
| 회원/인증 | 인증, 가입, 로그인, 본인확인 | 27 |
| 충전/결제 | 충전, 자동충전, 가맹점, 정산 | 22 |
| 알림/메시지 | 알림, 메시지, SMS | 20 |
| 보안/감사 | 보안, API보안, 접근제어 | 12 |
| 상품권/선물 | 환불, 취소, 상품권 | 10 |
| 계좌/지갑 | 계좌관리, 계좌생성, 잔액 | 8 |

- 전체 1,020개 고유 태그 중 상위 30개가 빈도의 ~40% 차지
- 154개 태그가 위 8개 카테고리에 매핑되지 않음 → LLM 분류 필요

### 2.2 현재 Stage 5 패키징 흐름

```
ontology.normalized 이벤트 수신
  → svc-policy에서 approved policy 1개 fetch
  → svc-ontology에서 관련 terms fetch
  → buildSkillPackage({policies: [1개], ...})
  → R2에 .skill.json 저장
  → D1 skills 테이블 INSERT
  → skill.packaged 이벤트 발행
```

**핵심 변경점**: `policies: [1개]` → `policies: [N개]` 번들

---

## 3. Solution Design

### 3.1 접근 방식: LLM 의미 분류 + 번들 패키징

```
Phase 1: 분류 (Classify)
  └ LLM에 정책 제목+조건+기준을 보여주고
    기능 도메인 라벨 부여 (예: "charging", "member", "security")

Phase 2: 번들링 (Bundle)
  └ 같은 라벨의 정책들을 하나의 SkillPackage로 패키징
    skill description + inputSchema 자동 생성

Phase 3: 배포 (Deploy)
  └ 기존 1:1 스킬 대체 (또는 병렬 유지)
    MCP 어댑터 + Claude Code 스킬 포맷 생성
```

### 3.2 LLM 분류 프롬프트 설계

```
system: 당신은 도메인 전문가입니다. 아래 정책들을 기능 단위로 분류하세요.

user: 다음 정책들을 기능 도메인으로 분류해주세요.
각 정책에 대해 가장 적합한 카테고리 1개를 부여하세요.

카테고리 후보:
- charging: 충전, 자동충전, 납입, 금액 설정
- payment: 결제, PG, 카드, 가맹점
- member: 회원가입, 로그인, 인증, 본인확인
- account: 계좌, 지갑, 잔액, 이체
- gift: 상품권, 선물, 교환, 환불
- notification: 알림, 메시지, SMS, 푸시
- security: 보안, 암호화, 접근제어, 감사
- operation: 운영, 배치, 모니터링, 설정
- api: API 연동, 오류처리, 응답, 검증
- settlement: 정산, 수수료, 매출
- other: 위 카테고리에 해당하지 않는 경우

정책 목록 (JSON):
[{code, title, condition, criteria}]

응답 형식 (JSON):
[{code: "POL-...", category: "charging"}]
```

### 3.3 번들 스킬 구조

```typescript
interface BundledSkill {
  skillId: string;
  metadata: {
    domain: string;         // "giftvoucher"
    subdomain: string;      // "charging" (LLM 분류 결과)
    name: string;           // "온누리상품권 충전 관리"
    description: string;    // LLM 생성 — 이 스킬의 용도 설명
    language: "ko";
    version: "2.0.0";
    tags: string[];         // 포함 정책들의 태그 합집합
  };
  policies: Policy[];       // N개 (동일 subdomain의 모든 정책)
  trust: TrustScore;        // 포함 정책들의 평균 trust
  inputSchema: {             // 자동 생성된 입력 스키마
    type: "object";
    properties: {
      context: { type: "string"; description: "평가할 비즈니스 시나리오" };
      scenario_type?: { type: "string"; enum: string[] };
    };
  };
  usage: {                   // Claude Code 스킬 메타데이터
    triggers: string[];      // "충전", "한도", "자동충전" 등
    examples: string[];      // 예시 시나리오
  };
}
```

### 3.4 구현 범위

| Phase | 내용 | 예상 세션 |
|-------|------|-----------|
| Phase 1 | LLM 분류 스크립트 + 분류 결과 검증 | 1 세션 |
| Phase 2 | 번들 패키징 로직 (skill-bundler.ts) + DB 마이그레이션 | 1 세션 |
| Phase 3 | Mock-up UX 갱신 + MCP 어댑터 + Claude Code 포맷 | 1 세션 |

**총 예상**: 3 세션

---

## 4. Implementation Plan

### 4.1 Phase 1: LLM 분류 (Classify)

**신규 파일:**
- `services/svc-skill/src/bundler/classifier.ts` — LLM 분류 로직
- `scripts/classify-policies.ts` — 일괄 분류 실행 스크립트

**동작:**
1. D1에서 organization별 approved policies 전체 조회
2. 50개씩 배치로 LLM에 분류 요청 (svc-llm-router 경유)
3. 분류 결과를 D1 `policy_classifications` 테이블에 저장
4. 분류 통계 출력 (카테고리별 정책 수, 미분류 건수)

**DB 마이그레이션:**
```sql
CREATE TABLE IF NOT EXISTS policy_classifications (
  policy_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence REAL DEFAULT 0,
  classified_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (policy_id, organization_id)
);
```

### 4.2 Phase 2: 번들 패키징 (Bundle)

**수정 파일:**
- `services/svc-skill/src/assembler/skill-builder.ts` — `buildBundledSkillPackage()` 추가
- `services/svc-skill/src/routes/admin.ts` — `POST /skills/rebundle` 관리자 API

**신규 파일:**
- `services/svc-skill/src/bundler/bundler.ts` — 번들링 오케스트레이터

**동작:**
1. `policy_classifications`에서 카테고리별 정책 그룹 조회
2. 각 카테고리에 대해 `buildBundledSkillPackage()` 호출
3. LLM으로 스킬 설명/triggers/examples 자동 생성
4. 기존 1:1 스킬은 `status=superseded`로 변경
5. 새 번들 스킬을 `status=bundled`로 D1 + R2에 저장

### 4.3 Phase 3: UX + 어댑터 (Deploy)

**수정 파일:**
- `apps/app-mockup/src/components/demo/skill/SkillInvokerDemo.tsx` — 번들 스킬 표시
- `apps/app-mockup/src/components/demo/skill/EvaluationPanel.tsx` — 정책 선택 UI
- `services/svc-skill/src/routes/mcp.ts` — 번들 MCP 어댑터

**신규 파일:**
- `scripts/export-cc-skills.ts` — Claude Code 스킬 포맷 export

---

## 5. Architecture & Convention

### 5.1 기존 아키텍처와의 정합성

- **Stage 5 파이프라인 유지**: 기존 1:1 패키징은 그대로 두고, 번들링을 후처리(post-processing)로 추가
- **D1 skills 테이블**: `status` 컬럼에 `bundled`/`superseded` 추가
- **R2 저장**: 번들 스킬도 동일한 `skill-packages/` 경로에 저장
- **MCP 어댑터**: 번들 스킬 기준으로 MCP tool 생성 (기존 1:1은 제외)

### 5.2 호환성

- 기존 API (`GET /skills`, `GET /skills/:id`)는 `status` 필터로 번들/개별 구분
- 기존 evaluate API는 그대로 동작 (policyCode 필수)
- 번들 스킬용 새 API: `POST /skills/:id/evaluate-auto` — context만 보내면 적절한 정책 자동 선택

### 5.3 코드 컨벤션

- 신규 코드는 기존 svc-skill 패턴 준수 (Zod 스키마 + 라우트 분리 + ctx.waitUntil)
- LLM 호출은 반드시 svc-llm-router 경유 (`env.LLM_ROUTER` service binding)
- 테스트: 분류 로직 단위 테스트 + 번들링 통합 테스트

---

## 6. Risk & Mitigation

| 리스크 | 영향 | 대응 |
|--------|------|------|
| LLM 분류 정확도 낮음 | 잘못된 카테고리 → 스킬 품질 저하 | 분류 결과를 사람이 검증 후 번들링 (HITL) |
| 카테고리 수 과다/과소 | 너무 많으면 1:1과 다를 바 없음 | 10~30개 범위로 가이드라인 설정, 결과 보고 후 조정 |
| 기존 스킬 참조 깨짐 | MCP 어댑터가 기존 skillId 참조 | `superseded_by` 필드로 번들 스킬 가리키기 |
| LLM 비용 | 859개 × 분류 + 설명 생성 | Haiku/Workers AI로 분류, Sonnet은 설명 생성에만 사용 |

---

## 7. Success Criteria

| 지표 | 목표 |
|------|------|
| 번들 스킬 수 | 10~30개 (LPON 기준) |
| 정책 커버리지 | 분류된 정책 >= 95% |
| 미분류 정책 | < 5% |
| Mock-up UX | 번들 스킬 목록 + 정책 상세 + evaluate 정상 동작 |
| Claude Code 스킬 export | .skill.md 또는 SKILL.md 형태로 export 가능 |

---

## 8. Checklist

- [ ] Phase 1: LLM 분류 프롬프트 설계 및 테스트
- [ ] Phase 1: policy_classifications 마이그레이션 + 분류 스크립트
- [ ] Phase 1: LPON 859개 정책 분류 실행 + 결과 검증
- [ ] Phase 2: skill-bundler.ts 구현 + 단위 테스트
- [ ] Phase 2: POST /skills/rebundle 관리자 API
- [ ] Phase 2: 번들 스킬 R2 + D1 저장
- [ ] Phase 3: Mock-up Skill 호출 UX 갱신
- [ ] Phase 3: MCP 어댑터 번들 스킬 대응
- [ ] Phase 3: Claude Code 스킬 export 스크립트
