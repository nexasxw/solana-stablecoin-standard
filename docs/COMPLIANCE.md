# Compliance Workflow Contract (SSS-2)

This document defines executable operator workflows for SSS-2 blacklist and seizure behavior.

## Prerequisites

- Use a deployment initialized as `SSS_2`.
- Provide runtime context for CLI commands:
  - `--mint <address>`
  - `--variant SSS_2`
  - signer paths for compliance roles (`--blacklister-signer`, `--seizer-signer`) or equivalent config/env.
- Mutating commands require confirmation. For non-interactive runs, include `--yes`.
- Canonical invocation:
  - `./scripts/sss-token ...`

## Source Of Truth

- CLI command registration:
  - `sdk/core/src/cli/commands/compliance.ts`
- SDK compliance implementation:
  - `sdk/core/src/compliance.ts`
- JSON envelope and error format:
  - `sdk/core/src/cli/output.ts`
  - `sdk/core/src/cli/errors.ts`

## Blacklist Workflows

### Add To Blacklist (human-readable output)

```bash
./scripts/sss-token \
  --mint <MINT> \
  --variant SSS_2 \
  --blacklister-signer <BLACKLISTER_KEYPAIR_PATH> \
  --yes \
  blacklist add <WALLET_ADDRESS> --reason "OFAC match"
```

Expected intent: queue and submit an on-chain `addToBlacklist` mutation for the target address.

### Add To Blacklist (`--json`)

```bash
./scripts/sss-token \
  --mint <MINT> \
  --variant SSS_2 \
  --blacklister-signer <BLACKLISTER_KEYPAIR_PATH> \
  --yes \
  --json \
  blacklist add <WALLET_ADDRESS> --reason "OFAC match"
```

Success envelope shape:

```json
{
  "ok": true,
  "command": "blacklist add",
  "data": {
    "operation": "blacklistAdd",
    "signature": "<tx-signature>",
    "confirmation": {
      "commitment": "processed|confirmed|finalized",
      "confirmationStatus": "processed|confirmed|finalized|null",
      "slot": 123,
      "confirmations": 1
    }
  },
  "error": null
}
```

### Remove From Blacklist

```bash
./scripts/sss-token \
  --mint <MINT> \
  --variant SSS_2 \
  --blacklister-signer <BLACKLISTER_KEYPAIR_PATH> \
  --yes \
  blacklist remove <WALLET_ADDRESS>
```

### Check Blacklist Status

```bash
./scripts/sss-token \
  --mint <MINT> \
  --variant SSS_2 \
  --json \
  blacklist check <WALLET_ADDRESS>
```

Expected `--json` data shape:

```json
{
  "ok": true,
  "command": "blacklist check",
  "data": {
    "address": "<base58>",
    "blacklisted": true
  },
  "error": null
}
```

## Seizure Workflow

```bash
./scripts/sss-token \
  --mint <MINT> \
  --variant SSS_2 \
  --seizer-signer <SEIZER_KEYPAIR_PATH> \
  --yes \
  seize <FROM_TOKEN_ACCOUNT> <TARGET_OWNER> --to <TREASURY_TOKEN_ACCOUNT>
```

`seize` maps to `ComplianceModule.seize(fromTokenAccount, targetOwner, treasuryTokenAccount, seizer)`.

### Seizure Workflow (`--json`)

```bash
./scripts/sss-token \
  --mint <MINT> \
  --variant SSS_2 \
  --seizer-signer <SEIZER_KEYPAIR_PATH> \
  --yes \
  --json \
  seize <FROM_TOKEN_ACCOUNT> <TARGET_OWNER> --to <TREASURY_TOKEN_ACCOUNT>
```

Success envelope shape:

```json
{
  "ok": true,
  "command": "seize",
  "data": {
    "operation": "seize",
    "signature": "<tx-signature>",
    "confirmation": {
      "commitment": "processed|confirmed|finalized",
      "confirmationStatus": "processed|confirmed|finalized|null",
      "slot": 123,
      "confirmations": 1
    }
  },
  "error": null
}
```

## Deterministic Failure Contracts

### 1. Wrong variant / unauthorized surface

Calling compliance commands with `--variant SSS_1` or a deployment that resolves to SSS-1 returns CLI SDK failure:

- Human output form:
  - `blacklist add: CLI_SDK/UNSUPPORTED_OPERATION ...`
- JSON envelope shape:

```json
{
  "ok": false,
  "command": "blacklist add",
  "data": null,
  "error": {
    "code": "CLI_SDK",
    "message": "Compliance commands are only available for SSS_2 deployments.",
    "details": {
      "sdkCode": "UNSUPPORTED_OPERATION"
    }
  }
}
```

### 2. Invalid reason / invalid argument

Examples:
- Missing or empty `--reason` for `blacklist add`
- Invalid base58 values for `address`, `fromTokenAccount`, `targetOwner`, or `--to`
- `seize` without required `--to <treasuryTokenAccount>`

Expected failure class:
- `CLI_USAGE` for parse/usage failures
- `CLI_SDK` with `sdkCode: INVALID_REASON` or `sdkCode: INVALID_ARGUMENT` when SDK validation fails

### 3. Missing signer configuration

If role signer path is absent for `blacklister` or `seizer`:

- JSON envelope error code: `CLI_SIGNER`
- Human output starts with:
  - `blacklist add: CLI_SIGNER ...`
  - `seize: CLI_SIGNER ...`

### 4. RPC and on-chain rejection

Network or on-chain rejection surfaces as:

- CLI code: `CLI_SDK`
- `details.sdkCode`: `RPC_ERROR`

The exact on-chain rejection reason is environment-dependent, but the envelope/code contract is stable.

## Verification Commands

```bash
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
```

These commands are the drift checks for this document’s command surface.
