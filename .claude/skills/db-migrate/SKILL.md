---
name: db-migrate
description: Wrangler D1 마이그레이션 생성 → 로컬 적용 → 검증을 한 번에 수행. 스키마 변경 후 사용.
argument-hint: "<서비스명> <마이그레이션명>"
user-invocable: true
---

# db-migrate — D1 마이그레이션 원스텝 실행

서비스의 D1 스키마 변경 후, 마이그레이션 생성부터 로컬 적용/검증까지 한 번에 수행합니다.

## Arguments

`$ARGUMENTS` 형식: `<서비스명> <마이그레이션명>`
- 예: `/db-migrate svc-ingestion add-processing-status`
- 서비스명이 없으면 사용자에게 질문

## Steps

### 1. 대상 서비스 확인

```bash
ls services/$SERVICE_NAME/wrangler.toml
```

`wrangler.toml`에서 D1 바인딩 정보를 확인:
```bash
grep -A5 'd1_databases' services/$SERVICE_NAME/wrangler.toml
```

### 2. 마이그레이션 파일 생성

```bash
cd services/$SERVICE_NAME
wrangler d1 migrations create $DB_NAME $MIGRATION_NAME
```

생성된 SQL 파일 경로를 확인하고, 기존 마이그레이션 시퀀스와 연속되는지 점검:
```bash
ls services/$SERVICE_NAME/migrations/
```

### 3. SQL 작성

생성된 빈 SQL 파일에 DDL을 작성합니다.
- `CREATE TABLE`, `ALTER TABLE` 등 스키마 변경 SQL
- 기존 테이블 구조를 먼저 확인하여 충돌 방지
- `IF NOT EXISTS` 활용 권장

### 4. 로컬 D1에 적용

```bash
cd services/$SERVICE_NAME
wrangler d1 migrations apply $DB_NAME --local
```

### 5. 검증

```bash
bun run typecheck
```

타입 에러 없는지 확인. 서비스 코드가 새 스키마에 맞게 업데이트되어야 할 수 있음.

### 6. 결과 출력

```
## D1 마이그레이션 완료

- 서비스: $SERVICE_NAME
- DB: $DB_NAME
- 파일: migrations/NNNN_$MIGRATION_NAME.sql
- 로컬 적용: OK
- typecheck: PASS

### 프로덕션 적용 안내
프로덕션 DB에 적용하려면:
```bash
cd services/$SERVICE_NAME
CLOUDFLARE_API_TOKEN="..." wrangler d1 migrations apply $DB_NAME --remote
```
```

## 주의사항

- 각 서비스는 독립 D1 DB를 사용 (`db-ingestion`, `db-security` 등)
- 마이그레이션 시퀀스 번호에 공백이 없어야 함 (0001, 0002, 0003...)
- `--remote` 적용은 사용자 확인 후에만 수행
- `migration-checker` 에이전트가 시퀀스 무결성을 자동 검증함
