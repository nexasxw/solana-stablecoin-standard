# Solana Stablecoin Standard (SSS)

Open-source SDK and standards for stablecoins on Solana. Modular, production-ready templates that institutions and builders can fork, customize, and deploy.

**Stack**: Anchor 0.31+, Rust 1.82+, Token-2022, TypeScript
**By**: Superteam Brazil

---

## Standards

| Standard | Name | Token-2022 Extensions | Use Case |
|----------|------|-----------------------|----------|
| **SSS-1** | Minimal Stablecoin | MintCloseAuthority, MetadataPointer, TokenMetadata | Internal tokens, DAO treasuries, ecosystem settlement |
| **SSS-2** | Compliant Stablecoin | SSS-1 + PermanentDelegate, TransferHook | USDC/USDT-class regulated stablecoins |

Think OpenZeppelin: the SDK is the library, SSS-1/SSS-2 are the standards.

---

## Architecture

```
Layer 3 — Standard Presets   SSS-1 · SSS-2
                                   │
Layer 2 — Modules            Compliance · Privacy
                                   │
Layer 1 — Base SDK           Token creation · Roles · CLI · TypeScript SDK
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

### Deploy SSS-1

```bash
sss-token init --preset sss-1
```

### Deploy SSS-2

```bash
sss-token init --preset sss-2
```

### Custom Config

```bash
sss-token init --custom config.toml
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
sss-token init --preset sss-1
sss-token init --preset sss-2
sss-token init --custom config.toml

# Operations
sss-token mint <recipient> <amount>
sss-token burn <amount>
sss-token freeze <address>
sss-token thaw <address>
sss-token pause && sss-token unpause
sss-token status && sss-token supply

# SSS-2 Compliance
sss-token blacklist add <address> --reason "OFAC match"
sss-token blacklist remove <address>
sss-token seize <address> --to <treasury>

# Management
sss-token minters list
sss-token minters add <address> --quota <amount>
sss-token holders
sss-token audit-log
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
