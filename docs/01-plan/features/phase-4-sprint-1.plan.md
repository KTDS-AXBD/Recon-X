# Phase 4 Sprint 1 — 퇴직연금 문서 스케일업

> **Summary**: screen-design-parser 완성(테스트+배포) + Tier 1 문서 11건 배치 투입 + 추출 품질 검증. 퇴직연금 실문서 990건 완파를 위한 첫 스프린트.
>
> **Project**: RES AI Foundry
> **Version**: v1.0 (Phase 4 Sprint 1)
> **Author**: Sinclair Seo
> **Date**: 2026-03-04
> **Status**: Draft
> **Duration**: 1주 (Sprint)
> **Depends On**: Phase 3 Sprint 3 완료, screen-design-parser WIP 코드

---

## 0. Key Decisions

| 항목 | 결정 | 근거 |
|------|------|------|
| **Sprint 목표** | Tier 1 문서 11건 투입 + 추출 품질 검증 | 도메인 뼈대 확보가 최우선 — 990건 완파의 기반 |
| **전략** | 깊이 우선 (Depth-first) | 퇴직연금 단일 도메인에서 실사용 가능한 Skill 자산 확보 |
| **파서 전략** | WIP screen-design-parser 완성 + 프로그램설계서 메타 강화 | 화면설계서 462건(58%)이 가장 큰 볼륨 |
| **배치 실행** | 수동 curl 업로드 (자동화는 Sprint 2) | Sprint 1은 11건이므로 수동 충분, 자동화 ROI 낮음 |

---

## 1. Problem Statement

### 현황
- **처리 완료**: 13/~990건 (활용률 1.3%)
- **도메인 뼈대 부재**: Context Boundary, 요구사항정의서 등 핵심 문서 미투입
- **파서 병목**: 화면설계서 전용 파서 구현 완료(WIP)이나 테스트/배포 미완
- **품질 미검증**: 새 파서의 실문서 추출 품질 확인 필요

### Sprint 1에서 해결할 것
1. screen-design-parser 완성 (테스트 → 배포)
2. Tier 1 문서 11건 배치 투입 → 5-Stage 파이프라인 실행
3. 추출 결과 품질 확인 + Policy 후보 생성 확인

---

## 2. Scope

### In Scope
1. **screen-design-parser 테스트 작성** — 단위 테스트 20+ 케이스
2. **프로그램설계서 메타 강화** — R3~R4 메타데이터 분리
3. **Staging 배포 + 검증** — 12 Workers + D1 마이그레이션(필요시)
4. **Production 배포**
5. **Batch 3 실행** — Tier 1 문서 11건 Production 업로드
6. **결과 검증** — 추출 품질 + Policy 후보 수 + Skill 생성 확인

### Out of Scope (Sprint 2 이후)
- 배치 업로드 자동화 스크립트
- Tier 2-3 문서 투입 (16+70건)
- SCDSA002 비표준 XLSX 복호화
- 배치설계서/단위테스트 전용 파서

---

## 3. Tier 1 문서 목록 (11건)

| # | 파일 | 형식 | 크기 | 핵심 가치 |
|---|------|------|------|-----------|
| P1 | Context Boundary 정의.docx | docx | 59KB | 10 서브도메인 요구사항 + 프로세스 경로 |
| P2 | DDD 설계 - 퇴직연금 도메인 분석.docx | docx | 16KB | Core/Support 도메인 구조 |
| P3 | 요구사항정의서 V1.0 | xlsx | 264KB | 공식 요구사항 목록 |
| P4 | Gap분석서 V1.0 | xlsx | 531KB | AS-IS → TO-BE 차이 → 정책 추출 |
| P5 | 테이블정의서 | xlsx | 2.6MB | 엔티티-관계 구조 |
| P6 | 테이블목록 | xlsx | 227KB | 테이블-업무영역 매핑 |
| P7 | 인터페이스목록 V1.1 | xlsx | 176KB | 시스템간 연동 포인트 |
| P8 | 메뉴구조도 V1.1 | xlsx | 229KB | 화면-기능 계층 구조 |
| P9 | 코드정의서 V1.0 | xlsx | 1.6MB | 도메인 코드 체계 → Ontology |
| P10 | 요구사항추적표 V1.2 | xlsx | 436KB | 요구사항-설계-테스트 추적 |
| P11 | 인덱스정의서 | xlsx | 633KB | 데이터 접근 패턴 |

**기대 효과**: 도메인 전체 뼈대 + Policy 후보 200+ 건

---

## 4. Implementation Tasks

### Day 1-2: 파서 완성

#### Task 1: screen-design-parser 단위 테스트
- **파일**: `services/svc-ingestion/src/parsing/screen-design.test.ts` (신규)
- **테스트 케이스**:
  - `shouldSkipSheet()`: 표지/제개정이력/샘플/작성가이드/명명규칙 + 정상 시트 통과
  - `detectSections()`: 섹션 마커 감지, 빈 시트, 섹션 없는 시트
  - `extractScreenMeta()`: 메타 추출 (화면명, ID, 분류, 서비스클래스)
  - `parseDataFields()`: §3 데이터 구성항목 테이블 추출
  - `parseProcessingLogic()`: §4 처리로직 테이블 추출
  - `extractKeyValuePairs()`: §1 레이아웃 KV 쌍 추출
  - `parseScreenDesign()`: 전체 통합 테스트 (다중 시트)
- **목표**: 20+ 테스트 케이스

#### Task 2: xlsx.ts 노이즈 시트 스킵 반영 확인
- `parseXlsx()`에서 `shouldSkipSheet()` 호출 확인 (이미 import 됨)
- 기존 32개 xlsx.test.ts 회귀 테스트 통과

#### Task 3: 프로그램설계서 메타데이터 강화
- **파일**: `services/svc-ingestion/src/parsing/xlsx.ts`
- R3~R4 메타데이터 → `XlProgramMeta` element 분리
- R6+ 데이터만 Markdown 테이블 변환

### Day 3: 배포 + 검증

#### Task 4: typecheck + lint + 전체 테스트
- `bun run typecheck && bun run lint && bun run test`

#### Task 5: Staging 배포 + 샘플 검증
- 12 Workers staging 배포
- 화면설계서 샘플 1건 업로드 → 파싱 결과 확인 (XlScreenMeta, XlScreenLogic 등)

#### Task 6: Production 배포
- CI/CD 또는 수동 배포
- health check 13/13

### Day 4-5: Batch 3 실행 + 검증

#### Task 7: Tier 1 문서 11건 업로드
- Production에 curl로 순차 업로드
- 조직: `org-mirae-pension` (기존) 또는 신규 org
- 파이프라인 자동 실행 대기 (Queue event chain)

#### Task 8: 결과 검증
- Stage 2 Extraction 결과 확인 (프로세스/엔티티/규칙 수)
- Stage 3 Policy 후보 생성 확인
- Stage 4 Ontology 용어 추가 확인
- Stage 5 Skill 생성 확인
- Analysis Report에서 품질 확인

#### Task 9: 품질 메트릭 기록
- 기존 134+ policies → Batch 3 후 예상 334+ policies
- terms 증가량 확인
- extraction 품질 비교 (docx vs xlsx)

---

## 5. Success Criteria

| 지표 | 목표 |
|------|------|
| screen-design-parser 테스트 | >= 20개 PASS |
| 기존 xlsx.test.ts 회귀 | 32/32 PASS |
| 전체 테스트 | 1,090+ (기존 1,071 + 신규 20+) |
| Tier 1 문서 파싱 성공률 | 11/11 (100%) |
| Policy 후보 생성 | >= 200 신규 (기존 134+ 에 추가) |
| Staging + Production 배포 | 13/13 healthy |
| typecheck + lint | PASS |

---

## 6. Risk & Mitigation

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Tier 1 xlsx가 비표준 레이아웃 | 파싱 실패 | 범용 parseXlsx fallback (화면설계 외 subtype) |
| Context Boundary docx 파싱 품질 | Stage 2 추출 부정확 | Unstructured.io + Claude Vision 병용 |
| 대용량 xlsx (2.6MB 테이블정의서) | 파싱 타임아웃 | SheetJS는 동기 → Workers 30s CPU 내 처리 가능 |
| LLM 크레딧 부족 | Stage 3 Policy 추론 실패 | OpenAI fallback 사용 (현재 정상) |
| Queue 이벤트 지연 | 결과 확인 대기 | max 90초, 11건이므로 총 ~15분 |

---

## 7. Sprint 2 Preview (다음 주)

Sprint 1 결과에 따라:
- Tier 2 문서 16건 (업무별 화면/배치 목록) 투입
- Tier 3 문서 70건 (화면설계서 대표 샘플) 투입
- 배치 업로드 자동화 스크립트 작성
- HITL 리뷰 대량 처리 UX 개선
- Cross-Org 비교 (현대해상 191건 → Sprint 3)
