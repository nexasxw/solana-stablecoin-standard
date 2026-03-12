# SSS-1: Minimal Stablecoin Standard

## Prerequisites

- Solana CLI + Anchor CLI installed
- Node.js + Yarn dependencies installed from repository root
- Token authority keypairs available for `authority`, `minter`, `burner`, and `pauser` roles
- CLI path uses `./scripts/sss-token` from repository root (not global `sss-token`)

## Overview

The minimal viable stablecoin on Solana. Provides mint authority, freeze authority, and metadata — nothing more. Compliance is reactive: freeze accounts as needed.

## Use Cases

- Internal corporate tokens
- DAO treasuries
- Ecosystem settlement tokens
- Testnet/devnet stablecoins

## Token-2022 Extensions

| Extension | Purpose |
|-----------|---------|
| `MintCloseAuthority` | Allow closing the mint account when supply is zero |
| `MetadataPointer` | Points to on-chain metadata |
| `TokenMetadata` | Stores name, symbol, URI on-chain |
| `FreezeAuthority` | Allows freezing individual token accounts |

## Roles

| Role | Capability |
|------|-----------|
| `authority` | Master — can pause, transfer authority, update all roles |
| `minter` | Can mint tokens (optional per-minter quota) |
| `burner` | Can burn tokens |
| `pauser` | Can freeze/thaw accounts and pause globally |

No single key controls everything.

## Preset Expectations

SSS-1 is selected with `Presets.SSS_1` and keeps compliance extensions disabled:

- `enable_permanent_delegate = false`
- `enable_transfer_hook = false`
- `default_account_frozen = false` by default

Preset resolution is deterministic:
`explicit runtime options > config file > preset defaults`

## Instructions

| Instruction | Role Required | Description |
|-------------|--------------|-------------|
| `initialize` | authority | Create mint with SSS-1 Token-2022 extensions |
| `mint` | minter | Mint tokens to recipient |
| `burn` | burner | Burn tokens |
| `freeze_account` | pauser | Freeze a token account |
| `thaw_account` | pauser | Thaw a frozen token account |
| `pause` | authority | Pause all mint/burn operations |
| `unpause` | authority | Unpause operations |
| `update_minter` | authority | Add/update minter with optional quota |
| `remove_minter` | authority | Remove a minter |
| `update_roles` | authority | Update pauser and burner roles |
| `transfer_authority` | authority | Transfer master authority |

## Configuration

SDK preset selector: `Presets.SSS_1`.

Canonical preset defaults:
- `decimals = 6`
- `enable_permanent_delegate = false`
- `enable_transfer_hook = false`
- `default_account_frozen = false`

```toml
# config.toml (SSS-1 preset equivalent)
name = "My Stablecoin"
symbol = "MYUSD"
uri = "https://example.com/metadata.json"
decimals = 6
enable_permanent_delegate = false
enable_transfer_hook = false
default_account_frozen = false
```

```json
{
  "name": "My Stablecoin",
  "symbol": "MYUSD",
  "uri": "https://example.com/metadata.json",
  "decimals": 6,
  "enable_permanent_delegate": false,
  "enable_transfer_hook": false,
  "default_account_frozen": false
}
```

Config files are validated strictly in the SDK:
- Required: `name`, `symbol`
- Defaults: `uri = ""`, `decimals = 6`, `default_account_frozen = false`, extension flags = `false`
- Merge precedence is deterministic: `explicit options > config file > preset defaults`
- Unknown fields are rejected
- CamelCase file keys are rejected (file schema is snake_case only)
- Non-object roots (for example `[]` in JSON) are rejected
- Compliance flags must remain paired (`enable_permanent_delegate` and `enable_transfer_hook` both `false` for SSS-1)
- Unknown preset values are rejected at runtime (`Unsupported preset: ...`)
- If either compliance flag resolves to `true` while using `SSS_1`, create fails with: `SSS_1 preset is incompatible with compliance extensions.`

## Operator Workflow

- Operators use `./scripts/sss-token` for lifecycle actions (`init`, `mint`, `burn`, `freeze`, `thaw`, `pause`, `roles`).
- Role-separated signers are expected for production posture; authority signer should not be reused as every operational signer.

## Developer Workflow

- Developers can use `@stbr/sss-token` with `Presets.SSS_1` for deterministic local/devnet setup.
- SDK and CLI both enforce the same preset/config rules and role checks.

## Failure Path Examples

1. Invalid role signer:
   - Attempt: mint with a signer that is not an assigned `minter` role.
   - Expected: CLI exits non-zero with an authorization error envelope (`error` field populated).
2. Invalid preset configuration:
   - Attempt: use `SSS_1` with `enable_transfer_hook=true` or `enable_permanent_delegate=true`.
   - Expected: create fails before initialization with preset incompatibility error.
3. Paused lifecycle operation:
   - Attempt: mint/burn while global pause is enabled.
   - Expected: on-chain instruction returns pause-related error; CLI/SDK surface it as operation failure.

## Program ID

Devnet: `SSS1111111111111111111111111111111111111111` *(placeholder — updated after deployment)*

## Security Properties

- Freeze authority held by stablecoin PDA (not a hot key)
- Per-minter quotas enforced on-chain
- Global pause blocks all mint/burn atomically
- Authority transfer requires current authority signature
