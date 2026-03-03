# 퇴직연금 문서 파싱 품질 리포트

> Generated: 2026-03-04 03:55 KST
> Organization: Miraeasset
> Environment: Production

## 1. 업로드 요약

| Tier | 문서 유형 | 업로드 | 성공 | 실패 | 비고 |
|------|-----------|--------|------|------|------|
| 1 | 핵심 산출물 (ERD, 테이블, 개발가이드 등) | 17 | 10 | 7 | SCDSA002 4건 + timeout 3건 |
| 2 | 목록류 (화면/배치JOB/메뉴/Gap분석) | 22 | 22 | 0 | 전량 내부 파서 |
| 3 | 화면설계서 | 456 | ~450 | ~6 | PPTX 확장자 혼동 6건 |
| 4 | 프로그램/배치설계서 | 151 | 151 | 0 | comma 파일 3건 사전 정제 |
| 5 | 단위테스트케이스 | 129 | 129 | 0 | comma 파일 2건 사전 정제 |
| 추가 | ERD Schema (xsd→txt 변환) | 1 | 1 | 0 | 1,205 테이블 스키마 |
| **합계** | | **776** | **~763** | **~13** | |

## 2. 전체 파싱 상태 (Production DB 기준)

| 지표 | 값 |
|------|-----|
| 총 문서 수 | 1,300 |
| Parsed | 1,278 (98.3%) |
| Failed | 21 (1.6%) |
| Pending | 1 (0.1%) |
| 고유 문서명 | 856 |
| 중복 문서 | 444 (Tier 3 재업로드 사고) |
| 총 용량 | 475.6 MB |
| 평균 파일 크기 | 374.6 KB |

## 3. 문서 분류별 분포

| 분류 | 건수 | 비중 |
|------|------|------|
| 화면설계서 | 973 | 74.8% |
| 프로그램설계서 | 134 | 10.3% |
| 단위테스트케이스 | 129 | 9.9% |
| 배치설계서 | 17 | 1.3% |
| 기타 | 16 | 1.2% |
| 화면목록 | 8 | 0.6% |
| 배치JOB목록 | 7 | 0.5% |
| Gap분석서 | 7 | 0.5% |
| ERD/테이블 | 4 | 0.3% |
| 개발가이드 | 3 | 0.2% |
| 메뉴구조도 | 2 | 0.2% |

## 4. 파일 형식별 분포

| 형식 | 건수 | 파서 | 비용 |
|------|------|------|------|
| xlsx | 1,279 | 내부 (screen-design / generic xlsx) | $0 |
| pptx | 12 | Unstructured.io | ~$0.06 |
| docx | 7 | Unstructured.io | ~$0.04 |
| txt | 2 | 내부 (plain text) | $0 |
| **합계** | **1,300** | | **~$0.10** |

## 5. 실패 문서 분석 (21건)

### 5a. SCDSA002 암호화 (4건) — SKIP
Samsung SDS 암호화 파일. 복호화 키 없이 파싱 불가. 사용자 결정: **skip**.

- 메뉴구조도 (V1.1)
- 인덱스정의서 (V1.0)
- 테이블목록 (V1.1)
- 테이블정의서 (V1.1)

### 5b. 대용량 DOCX timeout (3건)
Unstructured.io 처리 시간 초과 (Workers Queue 30s limit).

| 파일 | 크기 |
|------|------|
| 개발가이드_UI_v1.1 | 8.6 MB |
| 개발가이드_배치_v1.1 | 5.6 MB |
| 개발가이드_온라인_v1.3 | 16.2 MB |

**해결 방안**: 내부 DOCX 파서 (R-3 개발 완료) Production 배포 후 재시도.

### 5c. PPTX 확장자 혼동 (6건)
`.pptx` 파일이 파일명 변환 과정에서 `.xlsx`로 잘못 매핑되어 xlsx 파서에 투입 → 실패.
모바일패드 영업지원시스템 화면설계서 6건 (실제 PPTX).

### 5d. PPTX 파싱 실패 (8건)
정상적으로 pptx로 인식된 파일이나 Unstructured.io 처리 실패.
동일 모바일패드 PPTX 파일의 중복 업로드분.

## 6. 화면설계서 샘플 품질 (10건)

| 문서 | Chunks | Avg Words | 주요 Element |
|------|--------|-----------|-------------|
| BDPYDL0050M1 (DC언번들세금확인) | 5 | 29 | XlScreenMeta |
| BOGOOD0100M1 (주식상품등록) | 13 | 48 | XlScreenMeta |
| BDPYDL0010M1 (지급지시) | 13 | 60 | XlScreenMeta |
| EICTIF0204M1 (영업일보) | 6 | 38 | XlScreenMeta |
| EIGDEC0101M1 (당사상품제공현황) | 4 | 63 | XlScreenMeta |
| EICTDC0102M1 (계약서류발행관리) | 2 | 41 | XlScreenMeta |
| BDOPOR3400M0 (보유상품+부담금변경) | 10 | 54 | XlScreenMeta |
| BDPYDL0110M1 (지급조서다운및수정) | 8 | 20 | XlScreenMeta |
| EIADMN0101M1 (사용자등록및수정) | 4 | 37 | XlScreenMeta |
| BOGOOD0150M1 (특별계정펀드등록) | 4 | 33 | XlScreenMeta |

**판정**: 10/10 정상. screen-design 파서가 XlScreenMeta 타입으로 메타+컨트롤+이벤트 구조 추출.

## 7. 비용 집계

| 항목 | 비용 |
|------|------|
| Stage 1 (Ingestion) — 내부 파서 | $0 |
| Stage 1 (Ingestion) — Unstructured.io | ~$0.10 |
| LLM (Anthropic/OpenAI) | $0 |
| **총 비용** | **~$0.10** |

## 8. Stage 2 투입 추천

### 즉시 투입 가능 (Tier 1+2 = 32건)
Stage 2 (Structure Extraction)에 바로 투입할 수 있는 핵심 산출물:

| 문서 유형 | 건수 | 우선순위 |
|-----------|------|----------|
| Gap분석서(법인) | 6 | P1 — 업무 요구사항 + As-Is/To-Be |
| 화면목록 | 8 | P1 — 화면-업무 매핑 |
| 배치JOB목록 | 7 | P1 — 배치 업무 흐름 |
| 메뉴구조도 | 1 | P2 — UI 구조 |
| ERD Schema (xsd 변환) | 1 | P2 — 테이블 간 관계 (1,205 tables) |
| ERD 추출 (strings) | 1 | P3 — 보조 |
| 개발가이드 (parsed) | 4 | P3 — 기술 규약 |

### 2차 투입 (Tier 3 = 화면설계서 ~450건)
구조 추출이 화면단위 정책 도출에 필수. 단, 비용 고려:
- Sonnet/Haiku 호출 ~ $0.01~0.05/건
- 450건 × $0.03 avg ≈ **~$13.50**

### 3차 투입 (Tier 4+5 = 280건)
프로그램설계서 134 + 배치설계서 17 + 단위테스트 129. 정책 도출 보조자료.

## 9. 알려진 이슈

1. **중복 문서 444건**: Tier 3 재업로드 사고로 발생. 동일 document_id가 아닌 별도 레코드이므로, Stage 2 투입 시 중복 제거 필요.
2. **SCDSA002 Detection 미배포**: Production에서 `encrypted_scdsa002` 대신 `format_invalid`로 분류됨. R-3 배포 시 함께 수정 필요.
3. **classification = 'general'**: 전 문서가 `general`로 분류됨. screen-design 파서의 chunk는 `XlScreenMeta` element_type으로 구분되지만, classifier의 xlsx 분류 로직이 화면설계서 패턴을 `screen-design`으로 분류하지 않음.

## 10. 다음 단계

1. ~~R-9, R-10 업로드~~ ✅
2. 내부 DOCX 파서 Production 배포 → 개발가이드 3건 재파싱
3. 중복 문서 정리 (444건 중복 제거 스크립트)
4. Stage 2 투입: Tier 1+2 핵심 32건부터 시작
5. classifier 개선: 화면설계서/프로그램설계서/배치설계서 분류 추가
