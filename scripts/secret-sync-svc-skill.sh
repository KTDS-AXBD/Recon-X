#!/usr/bin/env bash
# secret-sync-svc-skill.sh — svc-skill secret 양 env 동기 (default + --env production)
#
# 배경 (S246 + S260 누적 교훈):
#   wrangler `<name>` (default env) ↔ `<name>-production` (--env production)이 별개 secret store.
#   HTTP traffic은 default env가 받지만 Queue consumer는 --env production에서 실행 (wrangler.toml
#   `[env.production.queues.consumers]` 선언 시). rotation 시 한쪽만 갱신하면 silent fail 발생.
#
# 정본 위치:
#   ~/.secrets/decode-x-internal         — INTERNAL_API_SECRET (chmod 600)
#   ~/.secrets/openrouter-api-key        — OPENROUTER_API_KEY (chmod 600)
#   ~/.secrets/cf-ai-gateway-url         — CLOUDFLARE_AI_GATEWAY_URL (full path)
#                                          예: https://gateway.ai.cloudflare.com/v1/<acct>/<gw>/openrouter/v1/chat/completions
#
# 사용법:
#   bash scripts/secret-sync-svc-skill.sh                # dry-run, all envs
#   bash scripts/secret-sync-svc-skill.sh --apply        # 실제 wrangler secret put 실행
#   bash scripts/secret-sync-svc-skill.sh --apply --env production  # production만
#   bash scripts/secret-sync-svc-skill.sh --verify       # 동기화 후 양 env 단건 호출 비교
#
# 종료 코드: 0=성공, 1=설정 오류, 2=secret 미존재, 3=wrangler put 실패, 4=verify 실패

set -uo pipefail

# ---- 설정 ------------------------------------------------------------------
readonly SECRETS_DIR="${HOME}/.secrets"
readonly SERVICE_DIR="services/svc-skill"
readonly SCRIPT_NAME="$(basename "$0")"

# secret 매핑: <wrangler 이름>=<정본 파일 basename>
declare -A SECRETS=(
  [INTERNAL_API_SECRET]="decode-x-internal"
  [OPENROUTER_API_KEY]="openrouter-api-key"
  [CLOUDFLARE_AI_GATEWAY_URL]="cf-ai-gateway-url"
)

# 동기 대상 env (default + production이 표준, staging은 opt-in)
TARGET_ENVS=("default" "production")

# ---- 인자 파싱 -------------------------------------------------------------
APPLY=false
VERIFY=false
ONLY_ENV=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true; shift ;;
    --verify) VERIFY=true; shift ;;
    --env) ONLY_ENV="$2"; shift 2 ;;
    --include-staging) TARGET_ENVS+=("staging"); shift ;;
    -h|--help)
      grep -E "^# " "$0" | sed 's/^# //'
      exit 0 ;;
    *) echo "❌ 알 수 없는 인자: $1"; exit 1 ;;
  esac
done

if [[ -n "$ONLY_ENV" ]]; then
  TARGET_ENVS=("$ONLY_ENV")
fi

# ---- 사전 점검 -------------------------------------------------------------
echo "▶ ${SCRIPT_NAME} (apply=${APPLY}, verify=${VERIFY}, envs=${TARGET_ENVS[*]})"

if [[ ! -d "$SERVICE_DIR" ]]; then
  echo "❌ ${SERVICE_DIR} 미존재 — repo 루트에서 실행해야 함"
  exit 1
fi

if ! command -v wrangler >/dev/null 2>&1; then
  echo "❌ wrangler 미설치"
  exit 1
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "⚠️  CLOUDFLARE_API_TOKEN 미설정 — wrangler secret put 시 인증 필요"
fi

# secret 파일 모두 존재 + chmod 600 검증
echo ""
echo "▶ 정본 파일 점검 (${SECRETS_DIR})"
MISSING=0
for SECRET_NAME in "${!SECRETS[@]}"; do
  FILE_BASE="${SECRETS[$SECRET_NAME]}"
  FILE_PATH="${SECRETS_DIR}/${FILE_BASE}"

  if [[ ! -f "$FILE_PATH" ]]; then
    echo "  ❌ ${SECRET_NAME} → ${FILE_PATH} 미존재"
    MISSING=$((MISSING + 1))
    continue
  fi

  PERMS=$(stat -c "%a" "$FILE_PATH" 2>/dev/null || stat -f "%A" "$FILE_PATH" 2>/dev/null)
  SIZE=$(stat -c "%s" "$FILE_PATH" 2>/dev/null || stat -f "%z" "$FILE_PATH" 2>/dev/null)

  if [[ "$PERMS" != "600" ]]; then
    echo "  ⚠️  ${SECRET_NAME} → ${FILE_PATH} chmod ${PERMS} (600 권장) size=${SIZE}"
  else
    echo "  ✅ ${SECRET_NAME} → ${FILE_PATH} (chmod 600, size=${SIZE})"
  fi

  # CLOUDFLARE_AI_GATEWAY_URL은 full path 검증
  if [[ "$SECRET_NAME" == "CLOUDFLARE_AI_GATEWAY_URL" ]]; then
    URL_VAL=$(cat "$FILE_PATH")
    if [[ "$URL_VAL" != *"/openrouter/v1/chat/completions" ]]; then
      echo "    ⚠️  CLOUDFLARE_AI_GATEWAY_URL이 full chat-completions path가 아님 (S246 교훈)"
      echo "       기대: https://gateway.ai.cloudflare.com/v1/<acct>/<gw>/openrouter/v1/chat/completions"
      echo "       실제 끝부분: ${URL_VAL: -50}"
    fi
  fi
done

if [[ $MISSING -gt 0 ]]; then
  echo ""
  echo "❌ secret 정본 ${MISSING}건 누락 — ${SECRETS_DIR}에 chmod 600으로 생성 후 재실행"
  exit 2
fi

# ---- dry-run 출력 ----------------------------------------------------------
echo ""
echo "▶ 실행 계획 (apply=${APPLY})"
for ENV_NAME in "${TARGET_ENVS[@]}"; do
  for SECRET_NAME in "${!SECRETS[@]}"; do
    if [[ "$ENV_NAME" == "default" ]]; then
      echo "  wrangler secret put ${SECRET_NAME}                    # svc-skill default env"
    else
      echo "  wrangler secret put ${SECRET_NAME} --env ${ENV_NAME}    # svc-skill-${ENV_NAME}"
    fi
  done
done

if [[ "$APPLY" != true ]]; then
  echo ""
  echo "💡 dry-run 종료. 실제 적용은 --apply 추가"
  exit 0
fi

# ---- 실제 적용 -------------------------------------------------------------
echo ""
echo "▶ 적용 중 (CLOUDFLARE_API_TOKEN 인증 필요)"
cd "$SERVICE_DIR" || exit 1

FAIL=0
for ENV_NAME in "${TARGET_ENVS[@]}"; do
  for SECRET_NAME in "${!SECRETS[@]}"; do
    FILE_PATH="${SECRETS_DIR}/${SECRETS[$SECRET_NAME]}"
    SECRET_VALUE=$(cat "$FILE_PATH")

    if [[ "$ENV_NAME" == "default" ]]; then
      ENV_FLAG=()
      ENV_LABEL="default"
    else
      ENV_FLAG=(--env "$ENV_NAME")
      ENV_LABEL="$ENV_NAME"
    fi

    # printf로 trailing newline 제거 (CLAUDE.md gotcha)
    if printf '%s' "$SECRET_VALUE" | npx wrangler secret put "$SECRET_NAME" "${ENV_FLAG[@]}" >/dev/null 2>&1; then
      echo "  ✅ ${SECRET_NAME} → ${ENV_LABEL}"
    else
      echo "  ❌ ${SECRET_NAME} → ${ENV_LABEL} (wrangler put 실패)"
      FAIL=$((FAIL + 1))
    fi
  done
done

cd - >/dev/null

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "❌ ${FAIL}건 적용 실패"
  exit 3
fi

echo ""
echo "✅ 적용 완료 (${#TARGET_ENVS[@]} env × ${#SECRETS[@]} secret = $((${#TARGET_ENVS[@]} * ${#SECRETS[@]}))건)"

# ---- verify (옵션) ---------------------------------------------------------
if [[ "$VERIFY" != true ]]; then
  echo ""
  echo "💡 단건 호출 검증은 --verify 추가"
  exit 0
fi

echo ""
echo "▶ Verify — 양 env에 single eval 호출하여 secret 매칭 확인"
echo "   (이 단계는 svc-skill의 실 API path를 사용. /health는 secret 검증 못 함 — S245 교훈)"

INTERNAL_SECRET=$(cat "${SECRETS_DIR}/decode-x-internal")
SAMPLE_SKILL_ID="${SAMPLE_SKILL_ID:-lpon-charge}"

verify_endpoint() {
  local URL="$1"
  local LABEL="$2"
  local STATUS
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${URL}/skills/${SAMPLE_SKILL_ID}/ai-ready/evaluate" \
    -H "Content-Type: application/json" \
    -H "X-Internal-Secret: ${INTERNAL_SECRET}" \
    --data '{"force":true,"criteria":["completeness"]}' \
    --max-time 60)
  if [[ "$STATUS" == "200" ]]; then
    echo "  ✅ ${LABEL}: HTTP 200 (secret 매칭 + LLM 응답 정상)"
    return 0
  else
    echo "  ❌ ${LABEL}: HTTP ${STATUS} (secret divergence 가능성)"
    return 1
  fi
}

VERIFY_FAIL=0
verify_endpoint "https://svc-skill.ktds-axbd.workers.dev" "default env (HTTP traffic)" || VERIFY_FAIL=$((VERIFY_FAIL + 1))
verify_endpoint "https://svc-skill-production.ktds-axbd.workers.dev" "production env (Queue consumer)" || VERIFY_FAIL=$((VERIFY_FAIL + 1))

if [[ $VERIFY_FAIL -gt 0 ]]; then
  echo ""
  echo "❌ verify ${VERIFY_FAIL}건 실패 — secret 적용 후 30초~1분 대기 후 재시도 권장"
  exit 4
fi

echo ""
echo "✅ verify 완료 — 양 env 모두 정상 응답"
