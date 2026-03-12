# Devnet Proof Scripts (Phase 08)

These scripts provide deterministic, operator-style proof runs for Phase 08 `TST-03`.

## Scripts

- `scripts/devnet/phase-08-sss1-proof.sh`
- `scripts/devnet/phase-08-sss2-proof.sh`

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
