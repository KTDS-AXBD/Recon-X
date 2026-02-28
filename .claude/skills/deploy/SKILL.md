---
name: deploy
user-invocable: true
description: Cloudflare Workers/Pages 배포 수행. CI/CD (GitHub Actions) 기반. --preview 옵션으로 프리뷰 배포 가능.
---

# Deploy — Cloudflare 배포 (CI/CD)

`git push origin main` → GitHub Actions가 자동으로 lint/typecheck/test/deploy를 수행한다.
프리뷰 배포는 로컬에서 직접 wrangler로 배포한다.

## Arguments

`$ARGUMENTS`가 `--preview`를 포함하면 프리뷰 배포, 아니면 프로덕션 배포.

## Steps

### 1. 미커밋 변경사항 확인 및 커밋

```bash
git status
```

미커밋 변경사항이 있으면:
- 변경 내용을 분석하여 적절한 커밋 메시지 작성
- `git add` → `git commit` 수행

### 2. Lint 검사

```bash
bun run lint
```

에러 발견 시 해당 파일 수정 후 재실행. 수정 후에도 실패하면 사용자에게 보고.

### 3. 타입 체크

```bash
bun run typecheck
```

에러 발견 시 해당 파일 수정 후 재실행. 수정 후에도 실패하면 사용자에게 보고.

### 4. 테스트 실행

```bash
bun run test
```

실패 시 원인 파악 후 수정. 환경 문제(D1 바인딩 등)로 인한 실패는 사용자에게 안내.

### 5. DB 마이그레이션 확인

D1 마이그레이션 변경이 있는지 확인:

```bash
git diff --name-only HEAD~1 -- services/*/migrations/
```

변경이 있으면 사용자에게 `wrangler d1 migrations apply` 실행 필요 여부를 안내한다.

### 6. 배포

`$ARGUMENTS`에 `--preview` 포함 여부에 따라 분기:

- **프로덕션** (CI/CD):
  ```bash
  git push origin main
  ```
  Push하면 GitHub Actions가 자동으로:
  1. Install → Lint → Typecheck → Test → Deploy 수행
  2. 배포 결과를 Job Summary에 기록

- **프리뷰** (로컬, 특정 서비스):
  ```bash
  cd services/svc-<name>
  CLOUDFLARE_API_TOKEN="..." wrangler deploy
  ```

### 7. 배포 모니터링 (프로덕션만)

```bash
gh run watch
```

GitHub Actions 파이프라인 진행 상황을 실시간으로 확인한다.
`gh run list --limit 1`로 최근 실행 상태도 확인 가능.

### 8. 결과 안내

배포 완료 후:
- 프로덕션: 각 서비스 Workers URL 접근 가능 여부 확인 후 안내
- 프리뷰: wrangler 출력에서 배포 URL 추출하여 안내
- 실패 시: GitHub Actions 로그 확인 방법 안내 (`gh run view --log-failed`)
