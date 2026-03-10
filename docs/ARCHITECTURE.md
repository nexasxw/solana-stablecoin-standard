# Architecture

## Layer Model

```
┌─────────────────────────────────────────────┐
│  Layer 3 — Standard Presets                 │
│  SSS-1 (Minimal)  ·  SSS-2 (Compliant)      │
├─────────────────────────────────────────────┤
│  Layer 2 — Modules (composable, optional)   │
│  Compliance  ·  Roles  ·  Privacy (SSS-3)   │
├─────────────────────────────────────────────┤
│  Layer 1 — Base SDK                         │
│  Token creation · Role management           │
│  CLI · TypeScript SDK                       │
└─────────────────────────────────────────────┘
```

Preset/config resolution in the SDK follows deterministic precedence:
`explicit runtime options > config file (.toml/.json) > preset defaults`.

Configuration schema policy is strict:
- File keys must be `snake_case` (`camelCase` input is rejected)
- Unknown fields are rejected
- Non-object roots are rejected before schema parsing
- Compliance flags must remain paired (`enable_permanent_delegate` and `enable_transfer_hook` both `true` or both `false`)
- Unsupported preset selectors are rejected at runtime (`SSS_1` and `SSS_2` only)

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

## Phase 4 Preset Traceability

`PRE-01`, `PRE-02`, and `PRE-03` are evidenced by:
- Runtime contract and guard behavior in `sdk/core/src/presets.ts`, `sdk/core/src/config.ts`, and `sdk/core/src/stablecoin.ts`
- Regression coverage in `sdk/core/tests/presets.test.ts`, `sdk/core/tests/config.test.ts`, and `sdk/core/tests/stablecoin.create.test.ts`
- Execution evidence in `.planning/phases/04-preset-configurations/04-01-SUMMARY.md`
