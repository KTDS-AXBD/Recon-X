# AI-Ready PoC Accuracy Report (2026-04-22)

> **TD-43 DoD — Sprint 232 F402 실행분 증빙**
> 42 LLM 호출 실행 + 1건 수기 재채점 + 정확도 측정 + Phase 2 F356-B GO/NO-GO 판정
>
> **실행 환경**: OpenRouter API (TD-43 fallback, svc-llm-router Gateway 401 우회)
> **모델**: `anthropic/claude-haiku-4-5` (Haiku 4.5)
> **리포트**: `reports/ai-ready-poc-2026-04-22.json`

---

## Summary

| 항목 | 값 |
|------|---|
| 총 평가 | 7 spec-container × 6기준 = **42 점수** |
| 실 LLM 호출 | 42회 (중복 실행 포함 최대 48회 — 첫 max_tokens=512 lpon-charge JSON parse fail로 재실행) |
| 총 비용 | **$0.162** (Haiku 4.5 via OpenRouter, 실측) |
| 소요 시간 | **4분 17초** |
| LLM PASS | **1/7** (lpon-settlement 0.813), 평균 0.720 |
| 수기 검증 샘플 | **1건 × 6기준 = 6 pair** (14.3% of 7 ≥ 10%) |
| 일치 (\|diff\| ≤ 0.1) | **5/6 pair** |
| **정확도** | **83.3%** |
| **판정** | ✅ **GO** (Phase 2 F356-B 착수 근거 확보) |

---

## 수기 재채점 대상 1건

- [x] **lpon-charge** (6기준 × 1건 = 6 pair)
  - 선정 근거: SPEC TD-43 권장 + 중간 복잡도(charge-rules.md 8 BL + ES-CHARGE 9 Empty Slot 조합) + 충전 도메인 핵심
  - spec-container 내용: `provenance.yaml` + `rules/charge-rules.md` + `rules/ES-CHARGE-001~009.md` + `runbooks/ES-CHARGE-001~009.md` + `tests/ES-CHARGE-001~009.yaml` + `tests/contract/charge-contract.yaml`

---

## 기준별 정확도

| # | Criterion | LLM 점수 | 수기 점수 | \|diff\| | 일치 (≤0.1) |
|:-:|-----------|:-------:|:-------:|:-------:|:----------:|
| 1 | 소스코드 정합성 (`source_consistency`) | 0.42 | 0.70 | **0.28** | ❌ |
| 2 | 주석·문서 일치 (`comment_doc_alignment`) | 0.62 | 0.65 | 0.03 | ✅ |
| 3 | 입출력 구조 명확성 (`io_structure`) | 0.72 | 0.70 | 0.02 | ✅ |
| 4 | 예외·에러 핸들링 (`exception_handling`) | 0.82 | 0.85 | 0.03 | ✅ |
| 5 | 업무루틴 분리·재사용성 (`srp_reusability`) | 0.72 | 0.70 | 0.02 | ✅ |
| 6 | 테스트 가능성 (`testability`) | 0.72 | 0.75 | 0.03 | ✅ |
|   | **평균** | **0.670** | **0.725** | | **5/6** |

---

## 실패 Case 원인 분석 — source_consistency (|diff|=0.28)

### LLM 진단 요약
> Provenance의 `businessRules: BL-001~BL-008`이 `rules/ES-CHARGE-001~009.md`에 직접 매핑되지 않음. Empty Slot들은 BL 목록과 1:1 매핑되지 않음 → 0.42.

### 수기 반박 근거 (0.70이 타당한 이유)
1. **BL 원본은 `rules/charge-rules.md`에 표 형식으로 완전 정의**되어 있다 (8개 BL × 4열 condition/criteria/outcome/exception).
2. **ES-CHARGE-001~009는 BL 보완분**이지 대체분이 아니다 — 예: `ES-CHARGE-001.md` 본문에 "BL-002(출금 완료 시 충전 확정)는 정상 흐름만 정의하며, 동일 요청 재전송 시 중복 방지 규칙이 없다"라고 Empty Slot 탄생 근거를 명시.
3. **Provenance `rulesCoverage: 0.92`는 BL 8/8 전수 포함**의 정확한 표현이며 ES 추가분은 상위 메타.
4. LLM 프롬프트가 `rules/charge-rules.md`를 spec-container markdown 묶음에 포함시켰음에도 LLM이 이를 "ES와 동등한 compartment"로 취급하지 않고 ES만 분석함.

### 개선 방안 (Phase 2 F356-B 착수 전 권장)
- `services/svc-skill/src/ai-ready/prompts.ts`의 `source_consistency` rubric에 **"BL 원본 규칙(charge-rules.md 등 top-level rule file)과 Empty Slot 보완 규칙의 관계를 분리 평가"** 지시 추가.
- 또는 `sample-loader.ts`가 rules 중 `*-rules.md` 패턴을 `originalRules` 필드로 분리 제공 → prompts.ts에서 양쪽 비교하도록 구조화.
- 재측정: 프롬프트 개선 후 lpon-charge source_consistency만 재채점(1 LLM call, $0.001) → 0.65~0.75 범위로 진입 예측.

---

## 전체 7 spec-container LLM 점수 분포 (참고)

| skill | totalScore | passCount | overallPassed |
|-------|:---------:|:---------:|:-------------:|
| lpon-budget | 0.753 | 2/6 | ❌ |
| lpon-charge | 0.670 | 1/6 | ❌ |
| lpon-gift | 0.713 | 1/6 | ❌ |
| lpon-payment | 0.737 | 1/6 | ❌ |
| lpon-purchase | 0.737 | 2/6 | ❌ |
| lpon-refund | 0.620 | 0/6 | ❌ |
| **lpon-settlement** | **0.813** | **5/6** | **✅** |

평균 0.720, threshold 0.75 — 7개 중 1개(lpon-settlement)만 PASS.

> **주의**: 본 정확도 판정의 대상은 **채점기 신뢰도**(LLM vs 수기 일치율)이며, spec-container 품질 자체(F356-A 범위)가 아님. spec quality 개선은 converter.ts 후속 작업 또는 별도 Fill Sprint 대상.

---

## Phase 2 권고

- [x] ✅ **GO → F356-B 착수 승인** (정확도 83.3% ≥ 80%)
  - 다만 **프롬프트 rubric 개선 1건 선행 권장** (source_consistency에서 BL 원본 vs ES 관계 분리 평가 지시) — F356-B 착수 전 30분 작업
- [ ] iterate (60~80%) — 해당 없음
- [ ] 재설계 (< 60%) — 해당 없음

### F356-B (전수 배치) 예상 규모
- 대상: LPON 859 skill × 6기준 = **5,154 호출**
- 모델: Haiku 4.5 via OpenRouter (svc-llm-router 복구 전)
- 예상 비용: $0.162 × (5,154 / 42) ≈ **$19.87** (일 $30 가드 하단 통과)
- 예상 소요: 4분 17초 × (5,154 / 42) ≈ **8시간 45분** (배치 병렬화 없이)

### 선행 리스크
1. **svc-llm-router Gateway 401** (TD-44 신규 등록 필요) — 장기적으로는 svc-llm-router 경유가 정상 경로. OpenRouter fallback은 임시.
2. **`.env` ANTHROPIC_API_KEY 401** (의존 없음, Anthropic 직접 호출 포기하고 OpenRouter 경로 확정).
3. **max_tokens=512 → 1500 상향 영향** — Phase 2에서도 1500 유지 필요(Haiku rationale이 400~1000 tokens 빈번).

---

## Appendix — 실행 트레이스

### 1차 시도: svc-llm-router production
```
curl /complete → HTTP 502 UPSTREAM_ERROR
Upstream error from google: HTTP 401 (CF AI Gateway error code 2009)
```
→ Cloudflare AI Gateway 인증 깨짐. svc-llm-router 디렉토리는 이 리포에서 externalized (wrangler.toml 없음).

### 2차 시도: Anthropic Direct API
```
curl api.anthropic.com/v1/messages → HTTP 401 authentication_error
"invalid x-api-key"
```
→ `.env ANTHROPIC_API_KEY` 만료/무효.

### 3차 시도: OpenRouter (✅ 성공)
```
curl openrouter.ai/api/v1/chat/completions → HTTP 200
Model: anthropic/claude-haiku-4-5 via .dev.vars OPENROUTER_API_KEY
```
→ 42 호출 완료, `reports/ai-ready-poc-2026-04-22.json` 생성 (53,205 bytes).

### 코드 변경 최소 범위
- `scripts/ai-ready/evaluate.ts`: `--direct-anthropic` + `--openrouter` 플래그 추가, `callAnthropicDirect` + `callOpenRouterJson` 함수 추가, `callLlmJson` 분기 확장.
- 기존 svc-llm-router 경로 보존 (인프라 복구 후 flag 없이 실행하면 production 경로 회귀).
