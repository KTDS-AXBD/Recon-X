#!/usr/bin/env bash
set -euo pipefail

# Phase 2-B Batch E2E Pipeline Test
# Usage: INTERNAL_API_SECRET='...' ./scripts/test-e2e-batch.sh [OPTIONS]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ENV="staging"
DOC_DIR="$PROJECT_DIR/test-docs/phase-2b"
AUTO_APPROVE=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --staging) ENV="staging"; shift ;;
    --production) ENV="production"; shift ;;
    --dir) DOC_DIR="$2"; shift 2 ;;
    --auto-approve) AUTO_APPROVE=true; shift ;;
    --json) JSON_OUTPUT=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "${INTERNAL_API_SECRET:-}" ]]; then
  echo "ERROR: INTERNAL_API_SECRET environment variable is required"
  exit 1
fi

if [[ ! -f "$DOC_DIR/documents.json" ]]; then
  echo "ERROR: documents.json not found in $DOC_DIR"
  exit 1
fi

if [[ "$ENV" == "staging" ]]; then
  INGESTION_URL="https://svc-ingestion-staging.sinclair-account.workers.dev"
  POLICY_URL="https://svc-policy-staging.sinclair-account.workers.dev"
  ANALYTICS_URL="https://svc-analytics-staging.sinclair-account.workers.dev"
else
  INGESTION_URL="https://svc-ingestion.sinclair-account.workers.dev"
  POLICY_URL="https://svc-policy.sinclair-account.workers.dev"
  ANALYTICS_URL="https://svc-analytics.sinclair-account.workers.dev"
fi

SECRET_HEADER="X-Internal-Secret: $INTERNAL_API_SECRET"
JSON_HEADER="Content-Type: application/json"

echo "================================================================"
echo "  Phase 2-B Batch E2E Test"
echo "  Environment: $ENV"
echo "  Documents: $DOC_DIR"
echo "  Auto-approve: $AUTO_APPROVE"
echo "================================================================"
echo ""

DOCS=$(cat "$DOC_DIR/documents.json")
DOC_COUNT=$(echo "$DOCS" | jq '.documents | length')
echo "Found $DOC_COUNT documents in manifest"
echo ""

RESULTS=()
PASSED=0
FAILED=0
BATCH_ID="batch-$(date +%Y%m%d-%H%M%S)"

for i in $(seq 0 $((DOC_COUNT - 1))); do
  DOC=$(echo "$DOCS" | jq -r ".documents[$i]")
  DOC_NAME=$(echo "$DOC" | jq -r '.name')
  DOC_TYPE=$(echo "$DOC" | jq -r '.fileType')
  DOC_CONTENT=$(echo "$DOC" | jq -r '.content')

  echo "--- Document $((i+1))/$DOC_COUNT: $DOC_NAME ---"

  # Stage 1: Upload
  echo "  [1/5] Uploading..."
  UPLOAD_RESP=$(curl -s -X POST "$INGESTION_URL/documents" \
    -H "$SECRET_HEADER" \
    -H "$JSON_HEADER" \
    -d "{
      \"organizationId\": \"org-001\",
      \"uploadedBy\": \"batch-test\",
      \"fileName\": \"$DOC_NAME\",
      \"fileType\": \"$DOC_TYPE\",
      \"content\": \"$DOC_CONTENT\"
    }" 2>/dev/null || echo '{"success":false}')

  DOC_ID=$(echo "$UPLOAD_RESP" | jq -r '.data.documentId // empty')
  if [[ -z "$DOC_ID" ]]; then
    echo "  FAILED: Upload failed"
    FAILED=$((FAILED + 1))
    RESULTS+=("{\"name\":\"$DOC_NAME\",\"status\":\"failed\",\"stage\":\"upload\"}")
    continue
  fi
  echo "  OK: documentId=$DOC_ID"

  # Wait for pipeline
  echo "  [2-4/5] Waiting for pipeline..."
  sleep 8

  # Check policies
  POLICIES_RESP=$(curl -s "$POLICY_URL/policies?documentId=$DOC_ID" \
    -H "$SECRET_HEADER" 2>/dev/null || echo '{"success":false}')
  POLICY_COUNT=$(echo "$POLICIES_RESP" | jq '.data | length // 0')
  echo "  Policies generated: $POLICY_COUNT"

  # Auto-approve
  if [[ "$AUTO_APPROVE" == "true" && "$POLICY_COUNT" -gt 0 ]]; then
    echo "  [3/5] Auto-approving..."
    for j in $(seq 0 $((POLICY_COUNT - 1))); do
      POLICY_ID=$(echo "$POLICIES_RESP" | jq -r ".data[$j].policyId // empty")
      POLICY_STATUS=$(echo "$POLICIES_RESP" | jq -r ".data[$j].status // empty")
      if [[ "$POLICY_STATUS" == "candidate" || "$POLICY_STATUS" == "in_review" ]]; then
        curl -s -X POST "$POLICY_URL/policies/$POLICY_ID/approve" \
          -H "$SECRET_HEADER" \
          -H "$JSON_HEADER" \
          -d '{"reviewerId":"batch-auto","comment":"Auto-approved by batch E2E"}' \
          > /dev/null 2>&1
        echo "    Approved: $POLICY_ID"
      fi
    done
    sleep 5
  fi

  echo "  [5/5] Done"
  PASSED=$((PASSED + 1))
  RESULTS+=("{\"name\":\"$DOC_NAME\",\"status\":\"passed\",\"documentId\":\"$DOC_ID\",\"policies\":$POLICY_COUNT}")
  echo ""
done

# Quality metrics
echo "================================================================"
echo "Fetching quality metrics..."
QUALITY=$(curl -s "$ANALYTICS_URL/quality?organizationId=org-001" \
  -H "$SECRET_HEADER" 2>/dev/null || echo '{"success":false}')

echo ""
echo "================================================================"
echo "  Batch E2E Results"
echo "  Total: $DOC_COUNT  Passed: $PASSED  Failed: $FAILED"
echo "  Batch ID: $BATCH_ID"
echo "================================================================"

if [[ "$JSON_OUTPUT" == "true" ]]; then
  echo ""
  jq -n \
    --arg batchId "$BATCH_ID" \
    --arg env "$ENV" \
    --argjson total "$DOC_COUNT" \
    --argjson passed "$PASSED" \
    --argjson failed "$FAILED" \
    --argjson quality "$QUALITY" \
    '{batchId: $batchId, environment: $env, total: $total, passed: $passed, failed: $failed, quality: $quality}'
fi

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
