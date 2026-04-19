---
id: DESIGN-SPRINT-211
title: Sprint 211 Design — FX-SPEC-003 Handoff Contract
sprint: 211
req: AIF-REQ-035
status: IN_PROGRESS
created: 2026-04-20
author: Sinclair (세션 217)
---

# Sprint 211 Design — FX-SPEC-003 Handoff Contract

## 1. 설계 개요

FX-SPEC-003 Decode-X↔Foundry-X Handoff Contract를 신규 발행한다.  
FX-SPEC-002 (PlumbBridge Plumb Output Contract, v1.0 @ commit e5c7260) 는 변경 없이 동결 유지.

계약 문서 2종:
1. **원본**: `docs/specs/FX-SPEC-003-handoff-contract.md`
2. **Decode-X 미러**: `docs/mou/FX-SPEC-003.md`

## 2. 계약 구조 (FX-SPEC-003 v1.0)

### 2.1 문서 헤더

```yaml
code: FX-SPEC-003
version: 1.0
status: SIGNED (self-sign, Sinclair / 2026-04-20)
frozen: false  # Sprint 212 착수 전까지 minor append 허용
supersedes: ~  # FX-SPEC-002는 별도 계약, 상하관계 없음
```

### 2.2 섹션 구성

| § | 제목 | 핵심 내용 |
|---|------|-----------|
| 1 | 목적 | Decode-X Handoff Package 생산 규격 + Foundry-X 수용 기준 |
| 2 | 당사자 | Decode-X (Producer) + Foundry-X (Consumer) |
| 3 | Tier-A 6개 서비스 특성 | 도메인 맥락, 입력 채널, Empty Slot 범위 |
| 4 | Handoff Package 스키마 | 파일 구조, JSON Schema, AI-Ready 기준 |
| 5 | E2E 실행 인터페이스 | POST /prototype-jobs 포맷, /callback 피드백 루프 |
| 6 | Working Prototype 수용 기준 | SyncResult verdict 판정, round-trip KPI |
| 7 | DIVERGENCE 처리 | 3종 마커, HITL 3-way merge 워크플로우 |
| 8 | 버전 정책 | Breaking/Non-breaking, freeze 조건 |
| 9 | 서명 | Self-sign 기록 |

## 3. Tier-A 6개 서비스 상세

| 서비스 ID | 한글명 | 도메인 | 입력 채널 | 예상 Empty Slot 수 |
|-----------|--------|--------|-----------|-------------------|
| lpon-budget | 예산 | 온누리상품권 예산 관리 | Java/Spring 소스 | 2~3 |
| lpon-purchase | 구매 | 상품권 구매 처리 | Java/Spring 소스 | 2~3 |
| lpon-payment | 결제 | 결제 승인/처리 (Track B 핵심) | Java/Spring 소스 | 3~4 |
| lpon-refund | 환불 | 환불 처리 및 취소 | Java/Spring 소스 | 2~3 |
| lpon-gift | 선물 | 상품권 선물/이전 | Java/Spring 소스 | 2~3 |
| lpon-settlement | 정산 | 정산 배치 처리 | Java/Spring 소스 + ERWin DDL | 3~4 |

## 4. Handoff Package 스키마 설계

### 4.1 파일 구조 (기존 handoff-package-format.md 기반 확장)

```
handoff-{orgId}-{serviceId}-{date}.zip
├── spec-business.md          # 업무 스펙 (EARS 포맷 rules/ 포함)
├── spec-technical.md         # 기술 스펙 (API, DB, 인터페이스)
├── spec-quality.md           # 품질 스펙 (SLA, 성능, 보안)
├── ai-ready-report.json      # AI-Ready 6기준 채점 결과
├── source-manifest.json      # 원천 출처 + Source-First 마커
├── reconciliation.json       # SOURCE_MISSING/DOC_ONLY/DIVERGENCE 목록
└── README.md                 # 패키지 사용 가이드
```

### 4.2 투입 가능 조건 (Gate)

- `ai-ready-report.json`.`overall >= 0.75` — 미달 시 Foundry-X 투입 금지
- `source-manifest.json`.`traceability === 100%` — 출처 누락 시 투입 금지
- `reconciliation.json`.`divergenceResolved === true` — 미해소 DIVERGENCE 있으면 투입 금지

### 4.3 source-manifest.json 스키마

```jsonc
{
  "orgId": "LPON",
  "serviceId": "lpon-payment",
  "sourceType": "java-spring-ast",   // "java-spring-ast" | "sql-ddl" | "document"
  "markers": {
    "SOURCE_MISSING": [...],   // 소스에 없고 문서에만 있는 항목
    "DOC_ONLY": [...],         // 문서에만 있고 소스 미확인
    "DIVERGENCE": [...]        // 소스와 문서 간 충돌
  },
  "traceability": 1.0,         // 0.0 ~ 1.0 (1.0 = 100%)
  "resolvedAt": "2026-04-20T00:00:00Z"
}
```

## 5. E2E 실행 인터페이스

### 5.1 Handoff 투입 (기존 POST /prototype-jobs F353 활용)

```http
POST /prototype-jobs
Content-Type: application/json
X-Internal-Secret: {INTERNAL_API_SECRET}

{
  "prdTitle": "LPON 결제 서비스 Working Prototype",
  "prdContent": "<spec-business.md 내용>",
  "handoffPackageUrl": "r2://handoff-packages/{handoff-id}.zip",
  "serviceId": "lpon-payment",
  "contractVersion": "FX-SPEC-003/1.0"
}
```

응답:
```json
{ "jobId": "proto-xxx", "status": "queued", "callbackUrl": "/callback/proto-xxx" }
```

### 5.2 피드백 루프 (/callback 엔드포인트)

Foundry-X 실행 완료 후 Decode-X `svc-skill`의 콜백 엔드포인트를 호출한다.

```http
POST /callback/{job-id}          # Decode-X svc-skill 수신 엔드포인트 (Sprint 215 구현)
Content-Type: application/json

{
  "jobId": "proto-xxx",
  "verdict": "green",            // "green" | "yellow" | "red"
  "syncResult": {
    "specMatch": 0.95,
    "codeMatch": 0.92,
    "testMatch": 0.88
  },
  "roundTripRate": 0.91,
  "errors": [],
  "completedAt": "2026-04-20T01:00:00Z"
}
```

### 5.3 Working Prototype 수용 기준 (SyncResult)

| Verdict | 조건 | Decode-X 처리 |
|---------|------|--------------|
| `green` | 모든 match ≥ 0.9 AND roundTripRate ≥ 0.9 | Sprint 216 하네스 입력 |
| `yellow` | 하나 이상 0.7~0.9 | DIVERGENCE 재검토 → 재투입 |
| `red` | 하나 이상 < 0.7 OR roundTripRate < 0.7 | HITL 3-way merge 트리거 |

## 6. DIVERGENCE 처리 워크플로우

```
DIVERGENCE 발생
  ↓
1. source-manifest.json에 DIVERGENCE 항목 기록
2. reconciliation.json에 충돌 상세 기재
3. Tacit Interview Agent가 질문 생성 (Sprint 5 MVP 확장)
4. HITL 리뷰어(Reviewer 역할) 판단
5. 3-way merge 결과 spec-business.md에 반영
6. reconciliation.json.divergenceResolved = true 갱신
7. Handoff Package 재패키징 → 재투입
```

## 7. 버전 정책

| 변경 유형 | 버전 범프 | 합의 필요 |
|----------|----------|----------|
| 새 서비스 추가 (§3) | Minor | 양 팀 동의 |
| 스키마 필드 추가 | Minor (선택적 필드) | 단독 가능 |
| 필드 제거/타입 변경 | Major | 양 팀 동의 필수 |
| KPI 임계값 변경 | Major | 양 팀 동의 필수 |
| 오탈자·설명 보완 | Patch | 단독 가능 |

freeze 조건: Sprint 212 착수 시점 (Major/Minor 변경 금지, Patch만 허용)

## 8. 파일 매핑 (Step 4 구현 대상)

| 파일 경로 | 액션 | 내용 |
|-----------|------|------|
| `docs/specs/FX-SPEC-003-handoff-contract.md` | CREATE | 계약 원본 전문 |
| `docs/mou/FX-SPEC-003.md` | CREATE | Decode-X 미러 (원본 링크 + 운영 메모) |

> **Worker 매핑 없음** — 코드 구현 불필요. 문서 2종 생성이 전부.

## 9. Gap 분석 기준 (Step 5 Analyze)

| 항목 | 기준 | 검증 방법 |
|------|------|----------|
| 계약 코드 명시 | `code: FX-SPEC-003` 존재 | grep |
| 버전 명시 | `version: 1.0` 존재 | grep |
| Tier-A 6개 서비스 모두 명시 | 6개 서비스 ID 모두 포함 | grep |
| Handoff Package 스키마 완전성 | 7개 필수 파일 모두 정의 | review |
| /callback 엔드포인트 명시 | `/callback/{job-id}` 존재 | grep |
| SyncResult 3 verdict 정의 | green/yellow/red 모두 존재 | grep |
| DIVERGENCE 워크플로우 | 3-way merge 언급 | grep |
| 서명 기록 | self-sign 날짜 존재 | grep |
| Decode-X 미러 존재 | `docs/mou/FX-SPEC-003.md` | ls |
