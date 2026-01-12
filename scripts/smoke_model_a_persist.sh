#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8790}"
API_KEY="${OS_API_KEY:-}"
AS_OF="${AS_OF:-}"

if [[ -z "$API_KEY" ]]; then
  echo "Missing OS_API_KEY env var" >&2
  exit 1
fi

if [[ -z "$AS_OF" ]]; then
  echo "Missing AS_OF env var (e.g., 2025-12-31)" >&2
  exit 1
fi

curl -sS -X POST "http://127.0.0.1:${PORT}/run/model_a_v1_1_persist" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d "{\"as_of\":\"${AS_OF}\"}"
