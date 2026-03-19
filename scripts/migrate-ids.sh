#!/bin/bash
# migrate-ids.sh — 개인 계정 → 회사 계정 리소스 ID 일괄 교체
# AIF-REQ-020 Phase 2

set -euo pipefail

# D1 Production (default env + production env)
declare -A D1_PROD=(
  ["5a17041a-21ee-4aa9-a633-dd2379f8985d"]="285acf8d-7371-47d1-a1d4-16db12db94d1"  # db-ingestion
  ["1f45eb0b-61ad-43b8-b898-0629a7e1a047"]="698c88b5-5355-401d-960a-4d8aa74c3b2c"  # db-structure
  ["e27a4335-7212-4859-8f7e-55cf8d464c8e"]="48c22ca4-a7f8-4f3d-ae1b-e5dee4e8712a"  # db-policy
  ["88cda338-c89e-4b4e-843a-7489d9b268ee"]="688156dc-c49f-4f0d-824d-bb712e34cfac"  # db-ontology
  ["a3f582ba-21b6-4008-9c41-deed94f9d237"]="e8e4bac8-7082-46c4-8a5b-283e97c0e44d"  # db-skill
  ["d50fc742-ace7-4875-a1c6-948aa3e5eb42"]="dfe48a93-1a32-4ea7-9320-1a809c2ecb83"  # db-llm
  ["474a33f4-2a01-4a1d-8121-1e5ebd1123ca"]="2c11d7c8-89f1-472d-aa82-dd181cdf555e"  # db-security
  ["6b2a5531-e78a-4d6b-9ca5-1ee284e47160"]="f45c7351-8d4b-458a-80ce-2a33c664e7bd"  # db-governance
  ["1a6ef6a4-6087-4637-b4d8-4abc7ab2e1bf"]="f95b9137-a653-4de6-89d4-1f698d37b3ef"  # db-notification
  ["fe12a186-99bd-418e-9b79-5cfafc8c24c1"]="a687c3bc-46c0-44a6-ad53-e0c42c3a9142"  # db-analytics
)

# D1 Staging
declare -A D1_STAGING=(
  ["27f0a859-c5d1-4f3b-9619-7861a4bf5626"]="101ab983-2f40-482e-b658-567695580e3b"  # db-ingestion-staging
  ["6b50dfe0-ac8d-401a-8122-c39fde3e19bd"]="5567133d-b0b5-496d-bf8f-0ef1dea62075"  # db-structure-staging
  ["63741d31-4234-4694-a9d2-7e383fdacdaf"]="330cc11b-625b-4c46-915d-078d44828ded"  # db-policy-staging
  ["3a1a3a3c-aded-4c61-85ef-2bdef3c9ab86"]="232df4b9-4591-43d6-a3c6-b8185d611aad"  # db-ontology-staging
  ["2166b6b5-8f49-4c3d-97b3-02dbd70eaea7"]="2ed51d83-f7c1-4835-98e0-65b548d79135"  # db-skill-staging
  ["a0a12d5e-8b07-44c7-ba8f-33cf94ad19fb"]="7749061f-c60b-46be-b2f6-ed129428ff08"  # db-llm-staging
  ["60ff69a8-85b9-4311-990f-1e524b4c6b2d"]="708cca9a-d425-41c2-b4d1-dbc62b356fb0"  # db-security-staging
  ["9a593eea-7b4d-4562-9d89-1ef85433a5e5"]="b889d107-017d-45c1-a1fa-d08a53fecc17"  # db-governance-staging
  ["e8a57ad8-3f7d-4ad2-b9ac-dd26aba31db6"]="ee3bd641-9c25-4ad2-9470-44940804cd0c"  # db-notification-staging
  ["1a2f1511-e842-4bec-a213-f2e429d47b08"]="2ba55dc4-91dc-488f-81b7-d35d823ebc31"  # db-analytics-staging
)

# KV Namespaces (hex format, no dashes)
declare -A KV_IDS=(
  # KV_SKILL_CACHE
  ["b8ca68ae4a6b4c8b8ddec9e5eed0c09e"]="bdb5c9697bb546b99f6dadec455fd740"   # default
  ["97b63e0e61574cae8de56c54b6e0256b"]="100a04bcf8554b6abcc982a3bd7d037f"   # staging (preview)
  ["916333bca3914c959622fc5ff2adbc13"]="6eaa9c8dba4a452d8997c0d0aac75100"   # production
  # KV_PROMPTS
  ["98ef788593e44f638a94cc7838f9a310"]="00f4b676cf9e47cb8848ba9a3e7bcc3e"   # default
  ["91c72003eef94f258ca05023033a35ce"]="6816721bb85a4df082f9413bb3311972"   # staging (preview)
  # KV_PROMPTS production — need to check if separate ID exists
  # svc-governance has another KV:
  ["35b9f45b0fa44bde89b20cc1b9fc9d80"]="862d4b68a2e24605a8c74d7c0babbf1b"   # KV_PROMPTS production (governance)
)

echo "=== Migrating wrangler.toml IDs ==="

# Find all wrangler.toml files
TOML_FILES=$(find services/ -name "wrangler.toml" -type f)
COUNT=0

for TOML in $TOML_FILES; do
  CHANGED=false

  # Replace D1 production IDs
  for OLD_ID in "${!D1_PROD[@]}"; do
    NEW_ID="${D1_PROD[$OLD_ID]}"
    if grep -q "$OLD_ID" "$TOML" 2>/dev/null; then
      sed -i "s/$OLD_ID/$NEW_ID/g" "$TOML"
      CHANGED=true
    fi
  done

  # Replace D1 staging IDs
  for OLD_ID in "${!D1_STAGING[@]}"; do
    NEW_ID="${D1_STAGING[$OLD_ID]}"
    if grep -q "$OLD_ID" "$TOML" 2>/dev/null; then
      sed -i "s/$OLD_ID/$NEW_ID/g" "$TOML"
      CHANGED=true
    fi
  done

  # Replace KV IDs
  for OLD_ID in "${!KV_IDS[@]}"; do
    NEW_ID="${KV_IDS[$OLD_ID]}"
    if grep -q "$OLD_ID" "$TOML" 2>/dev/null; then
      sed -i "s/$OLD_ID/$NEW_ID/g" "$TOML"
      CHANGED=true
    fi
  done

  if [ "$CHANGED" = true ]; then
    echo "✅ Updated: $TOML"
    COUNT=$((COUNT + 1))
  fi
done

echo ""
echo "Total files updated: $COUNT"
