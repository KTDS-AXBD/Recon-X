---
name: migration-checker
description: 각 서비스의 D1 마이그레이션 파일(services/svc-*/migrations/*.sql)의 시퀀스 무결성과 wrangler.toml D1 바인딩 선언을 검증하는 에이전트. 마이그레이션 추가/수정 시 자동 호출.
---

# Migration Checker Agent

각 Cloudflare Workers 서비스의 D1 SQLite 마이그레이션 파일과 wrangler.toml 선언 간의 일관성을 검증한다.

## 검증 대상

- `services/svc-*/migrations/*.sql` — 서비스별 D1 마이그레이션 파일
- `services/svc-*/wrangler.toml` — D1 바인딩 선언 (`[[d1_databases]]`)

## 검증 로직

### 1. D1 바인딩 ↔ migrations/ 디렉토리 동기화

`wrangler.toml`에 `[[d1_databases]]` 바인딩이 있는 서비스는 반드시 `migrations/` 디렉토리와 최소 1개의 `.sql` 파일을 가져야 한다.

| 서비스 | D1 바인딩 | migrations/ |
|--------|----------|-------------|
| svc-ingestion | DB_INGESTION | migrations/0001_init.sql 등 |
| svc-extraction | DB_EXTRACTION | migrations/0001_init.sql 등 |
| svc-policy | DB_POLICY | migrations/0001_init.sql 등 |
| svc-ontology | DB_ONTOLOGY | migrations/0001_init.sql 등 |
| svc-skill | DB_SKILL | migrations/0001_init.sql 등 |
| svc-llm-router | DB_LLM | migrations/0001_init.sql 등 |
| svc-security | DB_SECURITY | migrations/0001_init.sql 등 |
| svc-governance | DB_GOVERNANCE | migrations/0001_init.sql 등 |
| svc-notification | DB_NOTIFICATION | migrations/0001_init.sql 등 |
| svc-analytics | DB_ANALYTICS | migrations/0001_init.sql 등 |

### 2. 마이그레이션 파일 시퀀스 검증

각 서비스의 `migrations/` 내 SQL 파일이 `NNNN_` 형식으로 번호가 매겨져 있고, 순서에 공백이 없는지 확인한다.

**올바른 패턴:**
```
0001_init.sql
0002_add_processing_status.sql
0003_add_audit_columns.sql
```

**오류 패턴:**
- `0001_init.sql` → `0003_foo.sql` (0002 누락)
- `init.sql` (번호 없음)
- `0001_init.sql`, `0001_other.sql` (중복 번호)

### 3. migrations_dir wrangler.toml 선언 확인

`wrangler.toml`에 `migrations_dir`가 명시되어 있는지 확인한다 (미선언 시 Wrangler 기본값 `migrations/` 사용).

```toml
# 명시적 선언 (권장)
[[d1_databases]]
binding = "DB_INGESTION"
database_name = "db-ingestion"
database_id = "..."
migrations_dir = "migrations"
```

## 출력 형식

### Migration Check: <service-name>

| 상태 | 파일 | 이유 |
|------|------|------|
| ✅ OK | 0001_init.sql | 정상 |
| ❌ MISSING | migrations/ | D1 바인딩 있으나 migrations/ 없음 |
| ❌ GAP | 0003_foo.sql | 0002가 없음 (시퀀스 공백) |
| ⚠️ WARN | 0001_init.sql | migrations_dir wrangler.toml 미선언 |

### 전체 결과 요약
- D1 바인딩 보유 서비스: N개
- migrations/ 정상: N개
- 시퀀스 오류: N개
- 누락된 migrations/: N개

### 수정 제안
누락/오류가 있으면 `/db-migrate` 스킬 또는 아래 명령을 안내한다:
```bash
# 새 마이그레이션 생성
wrangler d1 migrations create db-ingestion <migration-name>

# 로컬 적용
wrangler d1 migrations apply db-ingestion --local
```
