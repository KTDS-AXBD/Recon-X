---
code: AIF-ANLY-provenance-coverage-req036
title: AIF-REQ-036 Provenance 실측 — Spec→Source 역추적 스키마 갭 분석
version: 1.0
status: Active
category: ANALYSIS
system-version: 0.7.0
created: 2026-04-21
updated: 2026-04-21
author: Sinclair Seo
related:
  - SPEC.md §7 AIF-REQ-036
  - SPEC.md §6 Phase 8 (F364 신규)
  - docs/req-interview/decode-x-v1.3-phase-3-ux/prd-final.md
  - packages/types/src/skill.ts
  - services/svc-skill/src/converter.ts
  - .decode-x/spec-containers/lpon-*/provenance.yaml
---

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

`ProvenanceSchema` (`:58-66`)도 `sourceDocumentIds: string[]`만 보유. **어떤 수준에서도 라인 범위 필드가 없음.**

→ PRD v0.1 §2의 "우측 소스 줄 하이라이트" 요구사항은 **현 스키마로 불가능**.

### 2.2 원천(spec-container)도 라인 범위 미보유

`.decode-x/spec-containers/lpon-charge/provenance.yaml:8-13`:

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

`infra/migrations/db-skill/0001_init.sql` + 0008까지 누적: `r2_key`, `domain`, `trust_score`, `spec_container_id`(0008 신설) 등 카탈로그 메타만. provenance 전체 객체는 R2 JSON에만 존재.

### 2.4 상류 파이프라인(Stage 1~3) 라인 추적 부재

`svc-ingestion`은 청크 단위 분할까지만 수행. `svc-extraction`/`svc-policy`는 LLM 프롬프트 입력에 "source excerpt" 전달은 하지만, **원본 문서 내 라인 오프셋을 보존하는 로직 없음**. 즉, 상류에서부터 라인 범위 데이터가 생성되지 않음.

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

- Split View 우측 = **재구성 마크다운**(반제품-스펙/*/*.md) + section heading 앵커 스크롤만 제공.
- "원본 소스 줄 하이라이트" / "원본 산출물 페이지 앵커"는 MVP **제외**. PRD §2 재작성 필요.
- KPI "Spec→Source 클릭 ≤3" 판정 기준을 **재구성 마크다운 문서 도달 + section heading 포커스**로 재정의.

### 4.2 F364 신규 등록 (Phase 4+ 이관)

**F364 — Provenance v2: sourceLineRange 스키마 + 상류 파이프라인 라인 추적**

- `PolicySchema.source.lineRange: { start: number; end: number }` 추가 (optional → 마이그레이션 후 required)
- `svc-ingestion`에서 청크 분할 시 라인 오프셋 보존 → `svc-extraction`/`svc-policy` LLM 프롬프트에 라인 정보 주입 → 결과에 역참조 저장
- `svc-skill/converter.ts`에서 spec-container ↔ SkillPackage 변환 시 라인 정보 유지
- D1 마이그레이션 신설 (skills 테이블 or 별도 `skill_source_lines` 테이블)
- 예상 규모: **2~3 Sprint** (Stage 1~3 전반 변경 + 기존 3,924 skill 재생성 또는 점진 마이그레이션)
- 우선순위: **P2** (AIF-REQ-036 MVP 완결 후 착수)

### 4.3 F365 선택적 — pageRef 채움률 실측 (선제)

F364 착수 전 production 10건 샘플(pension/giftvoucher) `Policy.source.pageRef` 채움률 측정. 30% 미만이면 F364에 "pageRef 보완" 포함, 30% 이상이면 F364 MVP에서 pageRef는 "있으면 사용, 없으면 section 대체" 패턴 채택. 예상 1h.

## 5. AIF-REQ-036 PRD 수정 지시

`docs/req-interview/decode-x-v1.3-phase-3-ux/prd-final.md`:

1. §1 "핵심 검증 워크플로우" — "원본 소스 줄 하이라이트" 문구 제거, "재구성 마크다운 section 앵커 스크롤"로 교체
2. §2 "Spec→Source Split View" — 좌측/우측 구조 재정의, "원본 SI 산출물(DOCX/PPT) 연결"은 Out-of-Scope로 명시
3. §10 리스크 — "Provenance 불완전성" 리스크를 **실측 결과 반영**으로 갱신. "sourceLineRange 스키마 부재 확정, F364로 분리" 명시
4. Ambiguity 재추정: 0.10(v0.1 자체 추정) → 스코프 축소 후 R1/R2에서 재평가

## 6. 결론

| 항목 | 결과 |
|---|---|
| sourceLineRange 채움률 | **0% (스키마 부재)** |
| pageRef 채움률 | 미측정 (production 샘플링 선택 사항, F365) |
| documentId 채움률 | 100% (스키마 required) |
| **AIF-REQ-036 MVP 실행 가능 여부** | ✅ 스코프 축소 후 실행 가능 |
| F-item 분리 필요성 | ✅ 확정 — F364 신규 등록 |
| 60% 임계값 판정 | **FAIL** (sourceLineRange 부재) → F364 분리 **필수** |

다음 액션: (1) F364 SPEC.md §7 등록, (2) AIF-REQ-036 상태 주석에 실측 결과 반영, (3) PRD §2/§10 재작성 후 R1 실행.
