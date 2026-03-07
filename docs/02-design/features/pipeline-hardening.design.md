---
code: AIF-DSGN-002
title: "Pipeline Hardening Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-08
updated: 2026-03-08
author: Sinclair Seo
---

# Design: pipeline-hardening

## References
- Plan: `docs/01-plan/features/pipeline-hardening.plan.md`

---

## Issue 1: HITL DO 세션 자동 만료

### 설계
- **파일**: `services/svc-policy/src/hitl-session.ts`
- **SessionStatus 타입**: `"open" | "in_progress" | "completed" | "rejected"` 에 `"expired"` 추가
- **TTL**: `SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000` (7일)
- **알람 설정**: `init()` 메서드에서 `this.state.storage.setAlarm(Date.now() + SESSION_TTL_MS)` 호출
- **알람 핸들러**: `alarm()` 메서드 구현 — 현재 상태가 `open` 또는 `in_progress`이면 `expired`로 전환, `expiredAt` 타임스탬프 기록
- **알람 해제**: `recordAction()` 에서 완료/거절 시 `this.state.storage.deleteAlarm()` 호출
- **만료 세션 거부**: `assign()`, `recordAction()` 에서 `expired` 상태이면 410 Gone 반환
- **getStatus()**: `expiredAt` 필드 추가

### 라우트 확장
- **파일**: `services/svc-policy/src/routes/hitl.ts`
- 기존 세션 조회 쿼리: `status != 'completed'` → `status NOT IN ('completed', 'expired')` 변경
- `handleListExpiredSessions(request, env)`: GET /hitl/expired — D1에서 7일 이상 경과한 open/in_progress 세션 조회
- `handleCleanupExpiredSessions(request, env)`: POST /hitl/cleanup — D1에서 stale 세션을 bulk expired 처리

### 라우트 등록
- **파일**: `services/svc-policy/src/index.ts`
- import에 `handleListExpiredSessions`, `handleCleanupExpiredSessions` 추가
- `GET /hitl/expired` 라우트 등록
- `POST /hitl/cleanup` 라우트 등록

### 테스트
- **파일**: `services/svc-policy/src/hitl-session.test.ts`
- mock state에 `setAlarm`, `deleteAlarm`, `getAlarm` 메서드 추가
- 테스트 케이스:
  1. init() 시 알람 설정 확인
  2. alarm() 시 open 세션 → expired 전환
  3. alarm() 시 in_progress 세션 → expired 전환
  4. alarm() 시 completed 세션은 변경 없음
  5. expired 세션에 assign() → 410 반환
  6. expired 세션에 recordAction() → 410 반환
  7. 완료 시 알람 해제 확인

---

## Issue 2: SCDSA002 비표준 파일 포맷 사전 검증

### Magic Bytes 검증 모듈
- **파일**: `services/svc-ingestion/src/parsing/validator.ts` (신규)
- **타입**: `ErrorType = "format_invalid" | "parse_error" | "timeout" | "network_error"`
- **타입**: `ValidationResult = { valid: boolean; label: string | null; error: string | null }`
- **SIGNATURES**: 파일 타입별 magic bytes 매핑
  - xlsx/docx/pptx: `[0x50, 0x4B, 0x03, 0x04]` (ZIP/PK)
  - xls/ppt/doc: `[0xD0, 0xCF, 0x11, 0xE0]` (OLE2)
  - pdf: `[0x25, 0x50, 0x44, 0x46]` (%PDF)
  - png: `[0x89, 0x50, 0x4E, 0x47]` (PNG)
  - jpg/jpeg: `[0xFF, 0xD8, 0xFF]` (JPEG)
- **validateFileFormat(fileBytes, fileType)**: magic bytes 비교, 알 수 없는 타입(txt 등)은 항상 valid
- **classifyParseError(error)**: 에러를 ErrorType으로 분류 (AbortError→timeout, network→network_error, 기본→parse_error)

### Queue 처리 통합
- **파일**: `services/svc-ingestion/src/queue.ts`
- import: `validateFileFormat`, `classifyParseError`, `ErrorType` from validator
- 처리 순서 변경:
  1. R2에서 파일 가져오기
  2. **validateFileFormat() 호출** — 실패 시 `format_invalid` 에러로 D1 갱신 + 500 반환
  3. 대용량 파일 경고 로그 (2MB 초과)
  4. Unstructured.io 파싱
  5. 분류
  6. 청크 삽입
  7. 상태 갱신 → parsed
  8. ingestion.completed 이벤트 발행
- catch 블록: `classifyParseError(e)` 로 error_type 분류 + D1에 error_type 저장

### D1 마이그레이션
- **파일**: `infra/migrations/db-ingestion/0003_error_type.sql`
- `ALTER TABLE documents ADD COLUMN error_type TEXT`

### 테스트
- **파일**: `services/svc-ingestion/src/__tests__/validator.test.ts` (신규)
- 테스트 케이스:
  1. PDF magic bytes 인식
  2. OOXML (ZIP/PK) magic bytes 인식
  3. OLE2 magic bytes 인식
  4. PNG, JPEG magic bytes 인식
  5. SCDSA002 비표준 헤더 거부
  6. 0으로 채워진 헤더 거부
  7. 알 수 없는 파일 타입은 항상 valid
  8. 너무 작은 파일 거부 (4바이트 미만)
  9. classifyParseError: AbortError → timeout
  10. classifyParseError: network 에러 → network_error
  11. classifyParseError: 일반 에러 → parse_error

- **파일**: `services/svc-ingestion/src/__tests__/queue.test.ts` (수정)
- mock R2에 magic bytes 파라미터 추가
- PDF_MAGIC, OOXML_MAGIC 상수 추가
- SCDSA002 format_invalid 테스트 추가
- vi.mock 제거 → globalThis.fetch mock으로 대체 (Bun 테스트 격리 문제 해결)

---

## Issue 3: 대용량 PDF 타임아웃 + 재시도

### Unstructured.io 클라이언트 개선
- **파일**: `services/svc-ingestion/src/parsing/unstructured.ts`
- **상수**:
  - `PARSE_TIMEOUT_MS = 60_000` (60초)
  - `MAX_RETRIES = 2`
  - `BASE_DELAY_MS = 2_000` (2초)
- **parseDocument() 리팩토링**:
  - 재시도 루프: `for (attempt = 0; attempt <= MAX_RETRIES; attempt++)`
  - 지수 백오프: `BASE_DELAY_MS * Math.pow(2, attempt - 1)` → 2s, 4s
  - 재시도 가능 에러만 재시도, 비재시도 에러는 즉시 throw
- **fetchUnstructured() 분리** (내부 함수):
  - `AbortController` + `setTimeout` 으로 60초 타임아웃
  - `finally`에서 `clearTimeout()` 호출
  - Response 파싱 + UnstructuredElement[] 변환
- **isRetryableError(error)**: AbortError, 5xx 상태, network/fetch 에러 → true; 4xx 등 → false
- **sleep(ms)**: Promise 기반 대기

### 테스트
- **파일**: `services/svc-ingestion/src/__tests__/parsing.test.ts` (기존)
- parseDocument 테스트:
  1. API 키 없으면 빈 배열 반환
  2. API 키 있으면 Unstructured API 호출 + 응답 파싱
  3. API 에러 시 throw
  4. 누락된 type/text 필드 기본값 처리

---

## Implementation Order
1. `services/svc-ingestion/src/parsing/validator.ts` — 신규 모듈
2. `infra/migrations/db-ingestion/0003_error_type.sql` — D1 스키마
3. `services/svc-ingestion/src/queue.ts` — 검증 통합
4. `services/svc-ingestion/src/parsing/unstructured.ts` — 재시도+타임아웃
5. `services/svc-policy/src/hitl-session.ts` — 알람+만료
6. `services/svc-policy/src/routes/hitl.ts` — 라우트 확장
7. `services/svc-policy/src/index.ts` — 라우트 등록
8. 테스트 파일: validator.test.ts, queue.test.ts, parsing.test.ts, hitl-session.test.ts

## Verification
- `bun run typecheck` — 16/16 PASS
- `bun run test` — 전체 서비스 0 failures
- `bun run lint` — 에러 없음
