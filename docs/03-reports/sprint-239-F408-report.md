---
id: AIF-RPT-239
sprint: 239
f_item: F408
match_rate: 98
status: DONE
date: "2026-04-30"
session: 247
---

# Sprint 239 — F408 Complete Report

## 요약

TD-47 해소: evaluator R2 경로를 `spec-containers/{org}/{id}/manifest.json` (0건) →
`skill-packages/{id}.skill.json` (859건)으로 변경. Adapter 패턴으로 데이터 변환 분리.

## 구현 내용

### 신설 파일
- `services/svc-skill/src/ai-ready/spec-content-adapter.ts` — `SkillPackage` → `SpecContent` 변환
- `services/svc-skill/src/ai-ready/spec-content-adapter.test.ts` — 7 unit tests

### 수정 파일
- `services/svc-skill/src/ai-ready/evaluator.ts`
  - `loadSpecContent()` 교체 → `skill-packages/{skillId}.skill.json` 직접 파싱
  - `loadSpecContentLegacy()` 신설 → 기존 spec-containers 경로 보존 (Tier-A 디버깅용)
- `services/svc-skill/src/ai-ready/evaluator.test.ts` — 신규 동작 테스트 추가
- `services/svc-skill/src/routes/__tests__/ai-ready.test.ts` — R2 mock 갱신

### 변경하지 않은 파일 (backward-compatible)
- `routes/ai-ready.ts` — caller 그대로 (`loadSpecContent` import 유지)
- `queue/ai-ready-consumer.ts` — caller 그대로

## 검증 결과

| 항목 | 결과 |
|------|------|
| `pnpm typecheck` | ✅ 14/14 PASS |
| `pnpm test` (svc-skill) | ✅ 411/411 PASS |
| Gap Analysis Match Rate | ✅ 98% |

## Production Smoke (Master 독립 실측 필요)

```bash
curl -s -X POST \
  "https://recon-x-api.ktds-axbd.workers.dev/skills/4591b69e-4e6a-4ac8-8261-ce177c35f994/ai-ready/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: lpon" \
  -H "X-Internal-Secret: ${INTERNAL_API_SECRET}" \
  -d '{"model":"haiku","force":false}'
```

기대: HTTP 200 + 6기준 criteria 배열 + |Δscore vs S235 baseline (0.02)| ≤ 0.05

## 후속 Sprint

Sprint 240: F356-B Phase 2 전수 배치 실행 (TD-47 해소 후 착수 가능)
- `scripts/ai-ready/batch-evaluate.ts --env production --organization LPON`
- DoD: ai_ready_scores 5,154 row + reports/ 2종 파일
