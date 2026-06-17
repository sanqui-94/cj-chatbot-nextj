#!/usr/bin/env bash
# Phase 5 checkpoint (read API + auth): the SWR fetcher endpoint `/api/inbox` is
# session-guarded (401 without a session) and returns the WAITING queue as a JSON
# array once authenticated. The "two tabs converge within ~4s" and "polling
# pauses when hidden" behaviours come from SWR (`refreshInterval` +
# `refreshWhenHidden: false`) and are confirmed in the browser.
#
# Usage: start the dev server (`pnpm dev`), then `bash scripts/verify-phase5.sh`.
set -euo pipefail

BASE=${BASE:-http://localhost:3000}
EMAIL=${EMAIL:-verify-phase5@example.com}
PASSWORD=${PASSWORD:-Verify-Phase5-Pass}
JAR=$(mktemp)
trap 'rm -f "$JAR"' EXIT

# Seed a throwaway operator (idempotent upsert against the local Docker DB).
pnpm create-operator "$EMAIL" "$PASSWORD" "Verify P5" >/dev/null

# 1. Guard: unauthenticated request is rejected.
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/inbox")
if [ "$code" = "401" ]; then
  echo "✓ /api/inbox returns 401 when unauthenticated"
else
  echo "✗ expected 401 unauthenticated, got $code"; exit 1
fi

# 2. Log in via the Auth.js credentials callback (CSRF token + cookie jar).
csrf=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" \
  | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
curl -s -c "$JAR" -b "$JAR" -o /dev/null \
  --data-urlencode "csrfToken=$csrf" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  "$BASE/api/auth/callback/credentials"

# 3. Authenticated request returns 200 + a JSON array.
resp=$(curl -s -b "$JAR" -w $'\n%{http_code}' "$BASE/api/inbox")
code=$(printf '%s' "$resp" | tail -n1)
body=$(printf '%s' "$resp" | sed '$d')
if [ "$code" = "200" ]; then
  echo "✓ /api/inbox returns 200 when authenticated"
else
  echo "✗ expected 200 authenticated, got $code"; exit 1
fi
printf '%s' "$body" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); assert isinstance(d,list); print(f'✓ payload is a JSON array ({len(d)} waiting)')"

# Cleanup the throwaway operator.
docker compose exec -T db psql -U taxi -d taxi \
  -c "DELETE FROM \"User\" WHERE email='$EMAIL';" >/dev/null 2>&1 \
  && echo "✓ Cleaned up verify operator" \
  || echo "• (skip) could not auto-remove verify operator ($EMAIL)"

echo
echo "Phase 5 inbox API verification passed."
