#!/usr/bin/env bash
# Hit a running Folio server as Alex, Jordan, and Sam.
set -euo pipefail

BASE="${1:-http://localhost:3000}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

echo "Health"
curl -fsS "$BASE/api/health"
echo

echo "Alex logs in"
curl -fsS -c "$JAR" -H 'content-type: application/json' \
  -d '{"email":"alex@ajaia.dev","password":"folio-demo"}' \
  "$BASE/api/auth/login"
echo

echo "Alex's library"
curl -fsS -b "$JAR" "$BASE/api/documents"
echo

DOC_ID="$(curl -fsS -b "$JAR" "$BASE/api/documents" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(next(doc["id"] for doc in data["owned"] if doc["title"]=="Q3 planning"))')"
echo "Q3 id: $DOC_ID"

echo "Sam cannot edit"
SAM="$(mktemp)"
curl -fsS -c "$SAM" -H 'content-type: application/json' \
  -d '{"email":"sam@ajaia.dev","password":"folio-demo"}' \
  "$BASE/api/auth/login" >/dev/null
CODE="$(curl -s -o /tmp/folio-sam-body.txt -w '%{http_code}' -b "$SAM" -H 'content-type: application/json' \
  -d '{"title":"Hijack","content":{"type":"doc","content":[{"type":"paragraph"}]},"baseUpdatedAt":"2000-01-01T00:00:00.000Z"}' \
  -X PATCH "$BASE/api/documents/$DOC_ID")"
echo "Sam PATCH status: $CODE"
cat /tmp/folio-sam-body.txt
echo
rm -f "$SAM" /tmp/folio-sam-body.txt

if [[ "$CODE" != "403" ]]; then
  echo "Expected Sam to be rejected with 403" >&2
  exit 1
fi

echo "Smoke test passed"
