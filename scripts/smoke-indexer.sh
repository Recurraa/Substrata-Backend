#!/usr/bin/env bash
set -euo pipefail
BASE="${API_BASE:-http://localhost:3001/api/v1}"
curl -sf "$BASE/indexer/events?limit=5" | head -c 200 || echo "API not running (ok for offline)"
