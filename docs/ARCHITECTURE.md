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
2. Checks sender owner — rejects if blacklist PDA exists
3. Checks recipient owner — rejects if blacklist PDA exists

## PDA Seeds

| Account | Seeds |
|---------|-------|
| Stablecoin state | `["stablecoin", authority]` |
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
Validates seizer role
       │
CPI: Token-2022 transfer_checked
     authority = stablecoin PDA (permanent delegate)
     from = target token account
     to = treasury token account
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
