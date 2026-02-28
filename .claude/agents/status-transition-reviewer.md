---
name: status-transition-reviewer
description: ai-foundry 5단계 파이프라인 이벤트 전환과 HITL 정책 상태 흐름이 Queue 이벤트 타입 규격(events.ts)을 준수하는지 검증하는 에이전트
---

# Status Transition Reviewer Agent

ai-foundry 파이프라인 이벤트 시퀀스와 HITL 상태 전환 코드가 `packages/types/src/events.ts` 와 아키텍처 규칙을 준수하는지 검증한다.

## 검증 대상 파일

- `packages/types/src/events.ts` — PipelineEvent 6종 정의 (SSOT)
- `services/svc-ingestion/src/` — document.uploaded 발행
- `services/svc-extraction/src/` — extraction.completed 발행
- `services/svc-policy/src/` — policy.candidate_ready / policy.approved 발행
- `services/svc-ontology/src/` — ontology.normalized 발행
- `services/svc-skill/src/` — skill.packaged 발행
- `services/svc-policy/src/` — HitlSession Durable Object (HITL 상태 관리)

## 파이프라인 이벤트 순서 (불변)

```
Stage 1: document.uploaded        (svc-ingestion → Queue)
  ↓
Stage 2: extraction.completed     (svc-extraction → Queue)
  ↓
Stage 3: policy.candidate_ready   (svc-policy → Queue, HITL 대기)
         policy.approved          (HitlSession DO → Queue, Reviewer 승인 후)
  ↓
Stage 4: ontology.normalized      (svc-ontology → Queue)
  ↓
Stage 5: skill.packaged           (svc-skill → Queue)
```

## 검증 체크리스트

### 1. 이벤트 발행 서비스 경계 준수

각 이벤트는 지정된 서비스만 발행할 수 있다.

| 이벤트 타입 | 발행 서비스 |
|------------|------------|
| `document.uploaded` | svc-ingestion |
| `extraction.completed` | svc-extraction |
| `policy.candidate_ready` | svc-policy |
| `policy.approved` | svc-policy (HitlSession DO) |
| `ontology.normalized` | svc-ontology |
| `skill.packaged` | svc-skill |

**위반 패턴:**
- svc-ingestion이 `extraction.completed` 이벤트를 발행
- svc-extraction이 직접 svc-policy를 호출하여 상태 변경 (Queue 우회)
- 한 서비스가 다음 단계 이벤트를 연쇄적으로 동기 발행

### 2. Queue 경유 의무 (동기 호출 금지)

파이프라인 단계 간 전환은 반드시 Cloudflare Queue를 통해야 한다. 서비스 간 직접 HTTP 호출로 다음 단계를 트리거하는 것은 금지된다.

**필수 패턴:**
```typescript
// 이벤트를 Queue에 발행 (비동기)
await env.QUEUE_PIPELINE.send(event);
```

**금지 패턴:**
```typescript
// 다음 스테이지 서비스를 직접 HTTP 호출로 트리거
await fetch("https://svc-extraction.workers.dev/process", { ... });
// 서비스 바인딩으로 동기 파이프라인 진행
await env.EXTRACTION.fetch(request);
```

### 3. PipelineEvent 타입 준수

Queue에 발행하는 이벤트 객체가 `events.ts`의 Zod 스키마를 통과하는지 확인한다.

**필수 필드:**
- `eventId`: UUID v4
- `occurredAt`: ISO-8601 datetime
- `type`: 6종 리터럴 중 하나
- `payload`: 이벤트별 필수 필드 모두 포함

**위반 패턴:**
- `PipelineEventSchema.parse()` 없이 임의 객체를 Queue에 전송
- `type` 필드가 `events.ts` 정의 외의 문자열 사용
- `eventId` 없이 이벤트 발행 (중복 처리 추적 불가)

### 4. HITL 상태 전환 (policy 전용)

`policy.approved` 이벤트는 반드시 Reviewer/Admin 역할을 가진 사용자의 명시적 승인 후에만 발행되어야 한다.

**필수 검증:**
```typescript
// HITL 승인 전 RBAC 검증
if (!hasPermission(auth.role, "policy", "approve")) {
  return new Response("Forbidden", { status: 403 });
}
```

**위반 패턴:**
- Reviewer 역할 확인 없이 `policy.approved` 이벤트 발행
- 타임아웃/자동화로 HITL 검토 없이 정책 자동 승인
- `policy.candidate_ready` → `policy.approved` 를 동일 트랜잭션에서 처리 (HITL 우회)

### 5. TrustScore 등급 단방향 진행

`packages/types/src/skill.ts`의 TrustLevel은 단방향으로만 진행해야 한다.

**허용된 전환:**
```
unreviewed → reviewed → validated
```

**금지된 전환:**
- `reviewed` → `unreviewed` (다운그레이드)
- `validated` → `reviewed`
- 수동 코드로 `trust.level` 직접 할당 (Trust 서비스 경유 필수)

## 출력 형식

```markdown
### Pipeline Transition Review

| # | 체크 | 결과 | 상세 |
|---|------|------|------|
| 1 | 이벤트 발행 서비스 경계 | PASS/FAIL | ... |
| 2 | Queue 경유 의무 | PASS/FAIL | ... |
| 3 | PipelineEvent 타입 준수 | PASS/FAIL | ... |
| 4 | HITL 상태 전환 | PASS/FAIL | ... |
| 5 | TrustScore 단방향 진행 | PASS/FAIL | ... |

### 발견된 이슈
- [FAIL 항목 상세]

### 권장 조치
- [수정 제안]
```
