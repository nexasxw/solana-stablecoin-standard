# Backend API Reference

## Prerequisites

- Docker and Docker Compose plugin installed
- Services started from repository root
- Local network access to exposed service ports

## Scope

This file is the Phase 9 baseline for shipped backend service API surfaces.

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

## Deferred Content

Per-service endpoint tables, payload schemas, and auth contracts are expanded in later Phase 9 plans.
