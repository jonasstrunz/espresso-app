#!/usr/bin/env bash
# Runs a SQL file against the staging Supabase project via the Management API
# (POST /v1/projects/{ref}/database/query). No DB password / psql needed;
# errors surface as HTTP 400, so curl -f fails the pipeline on SQL errors.
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN not set}"
: "${STAGING_SUPABASE_PROJECT_ID:?STAGING_SUPABASE_PROJECT_ID not set}"

file="$1"
test -f "$file" || { echo "SQL file not found: $file" >&2; exit 1; }

jq -n --rawfile query "$file" '{query: $query}' |
  curl -fsS -X POST \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @- \
    "https://api.supabase.com/v1/projects/$STAGING_SUPABASE_PROJECT_ID/database/query"
echo " applied: $file"
