# SPEC.md — res-ai-foundry

> Single Source of Truth (SSOT) for implementation status, architecture decisions, and execution plan.
> Product/requirement authority: `docs/AI_Foundry_PRD_TDS_v0.6.docx`

---

## 1) Project Summary

- **Project**: RES AI Foundry
- **Repo**: `AX-BD-Team/res-ai-foundry`
- **Goal**: SI 산출물에서 암묵지를 추출해 재사용 가능한 Skill 자산으로 패키징
- **Domain Pilot**: 퇴직연금
- **Current Phase**: Pre-development (초기 스캐폴딩 완료)

---

## 2) Scope (v0)

### In Scope
- PRD 기반 아키텍처 구체화
- 모노레포 초기 구조 설계
- Stage 1~2 우선 구현 준비
- 보안/거버넌스/평가 모델의 최소 실행 골격

### Out of Scope (초기)
- 프로덕션 데이터 실투입
- 전 기능 동시 구현
- 고도화 대시보드/고급 자동화

---

## 3) Architecture Baseline

- 6-Layer System + 5-Stage Pipeline + 10 SVC(Workers)
- Infra: Cloudflare Workers/Queues/DO/D1/R2/KV + AI Gateway + Neo4j Aura
- LLM Tiering: Opus / Sonnet-Haiku / Workers AI

참고 문서: `CLAUDE.md`, `docs/AI_Foundry_PRD_TDS_v0.6.docx`

---

## 4) Engineering Principles

1. **Spec-Driven Development (SDD) 우선**: 구현 전 SPEC 업데이트
2. **작게 구현, 빠르게 검증**: 작은 단위 commit + 즉시 검증
3. **보안/감사 선반영**: 마스킹, 감사로그, 권한 모델을 후순위로 미루지 않음
4. **재현성**: 로컬/WSL/Windows 환경에서 동일 절차 문서화
5. **변경 이력 분리**: SPEC은 상태/계획, 세션 로그는 `docs/CHANGELOG.md`

---

## 5) Current Status (session-end에서 숫자 갱신)

- **Last Updated**: 2026-02-26
- **Repo Bootstrap**: ✅
- **PRD Seed Document**: ✅ (`docs/AI_Foundry_PRD_TDS_v0.6.docx`)
- **.claude Skills/Agents Migration**: ✅
- **Core App Code**: 0%
- **CI/CD**: 0%
- **Test Coverage**: 0%

---

## 6) Execution Plan (next)

### Phase A — Foundation Setup
- [ ] monorepo 디렉토리 구조 확정
- [ ] package manager / workspace 전략 확정
- [ ] 공통 lint/typecheck/test 기준 확정
- [ ] env/dev/stage/prod 설정 뼈대

### Phase B — Pipeline First Slice
- [ ] SVC-01 ingestion skeleton
- [ ] SVC-02 extraction skeleton
- [ ] Queue event contract v0 정의

### Phase C — Governance Baseline
- [ ] Prompt Registry 구조
- [ ] Audit log schema
- [ ] Masking middleware 최소 구현

---

## 7) Risks & Assumptions

- PRD가 docx 단일 문서이므로 초기에 구조화 전환 필요
- Neo4j/Cloudflare/Anthropic 연동의 초기 비용/제약 확인 필요
- HITL UX 범위가 넓어 MVP 범위 고정 필요

---

## 8) Decision Log (요약)

- 2026-02-26: 신규 repo 생성 및 PRD seed 문서 반입
- 2026-02-26: Discovery-X 기반 Claude Code 운영 체계(.claude skills/agents) 이식
