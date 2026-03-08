# SSS-1: Minimal Stablecoin Standard

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

## Program ID

Devnet: `SSS1111111111111111111111111111111111111111` *(placeholder — updated after deployment)*

## Security Properties

- Freeze authority held by stablecoin PDA (not a hot key)
- Per-minter quotas enforced on-chain
- Global pause blocks all mint/burn atomically
- Authority transfer requires current authority signature
