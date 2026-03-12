# T01: 07-backend-services 01

**Slice:** S07 — **Milestone:** M001

## Description

Establish the shared backend contracts and persistence baseline used by every Phase 7 service.

Purpose: lock cross-service response/error/job contracts before service-specific execution work begins.
Output: reusable `services/shared` package and baseline schema primitives.

## Must-Haves

- [ ] All service APIs return one canonical envelope (`success`, `data`, `error`, `code`, `request_id`, `timestamp`) and keep machine-readable `code` stable.
- [ ] Shared async job lifecycle states are fixed to `queued|running|succeeded|failed|canceled`.
- [ ] Shared persistence primitives for idempotency and service jobs are defined once and reused by all services.
- [ ] Event envelopes remain versioned and include explicit `event_version` for downstream compatibility.

## Files

- `package.json`
- `services/shared/package.json`
- `services/shared/tsconfig.json`
- `services/shared/src/contracts/envelope.ts`
- `services/shared/src/contracts/errors.ts`
- `services/shared/src/contracts/jobs.ts`
- `services/shared/src/db/schema.sql`
- `services/shared/src/index.ts`
