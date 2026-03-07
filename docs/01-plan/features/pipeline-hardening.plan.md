---
code: AIF-PLAN-002
title: "Pipeline Hardening"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-08
updated: 2026-03-08
author: Sinclair Seo
---

# Plan: pipeline-hardening

## Overview
Phase 2-D 실제 퇴직연금 문서 파일럿에서 발견된 3가지 파이프라인 안정성 이슈를 수정한다.

## Issues

### Issue 1: HITL DO 세션 자동 만료
- **문제**: svc-policy의 Durable Object HITL 세션이 완료/거절 없이 방치되면 영구 대기 상태
- **해결**: 7일 TTL 알람 + 자동 expired 전환 + 만료 세션 관리 API

### Issue 2: SCDSA002 비표준 XLSX 포맷 검증
- **문제**: 퇴직연금 프로젝트 일부 XLSX 파일이 표준 PK(ZIP) 헤더가 아닌 SCDSA002로 시작 → Unstructured.io 파싱 실패
- **해결**: magic bytes 사전 검증 + 구조화된 에러 분류(error_type) + D1 스키마 확장

### Issue 3: 대용량 PDF 524 타임아웃
- **문제**: 2.8MB+ PDF 파싱 시 Unstructured.io가 524 timeout 반환
- **해결**: AbortController 60s 타임아웃 + 지수 백오프 재시도 (max 2회)

### Issue 4: Anthropic 크레딧 소진 (운영)
- **상태**: Out of scope — 이미 세션 046에서 멀티 프로바이더 fallback으로 해결

## Scope
- svc-ingestion: Issue 2, 3
- svc-policy: Issue 1
- packages/types: 변경 없음
- D1 migration: db-ingestion에 error_type 컬럼 추가

## Success Criteria
- 전체 typecheck PASS (16/16)
- 전체 테스트 PASS (기존 822+ 유지)
- 신규 테스트 추가: validator, alarm 관련
