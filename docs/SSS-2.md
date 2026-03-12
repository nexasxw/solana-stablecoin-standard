# SSS-2: Compliant Stablecoin Standard

## Prerequisites

- Solana CLI + Anchor CLI installed
- Node.js + Yarn dependencies installed from repository root
- `sss-2` and `sss-transfer-hook` program surfaces available in local build/test environment
- Role keypairs available for `authority`, `minter`, `burner`, `pauser`, `blacklister`, and `seizer`
- CLI path uses `./scripts/sss-token` from repository root

## Overview

SSS-1 + permanent delegate + transfer hook + blacklist enforcement. For regulated stablecoins — USDC/USDT-class tokens where regulators expect on-chain blacklist enforcement and token seizure capabilities.

The transfer hook checks **every transfer** against the blacklist — no gaps.

## Use Cases

- Regulated stablecoins (USDC/USDT-class)
- Tokens requiring OFAC/sanctions compliance
- Institutional stablecoin issuers
- Tokens subject to AML/KYC requirements

## Token-2022 Extensions

All SSS-1 extensions plus:

| Extension | Purpose |
|-----------|---------|
| `PermanentDelegate` | Enables token seizure — stablecoin PDA is permanent delegate |
| `TransferHook` | Calls `sss-transfer-hook` program on every transfer |

## Roles

All SSS-1 roles plus:

| Role | Capability |
|------|-----------|
| `blacklister` | Can add/remove blacklist entries |
| `seizer` | Can seize tokens from frozen/blacklisted accounts |

## Preset Expectations

SSS-2 is selected with `Presets.SSS_2` and requires compliance extensions together:

- `enable_permanent_delegate = true`
- `enable_transfer_hook = true`
- `default_account_frozen = false` by default

Preset resolution is deterministic:
`explicit runtime options > config file > preset defaults`

## Instructions

All SSS-1 instructions plus:

| Instruction | Role Required | Description |
|-------------|--------------|-------------|
| `add_to_blacklist` | blacklister | Add address to blacklist with reason |
| `remove_from_blacklist` | blacklister | Remove address from blacklist |
| `seize` | seizer | Seize full balance from frozen+blacklisted account to treasury via stablecoin PDA signer |

## Transfer Hook Behavior

The `sss-transfer-hook` program is invoked by Token-2022 on every transfer:

1. Resolves sender owner and recipient owner from token accounts
2. Confirms the SSS-2 stablecoin PDA for the mint is initialized
3. Checks sender owner against blacklist PDA — rejects if found
4. Checks recipient owner against blacklist PDA — rejects if found
5. If both checks pass, transfer proceeds

This check cannot be bypassed — it runs at the Token-2022 level.

## Blacklist Entry

```rust
pub struct BlacklistEntry {
    pub stablecoin: Pubkey,
    pub address: Pubkey,    // blacklisted wallet
    pub added_by: Pubkey,   // operator
    pub added_at: i64,      // unix timestamp
    pub reason: String,     // e.g. "OFAC match", "Sanctions screening"
    pub bump: u8,
}
```

Seeds: `["blacklist", stablecoin_pubkey, address]`

## Configuration

SDK preset selector: `Presets.SSS_2`.

Canonical preset defaults:
- `decimals = 6`
- `enable_permanent_delegate = true`
- `enable_transfer_hook = true`
- `default_account_frozen = false`

```toml
# config.toml (SSS-2 preset equivalent)
name = "My Compliant Stablecoin"
symbol = "MYUSD"
uri = "https://example.com/metadata.json"
decimals = 6
enable_permanent_delegate = true
enable_transfer_hook = true
default_account_frozen = false
```

```json
{
  "name": "My Compliant Stablecoin",
  "symbol": "MYUSD",
  "uri": "https://example.com/metadata.json",
  "decimals": 6,
  "enable_permanent_delegate": true,
  "enable_transfer_hook": true,
  "default_account_frozen": false
}
```

SDK config validation is strict:
- Required: `name`, `symbol`
- Defaults: `uri = ""`, `decimals = 6`, `default_account_frozen = false`
- Merge precedence is deterministic: `explicit options > config file > preset defaults`
- Unknown fields are rejected
- CamelCase file keys are rejected (file schema is snake_case only)
- Non-object roots (for example `[]` in JSON) are rejected
- Compliance flags must be paired (`enable_permanent_delegate` and `enable_transfer_hook` must both be `true` for SSS-2)
- Unknown preset values are rejected at runtime (`Unsupported preset: ...`)
- If either compliance flag resolves to `false` while using `SSS_2`, create fails with: `SSS_2 preset requires both enablePermanentDelegate and enableTransferHook.`

## Operator Workflow

- Operators use `./scripts/sss-token` for base lifecycle operations plus compliance flows:
  - `blacklist add/remove/check`
  - `seize`
- Compliance operations should use dedicated `blacklister` and `seizer` signers, not the general authority signer.

## Developer Workflow

- Developers can initialize with `Presets.SSS_2` in `@stbr/sss-token` and then call compliance helpers (`addToBlacklist`, `removeFromBlacklist`, `seize`).
- CLI and SDK must both be treated as contract surfaces over the same on-chain enforcement rules.

## Feature Gating

SSS-2 compliance instructions (`add_to_blacklist`, `remove_from_blacklist`, `seize`) will fail with a clear error if the compliance module was not enabled during initialization:

```
Error: ComplianceNotEnabled — initialize with enable_transfer_hook = true
Error: PermanentDelegateNotEnabled — initialize with enable_permanent_delegate = true
```

## Failure Path Examples

1. Invalid role signer:
   - Attempt: run blacklist update with a signer that is not the `blacklister` role.
   - Expected: instruction fails authorization checks and CLI returns non-zero with `error` details.
2. Invalid preset configuration:
   - Attempt: initialize `SSS_2` with `enable_transfer_hook=false` or `enable_permanent_delegate=false`.
   - Expected: SDK create flow fails early with preset configuration error.
3. Invalid seize preconditions:
   - Attempt: `seize` on account not both frozen and blacklisted.
   - Expected: seize fails with explicit precondition/compliance error; no token movement occurs.
4. Compliance module disabled:
   - Attempt: call blacklist/seize instructions on a deployment initialized without compliance extensions.
   - Expected: `ComplianceNotEnabled` or `PermanentDelegateNotEnabled` error path.

## Program IDs

Devnet: `SSS2222222222222222222222222222222222222222` *(placeholder)*
Transfer Hook: `SSSHook111111111111111111111111111111111111` *(placeholder)*

## Security Properties

- Permanent delegate is stablecoin PDA (no hot key)
- Transfer hook cannot be bypassed (Token-2022 enforces it)
- Blacklist PDAs are on-chain and auditable
- Seize requires explicit seizer role (separate from authority)
- All compliance actions emit on-chain events for audit trail
