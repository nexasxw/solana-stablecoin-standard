#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CLI="node sdk/core/dist/cli.js"
DUMMY_MINT="11111111111111111111111111111111"
DUMMY_RECIPIENT="11111111111111111111111111111111"
DUMMY_AMOUNT="1"

echo "== Build CLI =="
yarn workspace @stbr/sss-token build >/dev/null

echo
echo "== Check 1: no --yes should require confirmation =="
set +e
OUT1=$($CLI --mint "$DUMMY_MINT" mint "$DUMMY_RECIPIENT" "$DUMMY_AMOUNT" 2>&1)
RC1=$?
set -e
echo "$OUT1"
echo "exit_code=$RC1"

echo
echo "== Check 2: with --yes should move past confirmation gate =="
set +e
OUT2=$($CLI --mint "$DUMMY_MINT" mint "$DUMMY_RECIPIENT" "$DUMMY_AMOUNT" --yes 2>&1)
RC2=$?
set -e
echo "$OUT2"
echo "exit_code=$RC2"

echo
if grep -q "Confirmation required for mint" <<<"$OUT1" && ! grep -q "Confirmation required for mint" <<<"$OUT2"; then
  echo "UAT_TEST_4_RESULT=pass"
  echo "Reason: confirmation gate blocks non-interactive mutation without --yes, and unblocks when --yes is present."
else
  echo "UAT_TEST_4_RESULT=issue"
  echo "Reason: confirmation-gate behavior did not match expected pattern."
fi
