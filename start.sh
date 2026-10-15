#!/usr/bin/env bash
# Tek serviste iki süreç: NestJS API (iç port 4000) + Next.js (Render'ın verdiği $PORT).
# Next, /api/* ve /uploads/*'i iç porttaki API'ye iletir; dışarıya yalnızca $PORT açıktır.
set -uo pipefail
PUBLIC_PORT="${PORT:-3000}"
API_PORT="${API_INTERNAL_PORT:-4000}"
export API_URL="http://127.0.0.1:${API_PORT}"

PORT="$API_PORT" node apps/api/dist/main.js &
API_PID=$!
PORT="$PUBLIC_PORT" npm --prefix apps/web start &
WEB_PID=$!

trap 'kill $API_PID $WEB_PID 2>/dev/null' TERM INT
# Süreçlerden biri düşerse Render servisi yeniden başlatsın.
wait -n "$API_PID" "$WEB_PID"
CODE=$?
kill "$API_PID" "$WEB_PID" 2>/dev/null
exit "$CODE"
