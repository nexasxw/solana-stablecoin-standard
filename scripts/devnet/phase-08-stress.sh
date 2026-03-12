#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SSS1_SCRIPT="$SCRIPT_DIR/phase-08-sss1-proof.sh"
SSS2_SCRIPT="$SCRIPT_DIR/phase-08-sss2-proof.sh"

RUN_ID="${RUN_ID:-}"
ITERATIONS="${ITERATIONS:-2}"
RETRY_LIMIT="${RETRY_LIMIT:-1}"
ARTIFACT_ROOT="${ARTIFACT_ROOT:-$REPO_ROOT/artifacts/devnet/phase-08}"
STRESS_ARTIFACT_DIR="$ARTIFACT_ROOT/stress/$RUN_ID"

if [ -z "$RUN_ID" ]; then
  echo "error: RUN_ID is required (example: RUN_ID=stress-rerun-001)." >&2
  exit 2
fi
for path in "$SSS1_SCRIPT" "$SSS2_SCRIPT"; do
  if [ ! -x "$path" ]; then
    echo "error: missing executable script: $path" >&2
    exit 2
  fi
done
if ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || ! [[ "$RETRY_LIMIT" =~ ^[0-9]+$ ]]; then
  echo "error: ITERATIONS and RETRY_LIMIT must be non-negative integers." >&2
  exit 2
fi
if [ "$ITERATIONS" -lt 1 ]; then
  echo "error: ITERATIONS must be >= 1." >&2
  exit 2
fi
if [ -e "$STRESS_ARTIFACT_DIR" ]; then
  echo "error: artifact directory already exists: $STRESS_ARTIFACT_DIR" >&2
  exit 3
fi

mkdir -p "$STRESS_ARTIFACT_DIR/logs"
RESULTS_FILE="$STRESS_ARTIFACT_DIR/results.csv"
SUMMARY_FILE="$STRESS_ARTIFACT_DIR/summary.md"
echo "iteration,lane,attempt,status,run_id,log_file" >"$RESULTS_FILE"

STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
total_runs=0
total_failures=0

run_lane() {
  local iteration="$1"
  local lane="$2"
  local script_path="$3"
  local attempt=0

  while [ "$attempt" -le "$RETRY_LIMIT" ]; do
    local lane_run_id
    local log_file
    lane_run_id="${RUN_ID}-iter$(printf '%02d' "$iteration")-${lane}-attempt$(printf '%02d' "$attempt")"
    log_file="$STRESS_ARTIFACT_DIR/logs/${lane_run_id}.log"
    total_runs=$((total_runs + 1))

    if RUN_ID="$lane_run_id" "$script_path" >"$log_file" 2>&1; then
      echo "$iteration,$lane,$attempt,pass,$lane_run_id,$log_file" >>"$RESULTS_FILE"
      return 0
    fi

    echo "$iteration,$lane,$attempt,fail,$lane_run_id,$log_file" >>"$RESULTS_FILE"
    attempt=$((attempt + 1))
  done

  total_failures=$((total_failures + 1))
  return 1
}

for iteration in $(seq 1 "$ITERATIONS"); do
  run_lane "$iteration" "sss1" "$SSS1_SCRIPT"
  run_lane "$iteration" "sss2" "$SSS2_SCRIPT"
done

ENDED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
if [ "$total_failures" -eq 0 ]; then
  result="pass"
  exit_code=0
else
  result="fail"
  exit_code=1
fi

cat >"$SUMMARY_FILE" <<EOF
# Phase 08 Devnet Stress Summary

- run_id: $RUN_ID
- result: $result
- iterations: $ITERATIONS
- retry_limit: $RETRY_LIMIT
- total_lane_runs: $total_runs
- lane_failures: $total_failures
- started_at: $STARTED_AT
- ended_at: $ENDED_AT
- results_csv: results.csv
- logs_dir: logs/
EOF

echo "Stress run result: $result"
echo "Artifacts: $STRESS_ARTIFACT_DIR"
exit "$exit_code"
