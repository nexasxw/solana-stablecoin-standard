# Solana Stablecoin Standard (SSS)

Open-source SDK and standards for stablecoins on Solana. Modular, production-ready templates that institutions and builders can fork, customize, and deploy.

**Stack**: Anchor 0.31+, Rust 1.82+, Token-2022, TypeScript
**By**: Superteam Brazil

---

## Standards

| Standard | Name | Token-2022 Extensions | Use Case |
|----------|------|-----------------------|----------|
| **SSS-1** | Minimal Stablecoin | MintCloseAuthority, MetadataPointer, TokenMetadata | Internal tokens, DAO treasuries, ecosystem settlement |
| **SSS-2** | Compliant Stablecoin | SSS-1 + PermanentDelegate + TransferHook | USDC/USDT-class regulated stablecoins |

Think OpenZeppelin: the SDK is the library, SSS-1/SSS-2 are the standards.

---

## Architecture

```
Layer 3 — Operator + Developer Surfaces   CLI (`./scripts/sss-token`) · SDK (`@stbr/sss-token`)
                                                        │
Layer 2 — Program Presets                  SSS-1 (minimal) · SSS-2 (compliant)
                                                        │
Layer 1 — On-chain Programs                `sss-1` · `sss-2` · `sss-transfer-hook`
```

### Programs
- `programs/sss-1/` — Minimal stablecoin (SSS-1 preset)
- `programs/sss-2/` — Compliant stablecoin (SSS-2 preset)
- `programs/sss-transfer-hook/` — Transfer hook enforcing blacklist on every transfer

### SDK
- `sdk/core/` — `@stbr/sss-token` TypeScript SDK + `sss-token` CLI

### Backend
- `services/mint-burn/` — Fiat-to-stablecoin lifecycle coordination
- `services/indexer/` — On-chain event listener and off-chain state
- `services/compliance/` — SSS-2 blacklist management and audit trail
- `services/webhook/` — Configurable event notifications

---

## Quick Start

### Install

```bash
yarn install
anchor build
```

### CLI Invocation Contract

Use the repo wrapper for deterministic local execution:

```bash
./scripts/sss-token --help
```

Optional shell install (creates `~/.local/bin/sss-token` symlink by default):

```bash
./scripts/install-sss-token.sh
```

### Deploy SSS-1

```bash
./scripts/sss-token init --preset sss-1
```

### Deploy SSS-2

```bash
./scripts/sss-token init --preset sss-2
```

### Custom Config

```bash
./scripts/sss-token init --custom config.toml
```

---

## TypeScript SDK

```ts
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// SSS-2 preset
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: adminKeypair,
});

// Mint
await stable.mint({ recipient, amount: 1_000_000, minter });

// SSS-2 compliance
await stable.compliance.blacklistAdd(address, "OFAC match");
await stable.compliance.seize(frozenAccount, treasury);

const supply = await stable.getTotalSupply();
```

---

## CLI

```bash
# Init
./scripts/sss-token init --preset sss-1
./scripts/sss-token init --preset sss-2
./scripts/sss-token init --custom config.toml

# Operations
./scripts/sss-token mint <recipient> <amount>
./scripts/sss-token burn <amount>
./scripts/sss-token freeze <address>
./scripts/sss-token thaw <address>
./scripts/sss-token pause && ./scripts/sss-token unpause
./scripts/sss-token status && ./scripts/sss-token supply

# SSS-2 Compliance
./scripts/sss-token blacklist add <address> --reason "OFAC match"
./scripts/sss-token blacklist remove <address>
./scripts/sss-token blacklist check <address>
./scripts/sss-token seize <address> --to <treasury>

# Management
./scripts/sss-token minters get <address>
./scripts/sss-token minters add <address> --quota <amount>
./scripts/sss-token minters remove <address>
./scripts/sss-token holders     # deferred: backend indexer service (Phase 7)
./scripts/sss-token audit-log   # deferred: backend compliance service (Phase 7)
```

---

## Run Tests

```bash
anchor test                  # all integration tests
yarn test:sss1               # SSS-1 only
yarn test:sss2               # SSS-2 only
yarn test:sdk                # TypeScript SDK tests
```

---

## Backend Services

```bash
docker compose up            # start all services
docker compose --profile sss2 up  # SSS-2 compliance services included
```

---

## Documentation

| Doc | Contents |
|-----|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layer model, data flows, security model |
| [SDK.md](docs/SDK.md) | Presets, custom configs, TypeScript examples |
| [OPERATIONS.md](docs/OPERATIONS.md) | Operator runbook |
| [SSS-1.md](docs/SSS-1.md) | Minimal stablecoin standard spec |
| [SSS-2.md](docs/SSS-2.md) | Compliant stablecoin standard spec |
| [COMPLIANCE.md](docs/COMPLIANCE.md) | Regulatory considerations, audit trail |
| [API.md](docs/API.md) | Backend REST API reference |

---

## License

MIT
