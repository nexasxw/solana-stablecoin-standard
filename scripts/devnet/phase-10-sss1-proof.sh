#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLI="$REPO_ROOT/scripts/sss-token"

RPC_URL="${RPC_URL:-https://api.devnet.solana.com}"
RUN_ID="${RUN_ID:-}"
AUTHORITY_SIGNER="${AUTHORITY_SIGNER:-}"
MINTER_SIGNER="${MINTER_SIGNER:-$AUTHORITY_SIGNER}"
PAUSER_SIGNER="${PAUSER_SIGNER:-$AUTHORITY_SIGNER}"
RECIPIENT_TOKEN_ACCOUNT="${RECIPIENT_TOKEN_ACCOUNT:-}"
TOKEN_NAME="${TOKEN_NAME:-Phase10 SSS1}"
TOKEN_SYMBOL="${TOKEN_SYMBOL:-P10S1}"
TOKEN_URI="${TOKEN_URI:-https://example.com/phase10-sss1.json}"
TOKEN_DECIMALS="${TOKEN_DECIMALS:-6}"
MINT_QUOTA="${MINT_QUOTA:-1000000000}"
MINT_AMOUNT="${MINT_AMOUNT:-1000}"
NEGATIVE_MINT_AMOUNT="${NEGATIVE_MINT_AMOUNT:-1}"
NEGATIVE_PATH_REASON="${NEGATIVE_PATH_REASON:-mint-while-paused}"
ARTIFACT_ROOT="${ARTIFACT_ROOT:-$REPO_ROOT/artifacts/devnet/phase-10}"

if [ -z "$RUN_ID" ]; then
  echo "error: RUN_ID is required (example: RUN_ID=phase10-a-001)." >&2
  exit 2
fi
if [ -z "$AUTHORITY_SIGNER" ] || [ -z "$RECIPIENT_TOKEN_ACCOUNT" ]; then
  echo "error: AUTHORITY_SIGNER and RECIPIENT_TOKEN_ACCOUNT are required." >&2
  exit 2
fi
if [ ! -f "$AUTHORITY_SIGNER" ] || [ ! -f "$MINTER_SIGNER" ] || [ ! -f "$PAUSER_SIGNER" ]; then
  echo "error: signer file(s) not found." >&2
  exit 2
fi
if [ ! -x "$CLI" ]; then
  echo "error: expected executable CLI wrapper at $CLI" >&2
  exit 2
fi

ARTIFACT_DIR="$ARTIFACT_ROOT/sss1-proof/$RUN_ID"
if [ -e "$ARTIFACT_DIR" ]; then
  echo "error: artifact directory already exists: $ARTIFACT_DIR" >&2
  exit 3
fi

mkdir -p "$ARTIFACT_DIR/commands" "$ARTIFACT_DIR/state"
SIGNATURES_FILE="$ARTIFACT_DIR/signatures.csv"
SUMMARY_FILE="$ARTIFACT_DIR/summary.md"
METADATA_FILE="$ARTIFACT_DIR/run-metadata.env"
echo "operation,signature" >"$SIGNATURES_FILE"

STEP=0
MINT_ADDRESS=""
MINTER_PUBKEY=""
STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

next_step_file() {
  local label="$1"
  printf "%s/commands/%02d-%s.json" "$ARTIFACT_DIR" "$STEP" "$label"
}

extract_data_field() {
  local json_file="$1"
  local field="$2"
  node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const field = process.argv[2];
const parts = field.split(".");
let cur = payload;
for (const part of parts) {
  if (cur == null || !(part in cur)) {
    process.stdout.write("");
    process.exit(0);
  }
  cur = cur[part];
}
process.stdout.write(cur == null ? "" : String(cur));
' "$json_file" "$field"
}

record_signature() {
  local operation="$1"
  local json_file="$2"
  local signature
  signature="$(extract_data_field "$json_file" "data.signature")"
  if [ -z "$signature" ]; then
    signature="$(extract_data_field "$json_file" "data.initialization.signature")"
  fi
  if [ -n "$signature" ]; then
    printf "%s,%s\n" "$operation" "$signature" >>"$SIGNATURES_FILE"
  fi
}

run_json() {
  local label="$1"
  shift
  local output_file
  output_file="$(next_step_file "$label")"
  printf '%q ' "$@" >"${output_file%.json}.cmd"
  printf "\n" >>"${output_file%.json}.cmd"
  "$@" >"$output_file"
  node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (payload.ok !== true) {
  console.error("command failed:", process.argv[1]);
  process.exit(1);
}
' "$output_file"
  STEP=$((STEP + 1))
  printf "%s" "$output_file"
}

run_expected_failure() {
  local label="$1"
  shift
  local output_file
  output_file="$(next_step_file "$label")"
  printf '%q ' "$@" >"${output_file%.json}.cmd"
  printf "\n" >>"${output_file%.json}.cmd"

  set +e
  "$@" >"$output_file" 2>&1
  local rc=$?
  set -e

  if [ $rc -eq 0 ]; then
    node -e '
const fs = require("fs");
let payload = null;
try {
  payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
} catch (_) {}
if (!payload || payload.ok !== false) {
  console.error("expected failure command unexpectedly succeeded:", process.argv[1]);
  process.exit(1);
}
' "$output_file"
  fi

  STEP=$((STEP + 1))
  printf "%s" "$output_file"
}

MINTER_PUBKEY="$(solana-keygen pubkey "$MINTER_SIGNER")"

INIT_JSON="$(run_json init \
  "$CLI" --json --rpc-url "$RPC_URL" --authority-signer "$AUTHORITY_SIGNER" \
  init --preset sss-1 --name "$TOKEN_NAME" --symbol "$TOKEN_SYMBOL" --uri "$TOKEN_URI" --decimals "$TOKEN_DECIMALS")"
record_signature "init" "$INIT_JSON"
MINT_ADDRESS="$(extract_data_field "$INIT_JSON" "data.mint")"

run_json state-after-init \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  status >"$ARTIFACT_DIR/state/pre-status.json"
run_json supply-after-init \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  supply >"$ARTIFACT_DIR/state/pre-supply.json"

MINTER_JSON="$(run_json minters-add \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  --authority-signer "$AUTHORITY_SIGNER" -y minters add "$MINTER_PUBKEY" --quota "$MINT_QUOTA")"
record_signature "minters_add" "$MINTER_JSON"

PAUSE_JSON="$(run_json pause \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  --authority-signer "$AUTHORITY_SIGNER" -y pause)"
record_signature "pause" "$PAUSE_JSON"

NEGATIVE_PATH_JSON="$(run_expected_failure negative-path-mint-while-paused \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  --minter-signer "$MINTER_SIGNER" -y mint "$RECIPIENT_TOKEN_ACCOUNT" "$NEGATIVE_MINT_AMOUNT")"
cp "$NEGATIVE_PATH_JSON" "$ARTIFACT_DIR/state/negative-path-mint-while-paused.json"

UNPAUSE_JSON="$(run_json unpause \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  --authority-signer "$AUTHORITY_SIGNER" -y unpause)"
record_signature "unpause" "$UNPAUSE_JSON"

MINT_JSON="$(run_json mint \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  --minter-signer "$MINTER_SIGNER" -y mint "$RECIPIENT_TOKEN_ACCOUNT" "$MINT_AMOUNT")"
record_signature "mint" "$MINT_JSON"

run_json state-after-proof \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  status >"$ARTIFACT_DIR/state/post-status.json"
run_json supply-after-proof \
  "$CLI" --json --rpc-url "$RPC_URL" --mint "$MINT_ADDRESS" --variant SSS_1 \
  supply >"$ARTIFACT_DIR/state/post-supply.json"

ENDED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
{
  echo "RUN_ID=$RUN_ID"
  echo "RPC_URL=$RPC_URL"
  echo "MINT_ADDRESS=$MINT_ADDRESS"
  echo "MINTER_PUBKEY=$MINTER_PUBKEY"
  echo "RECIPIENT_TOKEN_ACCOUNT=$RECIPIENT_TOKEN_ACCOUNT"
  echo "NEGATIVE_PATH_LABEL=negative-path-mint-while-paused"
  echo "NEGATIVE_PATH_REASON=$NEGATIVE_PATH_REASON"
  echo "NEGATIVE_PATH_FILE=state/negative-path-mint-while-paused.json"
  echo "STARTED_AT=$STARTED_AT"
  echo "ENDED_AT=$ENDED_AT"
} >"$METADATA_FILE"

cat >"$SUMMARY_FILE" <<EOF
# Phase 10 SSS-1 Proof Summary

- run_id: $RUN_ID
- result: pass
- rpc_url: $RPC_URL
- mint: $MINT_ADDRESS
- artifact_dir: $ARTIFACT_DIR
- signatures_file: signatures.csv
- negative-path:
  - label: negative-path-mint-while-paused
  - reason: $NEGATIVE_PATH_REASON
  - expected failure artifact: state/negative-path-mint-while-paused.json
- snapshots:
  - state/pre-status.json
  - state/pre-supply.json
  - state/post-status.json
  - state/post-supply.json
EOF

echo "SSS-1 phase-10 proof run complete."
echo "Artifacts: $ARTIFACT_DIR"
