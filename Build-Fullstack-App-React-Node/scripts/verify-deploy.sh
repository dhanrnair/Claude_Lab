#!/usr/bin/env bash
# Read-only smoke test of a deployed app. Usage: verify-deploy.sh <https://url> [protected-api-path]
# Creates nothing (no sign-up, no writes). Sign-up/booking must be tried by the user, or tested
# only if the test user and rows can be deleted afterwards.
set -uo pipefail
u=${1:?url}; prot=${2:-/api/my/bookings}
echo "(first request may take ~1 min if the free instance is asleep)"
curl -s -m 120 -w "\nhealth      -> %{http_code}  (expect {\"ok\":true} 200)\n" "$u/api/health"
curl -s -m 60 -o /dev/null -w "home        -> %{http_code} %{content_type}  (expect 200 text/html)\n" "$u/"
curl -s -m 60 -o /dev/null -w "spa fallback-> %{http_code}  (expect 200)\n" "$u/some-client-route"
curl -s -m 60 -o /dev/null -w "protected   -> %{http_code}  (expect 401 without a cookie)\n" "$u$prot"
