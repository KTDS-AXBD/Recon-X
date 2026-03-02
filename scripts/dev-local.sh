#!/usr/bin/env bash
# dev-local.sh — Start all AI Foundry services locally in batches
# Prevents workerd resource contention by staggering startup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "Shutting down all services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  echo "All services stopped."
}
trap cleanup EXIT INT TERM

start_service() {
  local svc="$1"
  cd "$ROOT/services/$svc"
  wrangler dev 2>&1 | sed "s/^/[$svc] /" &
  PIDS+=($!)
}

echo "=== AI Foundry Local Dev ==="
echo ""

# Wave 1: Core platform services (no dependencies)
echo "▸ Wave 1: Platform services"
start_service svc-security
start_service svc-llm-router
start_service svc-governance
sleep 5

# Wave 2: Pipeline services
echo "▸ Wave 2: Pipeline services"
start_service svc-ingestion
start_service svc-extraction
start_service svc-policy
sleep 5

# Wave 3: Downstream pipeline + support
echo "▸ Wave 3: Downstream + support services"
start_service svc-ontology
start_service svc-skill
start_service svc-notification
sleep 5

# Wave 4: Aggregation + routing
echo "▸ Wave 4: Analytics + Queue Router"
start_service svc-analytics
start_service svc-queue-router
sleep 3

# Wave 5: Frontend
echo "▸ Wave 5: Frontend"
cd "$ROOT/apps/app-web"
npx vite 2>&1 | sed "s/^/[app-web] /" &
PIDS+=($!)

sleep 5
echo ""
echo "=== Health Check ==="
PASS=0; FAIL=0
SERVICES=(
  "8701:svc-ingestion"
  "8702:svc-extraction"
  "8703:svc-policy"
  "8704:svc-ontology"
  "8705:svc-skill"
  "8706:svc-llm-router"
  "8707:svc-security"
  "8708:svc-governance"
  "8709:svc-notification"
  "8710:svc-analytics"
  "8711:svc-queue-router"
)
for entry in "${SERVICES[@]}"; do
  port="${entry%%:*}"
  name="${entry#*:}"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$port/health" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    echo "  ✅ $name → :$port"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name → :$port ($code)"
    FAIL=$((FAIL+1))
  fi
done
echo ""
echo "Workers: $PASS/11 healthy"
echo "Press Ctrl+C to stop all services."
echo ""

# Keep alive
wait
