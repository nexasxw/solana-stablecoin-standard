# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open-source SDK and standards for stablecoins on Solana. SSS-1 (minimal) and SSS-2 (compliant, with blacklist/seize).

**Stack**: Anchor 0.31+, Rust 1.82+, Token-2022, TypeScript
**Reference**: `../solana-vault-standard/` for patterns and code quality bar

## Build & Test Commands

```bash
# Build all programs
anchor build

# Build a single program
anchor build -- -p sss_1
anchor build -- -p sss_2
anchor build -- -p sss_transfer_hook

# Run all integration tests (starts local validator automatically)
anchor test

# Run specific test file
anchor test -- tests/sss-1.ts
anchor test -- tests/sss-2.ts

# SDK tests
cd sdk/core && yarn test

# Rust-level checks
cargo check --workspace
cargo clippy --workspace -- -D warnings

# Backend services
docker compose up                      # core services
docker compose --profile sss2 up       # include SSS-2 compliance service
```

## Architecture

```
programs/
  sss-1/              SSS-1: Minimal stablecoin (mint/burn/freeze/thaw, roles, per-minter quotas, pause)
  sss-2/              SSS-2: Compliant stablecoin (extends SSS-1 + permanent delegate + blacklist + seize)
  sss-transfer-hook/  Transfer hook enforcing blacklist checks on every SSS-2 transfer
sdk/core/             @stbr/sss-token TypeScript SDK + CLI
services/             Backend: mint-burn, indexer, compliance, webhook (Docker)
tests/                Anchor integration tests (ts-mocha)
  helpers/            Shared test utilities
docs/                 Standard specs (SSS-1.md, SSS-2.md), ARCHITECTURE.md
```

### Three-Program Model

- **sss-1**: Standalone Anchor program. Token-2022 mint with MintCloseAuthority, MetadataPointer, TokenMetadata, FreezeAuthority. Role-based access (authority, minter, burner, pauser). Per-minter quotas via `MinterConfig` PDAs. Global pause.
- **sss-2**: Extends SSS-1 with PermanentDelegate and TransferHook extensions. Adds blacklister/seizer roles. Blacklist management via PDAs. Seize instruction validates frozen+blacklisted targets and moves full balance to treasury via stablecoin PDA signer.
- **sss-transfer-hook**: Separate program invoked by Token-2022 on every SSS-2 transfer. Checks sender and recipient blacklist PDAs — missing PDA means not blacklisted (no error).

### PDA Seeds

| Account | Seeds |
|---------|-------|
| Stablecoin state | `["stablecoin", mint]` |
| Minter config | `["minter", stablecoin, minter]` |
| Blacklist entry | `["blacklist", stablecoin, address]` |
| Extra account metas | `["extra-account-metas", mint]` |

## Standards

- **SSS-1**: Minimal stablecoin — mint + freeze + metadata
- **SSS-2**: Compliant stablecoin — SSS-1 + permanent delegate + transfer hook + blacklist

## Anti-Patterns — NEVER

**Security:**
- `unwrap()` in program code
- Unchecked arithmetic — use `checked_add`, `checked_sub`
- Recalculate PDA bumps — store canonical bumps
- Skip account validation (owner, signer, PDA derivation)
- Deploy devnet program IDs to mainnet without explicit confirmation

**Code Quality:**
- Comments stating the obvious
- Defensive try/catch abnormal for the codebase
- Import unused dependencies
- Abstractions for one-time operations

## Lessons Learned

**Token-2022 Transfer Hook:**
- Extra accounts must be resolved before CPI, not during
- Use `get_extra_account_metas_address` for hook state PDA
- Blacklist PDAs use Option accounts — missing PDA = not blacklisted (no error)

**Permanent Delegate:**
- PDA must be set as delegate at mint creation time — cannot be added later
- Use `transfer_checked` (not `transfer`) when using permanent delegate

## Review Checklist

- No AI slop introduced
- All arithmetic uses checked operations
- PDA bumps stored and reused (not recalculated)
- SSS-2 instructions fail gracefully if compliance not enabled
- Events emitted for all state changes
