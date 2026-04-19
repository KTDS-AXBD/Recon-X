---
code: FX-SPEC-003
title: FX-SPEC-003 Decode-X Handoff Contract — Decode-X 미러
version: 1.0
status: SIGNED
source: docs/specs/FX-SPEC-003-handoff-contract.md
synced-at: 2026-04-20
---

# FX-SPEC-003 Decode-X 측 미러

> **이 문서는 `docs/specs/FX-SPEC-003-handoff-contract.md`의 Decode-X repo 미러입니다.**
> 계약 내용은 원본을 참조하세요. 이 파일은 운영 메모와 링크만 포함합니다.

**원본 위치**: `docs/specs/FX-SPEC-003-handoff-contract.md`  
**Foundry-X repo 목표 경로**: `Foundry-X/docs/specs/FX-SPEC-003-handoff-contract.md` (동기화 대기)  
**계약 버전**: v1.0 (2026-04-20 self-sign)  
**Freeze 예정**: Sprint 212 착수 시 (현재: 미동결)

---

## Decode-X 측 운영 메모

### 이행 의무

1. **Gate 통과 확인 필수** — `ai-ready-report.json.overall ≥ 0.75` 없이 Handoff 투입 금지
2. **Source-First 마커 완전 기재** — `source-manifest.json.traceability === 1.0` 유지
3. **DIVERGENCE 선해소** — `reconciliation.json.divergenceResolved === true` 확인 후 패키징
4. **/callback 수신 구현** — Sprint 215에서 `services/svc-skill` 콜백 엔드포인트 구현 예정

### Sprint별 이행 일정

| Sprint | 관련 의무 | 대상 서비스 |
|--------|-----------|-------------|
| 211 | 계약 발행 (이 문서) | — |
| 212 | Source-First AST 파서 구축 | lpon-payment (Track B 선행) |
| 213 | ERWin DDL 파서 PoC | lpon-settlement |
| 214a | Tier-A Fill (예산, 구매) | lpon-budget, lpon-purchase |
| 214b | Tier-A Fill (결제, 환불) | lpon-payment, lpon-refund |
| 214c | Tier-A Fill (선물, 정산) | lpon-gift, lpon-settlement |
| 215 | /callback 엔드포인트 + Track B E2E Handoff | lpon-payment |
| 216 | round-trip 검증 하네스 | lpon-payment |

### 관련 문서

- `docs/specs/FX-SPEC-003-handoff-contract.md` — 계약 원본
- `docs/contracts/foundry-x-mou.v0.2-draft.md` — 협력 MoU v0.2 (상위 컨텍스트)
- `docs/poc/handoff-package-format.md` — Handoff Package 포맷 PoC (Phase 1 산출물)
- `docs/req-interview/decode-x-v1.3-phase-2/prd-final.md` — Phase 2 PRD

### Foundry-X 동기화 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Foundry-X repo 미러 | 대기 중 | `/ax:git-sync` 사용 예정 |
| FX-SPEC-002 (기존) | 동결 유지 | v1.0 @ e5c7260, 변경 없음 |
