#!/usr/bin/env bash
# Runs a SQL file against the staging Supabase project via the Management API
# (POST /v1/projects/{ref}/database/query). No DB password / psql needed;
# errors surface as HTTP 400, so curl -f fails the pipeline on SQL errors.
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN not set}"
: "${STAGING_SUPABASE_PROJECT_ID:?STAGING_SUPABASE_PROJECT_ID not set}"

file="$1"
test -f "$file" || { echo "SQL file not found: $file" >&2; exit 1; }

payload=$(python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1], encoding="utf-8").read()}))' "$file")

# On failure show the API's error body (curl -f suppresses it by default).
if ! resp=$(curl -sS -w $'\n%{http_code}' -X POST \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary "$payload" \
    "https://api.supabase.com/v1/projects/$STAGING_SUPABASE_PROJECT_ID/database/query"); then
  echo "request failed for $file" >&2
  exit 1
fi
code=${resp##*$'\n'}
body=${resp%$'\n'*}
if [ "$code" != "200" ] && [ "$code" != "201" ]; then
  echo "HTTP $code for $file: $body" >&2
  exit 1
fi
echo " applied: $file"
