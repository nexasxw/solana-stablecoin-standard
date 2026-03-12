# API Surface Map

## Prerequisites

- Node.js 20+
- Yarn 1.x workspace tooling
- Docker and Docker Compose plugin installed
- Services started from repository root when validating backend surfaces

## Scope

This document is the canonical map of shipped public-facing surfaces in this repository.

## Source Of Truth

- CLI command surface: `scripts/sss-token` (wrapper), `sdk/core/src/cli/`
- SDK exports and method contracts: `sdk/core/src/index.ts`, `sdk/core/src/stablecoin.ts`, `sdk/core/src/compliance.ts`
- Backend service APIs: `services/*/src/`

## Provenance Map

| Surface | Public Contract | Provenance |
|---|---|---|
| CLI | `./scripts/sss-token` command tree (`init`, lifecycle, compliance, admin, minters) | `scripts/sss-token`, `sdk/core/src/cli.ts`, `sdk/core/src/cli/commands/*.ts` |
| SDK | `@stbr/sss-token` (`SolanaStablecoin`, `Presets`, compliance module, typed errors) | `sdk/core/src/index.ts`, `sdk/core/src/stablecoin.ts`, `sdk/core/src/compliance.ts`, `sdk/core/src/errors.ts` |
| Mint/Burn service | issuance API and worker processing | `services/mint-burn/src/` |
| Indexer service | finalized ingestion and projection APIs | `services/indexer/src/` |
| Compliance service | screening, review, and audit export APIs | `services/compliance/src/` |
| Webhook service | subscription and delivery APIs | `services/webhook/src/` |

## CLI And SDK Drift Checks

```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
```

## Service Inventory

- `services/mint-burn/`
- `services/indexer/`
- `services/compliance/`
- `services/webhook/`

## Local Runtime Entry

Use Docker Compose as the canonical local API bring-up path:

```bash
docker compose up -d
docker compose ps
```

For SSS-2 compliance profile:

```bash
docker compose --profile sss2 up -d
docker compose --profile sss2 ps
```

## Verification References

- `docker-compose.yml`
- `docs/testing/phase-08-command-truth.md`
- `.planning/phases/09-documentation/09-VALIDATION.md`
