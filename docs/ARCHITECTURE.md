# Architecture

## Prerequisites

- Solana CLI installed (`solana --version`)
- Anchor CLI 0.31+ (`anchor --version`)
- Node.js 18+ with Yarn (`node --version`, `yarn --version`)
- Local validator workflow via Anchor test runner (`anchor test`) and CLI wrapper (`./scripts/sss-token`)
- Token-2022 mint assumptions: SSS programs create and operate on Token-2022 mints only

## Layer Model

```
┌────────────────────────────────────────────────────┐
│ Layer 3 — Operator + Developer Surfaces           │
│ `./scripts/sss-token` CLI · `@stbr/sss-token` SDK │
├────────────────────────────────────────────────────┤
│ Layer 2 — Program Presets                         │
│ SSS-1 (minimal) · SSS-2 (compliant)               │
├────────────────────────────────────────────────────┤
│ Layer 1 — On-chain Programs                        │
│ `sss-1` · `sss-2` · `sss-transfer-hook`            │
└────────────────────────────────────────────────────┘
```

Preset/config resolution in the SDK follows deterministic precedence:
`explicit runtime options > config file (.toml/.json) > preset defaults`.

Configuration schema policy is strict:
- File keys must be `snake_case` (`camelCase` input is rejected)
- Unknown fields are rejected
- Non-object roots are rejected before schema parsing
- Compliance flags must remain paired (`enable_permanent_delegate` and `enable_transfer_hook` both `true` or both `false`)
- Unsupported preset selectors are rejected at runtime (`SSS_1` and `SSS_2` only)

## Layer Contracts

### Layer 1: On-chain programs

- `sss-1` provides baseline stablecoin lifecycle: initialize, mint, burn, freeze/thaw, pause/unpause, role updates, and authority transfer.
- `sss-2` extends baseline lifecycle with blacklist management and seizure semantics.
- `sss-transfer-hook` enforces blacklist checks during Token-2022 transfer execution for SSS-2 mints.

Failure-path note:
- If transfer hook or permanent delegate extensions are not enabled at initialization, SSS-2 compliance flows fail with explicit compliance-gating errors instead of partial execution.

### Layer 2: Preset contracts

- `SSS_1` preset: baseline lifecycle only, with compliance extensions disabled.
- `SSS_2` preset: baseline lifecycle plus compliance extensions enabled together.
- Preset misuse is rejected during SDK create/load resolution.

Failure-path note:
- `SSS_1` with compliance flags enabled fails.
- `SSS_2` with either compliance flag disabled fails.

### Layer 3: CLI + SDK surfaces

- CLI (`./scripts/sss-token`) and SDK (`@stbr/sss-token`) expose deterministic operator/developer workflows over the same on-chain contracts.
- Role-bearing operations require explicit signer context and return deterministic error envelopes for invalid role/configuration inputs.

Failure-path note:
- Role mismatches and invalid configuration inputs return explicit SDK/CLI errors and non-zero command exits.

## Programs

### `sss-1` — Minimal Stablecoin

Single configurable Anchor program. Handles:
- Token-2022 mint creation with MintCloseAuthority, MetadataPointer, TokenMetadata
- Role-based access (authority, minter, burner, pauser)
- Per-minter quotas enforced via MinterConfig PDAs
- Global pause

### `sss-2` — Compliant Stablecoin

Extends SSS-1 with:
- PermanentDelegate extension (stablecoin PDA as delegate)
- TransferHook extension pointing to `sss-transfer-hook`
- Blacklist PDA management (add/remove)
- Seize instruction via permanent delegate
- Additional roles: blacklister, seizer

### `sss-transfer-hook` — Transfer Hook

Separate program invoked by Token-2022 on every SSS-2 transfer:
1. Resolves extra account metas (stablecoin PDA, sender/recipient blacklist PDAs)
2. Verifies the SSS-2 stablecoin PDA is initialized (otherwise returns without enforcement)
3. Checks sender owner — rejects if blacklist PDA exists
4. Checks recipient owner — rejects if blacklist PDA exists

## PDA Seeds

| Account | Seeds |
|---------|-------|
| Stablecoin state | `["stablecoin", mint]` |
| Minter config | `["minter", stablecoin, minter]` |
| Blacklist entry | `["blacklist", stablecoin, address]` |
| Extra account metas | `["extra-account-metas", mint]` |

## Token-2022 Extension Matrix

| Extension | SSS-1 | SSS-2 |
|-----------|-------|-------|
| MintCloseAuthority | ✓ | ✓ |
| MetadataPointer | ✓ | ✓ |
| TokenMetadata | ✓ | ✓ |
| FreezeAuthority | ✓ | ✓ |
| PermanentDelegate | — | ✓ |
| TransferHook | — | ✓ |

## Data Flow: SSS-2 Transfer

```
User initiates transfer
       │
Token-2022 program
       │
Calls transfer hook (sss-transfer-hook)
       │
       ├── Is SSS-2 stablecoin initialized? no → return
       │
       ├── Check sender blacklist PDA → exists? REJECT
       │
       └── Check recipient blacklist PDA → exists? REJECT
                        │
                   Both clear → transfer proceeds
```

## Data Flow: Seize

```
Seizer calls sss-2::seize()
       │
Validates seizer role + treasury + frozen target + blacklist
       │
Thaw target account with stablecoin PDA signer
       │
Burn full target balance with stablecoin PDA signer
       │
Mint same amount to treasury with stablecoin PDA signer
       │
Emits TokensSeized event
```

## Security Model

- No hot keys hold program authority — all authority held by PDAs
- Per-minter quotas: even compromised minter key has limited blast radius
- Global pause: one tx stops all minting/burning
- Transfer hook: compliance cannot be opted out of at the token level
- Seize: requires separate seizer role (not just authority)
- All state changes emit events (on-chain audit trail)

## SSS-1 vs SSS-2 Boundary

- SSS-1 is for non-compliance deployments: no blacklist PDAs, no transfer-hook enforcement, no seizure.
- SSS-2 is for compliance deployments: blacklist PDAs + transfer-hook + permanent delegate are required together.
- Shared lifecycle instructions remain aligned across both standards; compliance instructions are SSS-2-only.
- Boundary is set at initialization and enforced by preset validation plus on-chain compliance-gating checks.

## Phase 4 Preset Traceability

`PRE-01`, `PRE-02`, and `PRE-03` are evidenced by:
- Runtime contract and guard behavior in `sdk/core/src/presets.ts`, `sdk/core/src/config.ts`, and `sdk/core/src/stablecoin.ts`
- Regression coverage in `sdk/core/tests/presets.test.ts`, `sdk/core/tests/config.test.ts`, and `sdk/core/tests/stablecoin.create.test.ts`
- Execution evidence in `.planning/phases/04-preset-configurations/04-01-SUMMARY.md`
