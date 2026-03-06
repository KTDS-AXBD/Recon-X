# v0.7.4 LPON Fact Check + Spec Export 데모 시나리오

> 작성일: 2026-03-06
> 대상: KTDS AX BD팀 내부 데모
> URL: https://ai-foundry.minu.best
> 소요시간: ~15분

---

## 데모 개요

LPON(전자식 온누리상품권 플랫폼)의 **소스코드 2,612개 Java 파일**과 **SI 문서 62건**을 자동 분석하여:
1. 소스↔문서 간 **Gap(불일치)** 자동 탐지
2. **API/Table Spec** 자동 생성 + Core 분류
3. **KPI 대시보드**로 품질 측정
4. **Export 패키지**로 산출물 제공

---

## 데모 플로우

### Scene 1: 로그인 + Organization 선택 (1분)

**목적**: RBAC 역할 기반 접근 시연

1. https://ai-foundry.minu.best 접속
2. **조영빈** (Analyst 역할)으로 로그인
3. 좌측 상단 Organization Selector에서 **LPON** 선택
4. Dashboard 진입 → 전체 현황 카드 확인

> **포인트**: 7명 실팀원, 5개 RBAC 역할(Analyst, Reviewer, Developer, Client, Executive). 역할에 따라 메뉴/기능이 달라짐.

---

### Scene 2: 소스코드 업로드 현황 (2분)

**목적**: Stage 1-B (소스코드 파싱) 결과 확인

1. 좌측 메뉴 **Source Upload** 클릭
2. 이미 업로드된 LPON 소스코드 목록 확인:
   - 25개 ZIP (2,612 Java files)
   - 59/62 문서 파싱 완료, 3건 실패 (SDS 암호화)
3. **파싱 결과 설명**:
   - Controller 163개 → API 230개 추출
   - MyBatis XML → Table 152개 추출
   - Transaction, VO/DTO 모델 등 구조 분석 완료

> **포인트**: Regex-based AST로 Java 파싱 — Workers 환경에서 Tree-sitter WASM 없이 동작. MyBatis XML에서 테이블 정의 추출.

---

### Scene 3: Fact Check Dashboard (4분) ★핵심

**목적**: 소스↔문서 Gap 자동 탐지 결과 시연

1. 좌측 메뉴 **Fact Check** 클릭
2. **Summary KPI 카드** 확인:
   - Average Coverage: ~30%
   - Total Gaps: 365건
   - HIGH Gaps: 271건
3. **Result 선택** → 최신 result (`c37c2c54`) 클릭
4. **Gap 목록** 확인:
   - 필터: Type(MID/MC/PM) × Severity(HIGH/MEDIUM/LOW)
   - MID (Missing in Document): 272건 — 소스에만 있고 문서에 없는 API
   - MC (Missing Column): 11건 — 테이블 컬럼 불일치
   - PM (Parameter Mismatch): 87건 (86건은 VO body로 LOW severity)
5. **Gap 상세** 클릭 → source_item과 document_item 비교 화면
6. **LLM Match 버튼** 클릭 설명 (이미 실행 완료, +17건 매칭)

> **포인트**: 2단계 매칭 — Step 1(구조적 exact+fuzzy) + Step 2(LLM semantic). URL hostname 정규화, 버전 패턴 매칭, method-augmented 패턴 등 규칙 기반 최적화. LLM은 ROI 대비 보조적 역할(6% vs 구조적 84%).

> **핵심 메시지**: "소스코드에는 230개 API가 있는데, SI 문서에는 109개 항목만 기술되어 있습니다. 이 121개 Gap을 자동으로 찾아냈습니다."

---

### Scene 4: Spec Catalog (3분)

**목적**: API/Table 자동 분류(Core/Non-core) 확인

1. 좌측 메뉴 **Spec Catalog** 클릭
2. **KPI 카드** 확인:
   - API Coverage: Core API 137/230 (59.6%)
   - Table Coverage: Core Table 53/152 (34.9%)
3. **API Specs 탭**:
   - classification 필터: Core → 127개 (Core API만 표시)
   - 검색: "charge" → 충전 관련 API 필터링
   - 각 API의 endpoint, httpMethod, sourceLocation, factCheck, confidence 확인
4. **Table Specs 탭**:
   - 152개 테이블 목록 (MyBatis XML 기반)

> **포인트**: 3-criteria 자동 분류 — 외부 API(1점) + Core Entity(1점) + Transaction(1점). 2점 이상이면 Core. PM이 수동 분류 없이 자동으로 핵심 API/Table을 식별.

---

### Scene 5: Export Center (3분)

**목적**: Spec Package 생성 + KPI + PM 승인 게이트

1. 좌측 메뉴 **Export Center** 클릭
2. **KPI Dashboard** 확인 (5개 지표):
   - API Coverage: 45.2% (목표 80%) ← structural + LLM match
   - Table Coverage: 7.2% (목표 80%)
   - Gap Precision: 0% (리뷰어 확인 미실행)
   - Reviewer Accept: 0% → HITL 리뷰 이후 측정
   - Edit Time Cut: 0% → 실측 필요
3. **Create Package** 버튼 → "Demo package" 입력 → 생성
4. **Package List**에서 생성된 패키지 확인
5. **다운로드 시연**: 4개 파일
   - `spec-api.json` (184KB, OpenAPI 3.0, 230 APIs)
   - `spec-table.json` (309KB, 152 tables)
   - `fact-check-report.md` (140KB, Markdown 리포트)
   - `spec-summary.csv` (35KB, 엑셀 호환)
6. **Approval Gate** (역할 전환):
   - 패키지 선택 → "Request Approval" 클릭
   - 윤재영 PM (Executive 역할)으로 로그인 전환
   - Approve / Reject 버튼 시연

> **포인트**: PM 승인 없이는 Export 불가. 승인 로그가 localStorage에 기록되어 감사 추적 가능. 향후 D1 기반으로 전환 예정.

---

### Scene 6: AI Chat (1분, 선택)

**목적**: Tool Use Agent 시연

1. 우측 하단 **AI Chat 위젯** 클릭
2. "LPON 충전 관련 API를 알려줘" 입력
3. 7 tools × 6 services 연동 → 실시간 응답

---

## 데모 준비 체크리스트

- [x] Production 12/12 services healthy
- [x] LPON org 소스코드 25 zips 업로드 완료
- [x] Fact Check 실행 완료 (365 gaps)
- [x] LLM Semantic Match 실행 완료 (+17건)
- [x] `/specs/classified` 엔드포인트 수정 배포 (BUG-1)
- [x] `/export/spec-package` organizationId 수정 배포 (BUG-2)
- [x] Export 패키지 재생성 (`pkg-275fee8a`, `pkg-8a13decc`)
- [x] KPI Dashboard 정상 (API 90.4% PASS, Table 100% PASS)
- [x] Fact Check 페이지 브라우저 E2E 확인 (BUG-5 수정: camelCase 정합 + URL path 수정)
- [x] Spec Catalog 페이지 브라우저 E2E 확인 (230 APIs, 152 Tables 정상 렌더링)
- [x] Export Center 패키지 생성 + 다운로드 브라우저 확인 (4 packages, 다운로드 버튼 정상)
- [ ] AI Chat Widget 동작 확인

## 주요 수치

| 지표 | 값 | 비고 |
|------|-----|------|
| 소스코드 | 2,612 Java files | 25 ZIP uploads |
| SI 문서 | 62건 (59 parsed) | 3건 SDS 암호화 실패 |
| 추출 API | 230개 | 163 Controllers |
| 추출 Table | 152개 | MyBatis XML 기반 |
| Core API | 137/230 (59.6%) | 자동 분류 |
| Core Table | 53/152 (34.9%) | 자동 분류 |
| 구조적 매칭 | 98건 (25.7%) | exact + fuzzy + URL normalize |
| LLM 매칭 | +17건 (6%) | Sonnet semantic match |
| Overall Coverage | 115/382 (30.1%) | 소스 기준 |
| API Coverage (KPI) | 45.2% | 104/230 (matched/total source APIs) |
| Table Coverage (KPI) | 7.2% | 11/152 (matched/total source Tables) |
| Gap 분포 | HIGH 271, MED 11, LOW 88 | Total 365 (after dedup + PM fix) |
| Export 패키지 | 4 files | spec-api, spec-table, report, csv |

## 데모 시 주의사항

1. **Organization 선택 필수**: LPON을 선택하지 않으면 데이터가 없음
2. **역할 전환**: Approval Gate 시연 시 Executive 역할 계정으로 재로그인 필요
3. **Coverage 수치 차이 설명**: KPI(45.2%)와 Export(42.6%)는 LLM match delta 보정 때문 → "구조적 매칭 후 LLM으로 추가 매칭"으로 설명
4. **Table Coverage 낮은 이유**: LPON 문서에 테이블 정의가 거의 없음 (109개 문서 항목 중 대부분 API). 소스의 152개 테이블 중 11개만 문서에 존재
5. **Gap Precision 0%**: 리뷰어가 아직 gap을 confirm/dismiss하지 않음 → HITL 리뷰 프로세스 설명
