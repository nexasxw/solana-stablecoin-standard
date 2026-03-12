# Operations Runbook

## Prerequisites

- Docker + `docker compose`
- Anchor CLI 0.31+
- Node.js 20+ and Yarn
- Solana CLI (for on-chain command verification)
- Repository dependencies installed (`yarn install`)

## Scope

This runbook defines the baseline local operator flow and verification references for current shipped behavior.

## Core Command Surfaces

```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
docker compose config >/dev/null
```

## Local Stack Bring-Up

```bash
docker compose up -d
docker compose ps
```

SSS-2 compliance profile:

```bash
docker compose --profile sss2 up -d
docker compose --profile sss2 ps
```

## Verification References

- `docs/testing/phase-08-command-truth.md`
- `docs/testing/phase-08-devnet-evidence.md`
- `docs/testing/phase-08-regression-matrix.md`
- `.planning/phases/09-documentation/09-VALIDATION.md`

## Deferred Content

Service-specific incident and escalation playbooks are documented in later phase plans.
