# Devnet Proof Scripts (Phase 08)

These scripts provide deterministic, operator-style proof runs for Phase 08 `TST-03`.

## Scripts

- `scripts/devnet/phase-08-sss1-proof.sh`
- `scripts/devnet/phase-08-sss2-proof.sh`
- `scripts/devnet/phase-08-stress.sh`

## Deterministic Artifact Contract

Each script writes to a deterministic run path:

- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID`

A run fails if the target artifact directory already exists.

Each proof run emits:

- `commands/*.cmd` and `commands/*.json` command records
- `state/pre-*.json` and `state/post-*.json` snapshots
- `signatures.csv` transaction signatures by operation
- `run-metadata.env` canonical run metadata
- `summary.md` pass/fail summary

Stress runs emit:

- `artifacts/devnet/phase-08/stress/$RUN_ID/results.csv`
- `artifacts/devnet/phase-08/stress/$RUN_ID/logs/*.log`
- `artifacts/devnet/phase-08/stress/$RUN_ID/summary.md`

## Required Environment

Shared:

- `RUN_ID` unique deterministic run label (example: `RUN_ID=rerun-001`)
- `AUTHORITY_SIGNER` keypair path used for init/admin operations
- `RPC_URL` optional, defaults to `https://api.devnet.solana.com`
- `ARTIFACT_ROOT` optional, defaults to `artifacts/devnet/phase-08`

SSS-1:

- `RECIPIENT_TOKEN_ACCOUNT` recipient token account for `mint`

SSS-2:

- `TARGET_TOKEN_ACCOUNT` token account used for mint/freeze/seize
- `TARGET_OWNER` owner public key for blacklist and seize
- `TREASURY_TOKEN_ACCOUNT` treasury token account used by seize

Optional role signer overrides:

- `MINTER_SIGNER`
- `PAUSER_SIGNER`
- `BLACKLISTER_SIGNER` (SSS-2)
- `SEIZER_SIGNER` (SSS-2)

If role overrides are omitted, scripts default role signers to `AUTHORITY_SIGNER`.

Stress runner consumes the same variables as both proof scripts.
Ensure all SSS-1 and SSS-2 required variables are set before running stress.

## Usage

SSS-1:

```bash
RUN_ID=rerun-001 \
AUTHORITY_SIGNER=~/.config/solana/devnet-authority.json \
RECIPIENT_TOKEN_ACCOUNT=<recipient-token-account> \
./scripts/devnet/phase-08-sss1-proof.sh
```

SSS-2:

```bash
RUN_ID=rerun-001 \
AUTHORITY_SIGNER=~/.config/solana/devnet-authority.json \
TARGET_TOKEN_ACCOUNT=<target-token-account> \
TARGET_OWNER=<target-owner-pubkey> \
TREASURY_TOKEN_ACCOUNT=<treasury-token-account> \
./scripts/devnet/phase-08-sss2-proof.sh
```

Stress:

```bash
RUN_ID=stress-rerun-001 \
ITERATIONS=2 \
RETRY_LIMIT=1 \
AUTHORITY_SIGNER=~/.config/solana/devnet-authority.json \
RECIPIENT_TOKEN_ACCOUNT=<recipient-token-account> \
TARGET_TOKEN_ACCOUNT=<target-token-account> \
TARGET_OWNER=<target-owner-pubkey> \
TREASURY_TOKEN_ACCOUNT=<treasury-token-account> \
./scripts/devnet/phase-08-stress.sh
```

## Pass/Fail Policy

- `phase-08-stress.sh` runs both lanes (`sss1`, `sss2`) in each iteration.
- Per lane and iteration, max attempts = `RETRY_LIMIT + 1`.
- A lane is `pass` when any attempt succeeds.
- A lane is `fail` when all attempts fail.
- Overall stress result is `pass` only if all lanes pass for all iterations.
- Overall stress result is `fail` if any lane fails after retries.

## Command-To-Artifact Review Checkpoints

| Command | Artifact Root | Required Files | Signature Check | Pass | Fail |
| --- | --- | --- | --- | --- | --- |
| `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss1-proof.sh` | `artifacts/devnet/phase-08/sss1-proof/$RUN_ID` | `commands/*.cmd`, `commands/*.json`, `state/pre-*.json`, `state/post-*.json`, `summary.md` | `signatures.csv` exists and has `operation,signature` rows for mutating operations | Non-zero artifacts complete and `summary.md` marks pass | Missing artifacts, malformed signatures, or non-zero exit |
| `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss2-proof.sh` | `artifacts/devnet/phase-08/sss2-proof/$RUN_ID` | SSS-1 list plus `state/blacklist-check.json` | `signatures.csv` includes compliance mutation signatures | Artifacts complete and `summary.md` marks pass | Missing blacklist/signature artifacts or non-zero exit |
| `RUN_ID=<id> ITERATIONS=2 RETRY_LIMIT=1 ... ./scripts/devnet/phase-08-stress.sh` | `artifacts/devnet/phase-08/stress/$RUN_ID` | `results.csv`, `logs/*.log`, `summary.md` | Signatures come from proof-lane artifacts produced during stress | All lanes pass per iteration and summary is pass | Any lane fails after retries or summary is fail |
