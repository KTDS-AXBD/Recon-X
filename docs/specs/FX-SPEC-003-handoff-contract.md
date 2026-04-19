---
code: FX-SPEC-003
title: Decode-X ↔ Foundry-X Handoff Contract
version: 1.0
status: SIGNED
signed-by: Sinclair Seo (Decode-X Lead / Foundry-X PM 겸임)
signed-at: 2026-04-20
frozen: false
freeze-trigger: Sprint 212 착수 시점 (Major/Minor 금지, Patch만 허용)
related:
  - FX-SPEC-002 (PlumbBridge Plumb Output Contract, v1.0 @ e5c7260) — 별도 계약, 이 문서와 상하관계 없음
  - AIF-REQ-035 (Decode-X v1.3 Phase 2 본 개발)
---

# FX-SPEC-003: Decode-X ↔ Foundry-X Handoff Contract

## 1. 목적

Decode-X가 생산하는 **Handoff Package**의 포맷 규격과 Foundry-X의 수용·실행 기준을 정의한다.

이 계약은 다음을 보장한다:
- Decode-X가 Handoff Package를 일관된 스키마로 생산
- Foundry-X가 Working Prototype 생성에 필요한 최소 품질 기준을 수신 전 검증
- 실행 결과(SyncResult)를 Decode-X로 피드백하여 지속적 품질 개선 루프 구축

**FX-SPEC-002 (PlumbBridge v1.0)는 별도 계약이며 이 문서의 발행으로 변경되지 않는다.**

---

## 2. 당사자

| 당사자 | 역할 | 담당자 |
|--------|------|--------|
| **Decode-X** | Handoff Package **Producer** | Sinclair Seo (`sinclairseo@gmail.com`) |
| **Foundry-X** | Working Prototype **Consumer** | Sinclair Seo (PM 겸임, Phase 0 Closure 확정) |

> 1인 겸임 체제 (Phase 0 Closure 선례): 계약 충돌 발생 시 Decode-X 생산 완결성을 우선한다.

---

## 3. Tier-A 6개 서비스 특성

Phase 2에서 Handoff 대상이 되는 LPON 온누리상품권 **Tier-A 핵심 거래 서비스** 6종.

| 서비스 ID | 한글명 | 도메인 설명 | 주 입력 채널 | 예상 Empty Slot | Track |
|-----------|--------|------------|-------------|----------------|-------|
| `lpon-budget` | 예산 | 온누리상품권 예산 배정·소진·한도 관리 | Java/Spring AST | 2~3 | A |
| `lpon-purchase` | 구매 | 상품권 구매 요청·승인·이력 | Java/Spring AST | 2~3 | A |
| `lpon-payment` | 결제 | 결제 승인·처리·검증 (Track B 핵심) | Java/Spring AST | 3~4 | A + B |
| `lpon-refund` | 환불 | 환불·취소·재처리 | Java/Spring AST | 2~3 | A |
| `lpon-gift` | 선물 | 상품권 선물·이전·수취 | Java/Spring AST | 2~3 | A |
| `lpon-settlement` | 정산 | 정산 배치·집계·외부 연동 | Java/Spring AST + SQL DDL | 3~4 | A |

### 3.1 Source-First 원칙

- **소스코드가 원장(SSOT)**. 문서(SI 산출물)는 참고용.
- 충돌 발생 시 소스 우선. 불확실한 경우 `DIVERGENCE` 마커 부착 후 HITL 판단.
- 3종 차이 마커: `SOURCE_MISSING` / `DOC_ONLY` / `DIVERGENCE`

---

## 4. Handoff Package 스키마

### 4.1 파일 구조

패키지 명명 규칙: `handoff-{orgId}-{serviceId}-{YYYYMMDD}.zip`  
예: `handoff-LPON-lpon-payment-20260420.zip`

```
handoff-{orgId}-{serviceId}-{date}.zip
├── spec-business.md          # 업무 스펙 (EARS 포맷 rules/ 포함, 정책 목록)
├── spec-technical.md         # 기술 스펙 (API, DB 스키마, 인터페이스)
├── spec-quality.md           # 품질 스펙 (SLA, 성능, 보안, 컴플라이언스)
├── ai-ready-report.json      # AI-Ready 6기준 채점 결과
├── source-manifest.json      # 원천 출처 목록 + Source-First 마커
├── reconciliation.json       # SOURCE_MISSING/DOC_ONLY/DIVERGENCE 해소 기록
└── README.md                 # 패키지 사용 가이드 (serviceId, contractVersion, gateStatus)
```

### 4.2 투입 가능 조건 (Gate)

Foundry-X는 아래 조건을 모두 충족한 Handoff Package만 수용한다:

| 조건 | 값 | 비고 |
|------|-----|------|
| `ai-ready-report.json`.`overall` | **≥ 0.75** | 미달 시 Foundry-X 투입 금지 |
| `source-manifest.json`.`traceability` | **= 1.0** (100%) | 출처 누락 0건 |
| `reconciliation.json`.`divergenceResolved` | **= true** | 미해소 DIVERGENCE 0건 |

### 4.3 ai-ready-report.json 스키마

```jsonc
{
  "serviceId": "lpon-payment",
  "contractVersion": "FX-SPEC-003/1.0",
  "criteria": {
    "completeness":   { "score": 0.95, "status": "Ready" },
    "accuracy":       { "score": 0.90, "status": "Ready" },
    "traceability":   { "score": 1.00, "status": "Ready" },
    "executability":  { "score": 0.82, "status": "Ready" },
    "testability":    { "score": 0.78, "status": "Conditional" },
    "consistency":    { "score": 0.88, "status": "Ready" }
  },
  "overall": 0.89,
  "status": "Ready",           // "Ready" | "Conditional" | "NotReady"
  "gatePass": true,
  "evaluatedAt": "2026-04-20T00:00:00Z"
}
```

### 4.4 source-manifest.json 스키마

```jsonc
{
  "orgId": "LPON",
  "serviceId": "lpon-payment",
  "sourceType": "java-spring-ast",  // "java-spring-ast" | "sql-ddl" | "document"
  "sourceRef": {
    "repo": "lpon-charge",
    "paths": ["src/main/java/com/lpon/payment/**"],
    "commitHash": ""          // 실 소스 커밋 해시 (접근 시 기재)
  },
  "markers": {
    "SOURCE_MISSING": [],     // 소스에 없고 문서에만 있는 항목
    "DOC_ONLY": [],           // 문서에만 있고 소스 미확인
    "DIVERGENCE": []          // 소스-문서 충돌 (해소 전)
  },
  "traceability": 1.0,
  "resolvedAt": "2026-04-20T00:00:00Z"
}
```

### 4.5 reconciliation.json 스키마

```jsonc
{
  "serviceId": "lpon-payment",
  "divergenceItems": [
    {
      "id": "DIV-001",
      "field": "refundPeriodDays",
      "sourceValue": 30,
      "docValue": 14,
      "resolution": "SOURCE_WINS",
      "resolvedBy": "Sinclair",
      "resolvedAt": "2026-04-20T00:00:00Z"
    }
  ],
  "divergenceResolved": true,
  "resolvedAt": "2026-04-20T00:00:00Z"
}
```

---

## 5. E2E 실행 인터페이스

### 5.1 Handoff 투입 — POST /prototype-jobs (F353 기존 엔드포인트 활용)

Foundry-X가 이미 구현한 `POST /prototype-jobs` (F353, Sprint 159)에 Handoff Package를 매핑한다.  
Foundry-X 측 신규 엔드포인트 개발 불필요.

**요청:**
```http
POST /prototype-jobs
Content-Type: application/json
X-Internal-Secret: {FOUNDRY_X_INTERNAL_SECRET}

{
  "prdTitle": "LPON 결제 서비스 Working Prototype — lpon-payment",
  "prdContent": "<spec-business.md 전문>",
  "metadata": {
    "handoffPackageUrl": "r2://handoff-packages/handoff-LPON-lpon-payment-20260420.zip",
    "serviceId": "lpon-payment",
    "orgId": "LPON",
    "contractVersion": "FX-SPEC-003/1.0",
    "aiReadyOverall": 0.89,
    "callbackUrl": "https://decode-x.workers.dev/callback/{job-id}"
  }
}
```

**응답:**
```json
{
  "jobId": "proto-lpon-payment-001",
  "status": "queued",
  "estimatedCompletionSeconds": 120,
  "callbackUrl": "/callback/proto-lpon-payment-001"
}
```

### 5.2 실행 결과 피드백 — /callback/{job-id}

Foundry-X는 Working Prototype 생성 완료 후 아래 엔드포인트를 호출한다.  
**Decode-X 구현 대상: `services/svc-skill` (Sprint 215)**

```http
POST https://decode-x.workers.dev/callback/{job-id}
Content-Type: application/json
X-Internal-Secret: {INTERNAL_API_SECRET}

{
  "jobId": "proto-lpon-payment-001",
  "serviceId": "lpon-payment",
  "verdict": "green",
  "syncResult": {
    "specMatch": 0.95,
    "codeMatch": 0.92,
    "testMatch": 0.88
  },
  "roundTripRate": 0.91,
  "prototypeUrl": "https://foundry-x.workers.dev/prototypes/proto-lpon-payment-001",
  "errors": [],
  "warnings": [],
  "completedAt": "2026-04-20T01:00:00Z"
}
```

---

## 6. Working Prototype 수용 기준

### 6.1 SyncResult Verdict 판정

| Verdict | 조건 | Decode-X 처리 |
|---------|------|--------------|
| `green` | 모든 `syncResult.*Match ≥ 0.9` **AND** `roundTripRate ≥ 0.9` | Sprint 216 하네스 입력, Phase 2 KPI 달성 |
| `yellow` | 하나 이상 `0.7 ≤ Match < 0.9` **OR** `0.7 ≤ roundTripRate < 0.9` | DIVERGENCE 항목 재검토 → 패키지 재생성 → 재투입 |
| `red` | 하나 이상 `Match < 0.7` **OR** `roundTripRate < 0.7` | §7 DIVERGENCE 처리 워크플로우 트리거 |

### 6.2 Phase 2 최종 KPI (Track B)

- Handoff 수용 응답 200: **1/1 (100%)**
- Working Prototype 생성 verdict: **green 또는 yellow**
- round-trip 일치율: **≥ 0.90**

---

## 7. DIVERGENCE 처리 워크플로우

`red` verdict 수신 또는 Gate 단계에서 미해소 DIVERGENCE 발견 시 아래 절차를 따른다.

```
DIVERGENCE 발생 감지
  ↓
1. source-manifest.json markers.DIVERGENCE에 항목 기록
   (field명, sourceValue, docValue, context)
2. reconciliation.json에 상세 충돌 정보 기재
3. Tacit Interview Agent (Sprint 5 MVP 확장)가
   질문 시나리오 생성 → HITL Reviewer 에스컬레이션
4. HITL Reviewer (Reviewer 역할, RBAC) 판단:
   - SOURCE_WINS: 소스 값 채택
   - DOC_WINS: 문서 값 채택 (사유 필수 기재)
   - MANUAL_MERGE: 3-way merge (새 값 직접 입력)
5. reconciliation.json 갱신
   - resolution: "SOURCE_WINS" | "DOC_WINS" | "MANUAL_MERGE"
   - resolvedBy, resolvedAt 기재
6. spec-business.md 업데이트
7. reconciliation.json.divergenceResolved = true 갱신
8. Handoff Package 재패키징 → 재투입
```

---

## 8. 버전 정책

| 변경 유형 | 예시 | 버전 범프 | 합의 필요 |
|----------|------|----------|----------|
| 서비스 추가/제거 (§3) | 새 서비스 ID 추가 | Minor | 양 팀 동의 |
| 스키마 선택적 필드 추가 | `metadata`에 새 필드 | Minor | 단독 가능 |
| 필드 제거 또는 타입 변경 | `aiReadyOverall` 제거 | **Major** | 양 팀 동의 필수 |
| KPI 임계값 변경 | `overall ≥ 0.75` → `≥ 0.80` | **Major** | 양 팀 동의 필수 |
| 오탈자·설명 보완 | 문구 수정 | Patch | 단독 가능 |

**Freeze 조건**: Sprint 212 착수 시점 이후 Major/Minor 변경 금지. Patch만 허용.

---

## 9. 서명

| 구분 | 내용 |
|------|------|
| **계약 코드** | FX-SPEC-003 |
| **버전** | v1.0 |
| **서명 방식** | Self-sign (1인 겸임 체제, Phase 0 Closure 선례 적용) |
| **서명자** | Sinclair Seo — Decode-X Lead / Foundry-X PM 겸임 |
| **서명일** | 2026-04-20 |
| **유효 범위** | Sprint 212 착수 전까지 Minor/Patch append 허용. Freeze 이후 Patch만. |

> 이 계약은 법적 구속력을 갖지 않으며, 양 팀 작업 방식·의존성 관리·품질 기준을 정의하는 **내부 운영 합의(Operational Agreement)**이다.
