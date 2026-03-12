# Phase 7: Backend Services - Research

**Researched:** 2026-03-11  
**Scope:** Planning inputs for `SRV-01`, `SRV-02`, `SRV-03`, `SRV-04`  
**Research question:** What do we need to know to plan this phase well?

## What Is Locked Already

From `07-CONTEXT.md`, these are non-negotiable constraints for planning:
- All mutating flows are async job-oriented.
- Canonical response envelope is fixed: `success`, `data`, `error`, `code`, `request_id`, `timestamp`.
- Shared job lifecycle states are fixed: `queued`, `running`, `succeeded`, `failed`, `canceled`.
- Idempotency keys are mandatory on all mutating APIs.
- Machine-readable error `code` is contractual; message text is not.
- Finalized chain data is authoritative for durable off-chain state.
- Compliance decisions must be `allow`, `deny`, or `review_required` with stable reason codes.
- Webhooks must be at-least-once, per-entity ordered, HMAC-signed, retried with capped backoff, and dead-lettered.

## Requirement Fit (SRV-01..SRV-04)

- `SRV-01` mint/burn lifecycle service: feasible now via SDK `mint`/`burn`; requires new HTTP + job + idempotency layer.
- `SRV-02` indexer service: feasible now; requires projection schema, checkpoints, dedupe, and reconciliation control plane.
- `SRV-03` compliance service: feasible now via SDK compliance methods; requires screening API, audit log model, and export jobs.
- `SRV-04` webhook service: feasible now with Redis/Postgres in compose; requires subscription contracts, delivery workers, retry/DLQ, and HMAC rotation flow.

## Current Codebase Reality (Plan-Critical)

### Reusable Assets
- `sdk/core/src/stablecoin.ts` and `sdk/core/src/compliance.ts`: canonical Solana operation surface.
- `sdk/core/src/errors.ts`: stable code taxonomy to map into service `code`.
- `sdk/core/src/cli/commands/management.ts`: confirms `holders` and `audit-log` are intentionally deferred to Phase 7.
- `docker-compose.yml`: base infra exists (`postgres`, `redis`, service slots).

### Hard Gaps
- `services/*/src/index.ts` are scaffolds.
- No shared service package exists yet for envelopes, errors, auth, idempotency, DB, queue, event contracts.
- No schema/migrations for jobs, projections, subscriptions, deliveries, audit export.
- Compose expects service builds but service Dockerfiles are not present yet.

## Standard Stack

Use one consistent service stack to prevent drift:
- Node.js + TypeScript across all services.
- One common HTTP framework and one common validation library.
- PostgreSQL for durable state.
- Redis-backed queue for async jobs and webhook retries.
- Existing SDK (`@stbr/sss-token`) for all chain interactions; do not re-implement clients.
- Shared observability baseline: structured logs, metrics, health/readiness endpoints.

## Architecture Patterns

### 1) Shared Contract Foundation First
Plan a `services/shared` workspace first with:
- response envelope helpers,
- error catalog + mapper,
- request id + tenant context middleware,
- idempotency guard,
- auth/authorization primitives,
- common pagination/query utilities.

### 2) Command/Query Separation
- Command APIs enqueue work and return job handles quickly.
- Query APIs provide deterministic status/projection/audit reads.

### 3) Event Normalization Layer
Normalize all internal events into one envelope:
- `event_id`, `event_type`, `event_version`, `request_id`, `occurred_at`, `body`.

### 4) Tenant Isolation as a Data Invariant
- Every table and endpoint must enforce tenant scope.
- No cross-tenant reads through implicit joins or missing filters.

### 5) Durable Idempotency
- Persist `idempotency_key`, request fingerprint, and first response body.
- Same key + same payload returns prior result.
- Same key + different payload returns deterministic conflict error.

## Service Contract Baseline to Lock During Planning

### SRV-01 Mint/Burn Service
- `POST /v1/issuance/mint-jobs`
- `POST /v1/issuance/burn-jobs`
- `GET /v1/issuance/jobs/:jobId`
- `GET /v1/issuance/jobs?tenant=...&status=...&limit=...`

### SRV-02 Indexer Service
- Finalized-event ingestion + checkpointing.
- Stablecoin projection reads including holders/state views.
- Backfill trigger + reconciliation status endpoints.

### SRV-03 Compliance Service
- Sync screening endpoint (`allow|deny|review_required`).
- Blacklist/seize job APIs.
- Paged audit query + async export jobs.

### SRV-04 Webhook Service
- Tenant-scoped subscription CRUD with event filters.
- Delivery history + retry/dead-letter inspection endpoints.
- HMAC signature + timestamp + secret rotation support.

## Data Model Baseline (Must Be Planned Before Coding)

Minimum shared schema set:
- `service_jobs`
- `idempotency_keys`
- `indexer_checkpoints`
- `stablecoin_projections`
- `holder_balances`
- `compliance_screenings`
- `compliance_audit_log`
- `audit_export_jobs`
- `webhook_subscriptions`
- `webhook_deliveries`
- `webhook_dead_letters`

Critical indexes:
- `UNIQUE (tenant_id, idempotency_key)`
- `UNIQUE (program_id, slot, tx_signature, log_index)`
- `INDEX (tenant_id, created_at DESC)`
- `UNIQUE (entity_key, sequence)` for per-entity ordering guarantees

## Recommended 6-Plan Decomposition

1. `07-01`: shared backend contracts + persistence foundation.
2. `07-04`: SRV-01 issuance API, idempotency middleware, and worker path.
3. `07-02`: SRV-02 indexer ingestion/projection + holders read model.
4. `07-03`: SRV-03 compliance screening, mutation jobs, and audit exports.
5. `07-05`: SRV-04 webhook subscriptions, delivery engine, and signing contracts.
6. `07-06`: phase E2E hardening and request-trace signoff.

## Don’t Hand-Roll

- Solana instruction/client logic (use SDK only).
- In-memory retry schedulers for durable workflows.
- Ad-hoc request validation without shared runtime schemas.
- Custom cryptography for webhook signing.

## Common Pitfalls

- Using non-finalized chain data as durable truth.
- Missing idempotency persistence (double-mint/double-burn risk).
- Global webhook ordering instead of per-entity ordering.
- Non-deterministic error contracts.
- Losing `request_id` across queue/event boundaries.
- Divergent response envelopes across services.

## Validation Architecture

Nyquist goal for this phase: each requirement (`SRV-01..SRV-04`) has explicit verification layers and executable quick/full gates with objective evidence.

### Command Baseline

Quick gate (fast local confidence while implementing):
```bash
yarn lint
yarn build
yarn workspace @stbr/sss-mint-burn test
yarn workspace @stbr/sss-indexer test
yarn workspace @stbr/sss-compliance test
yarn workspace @stbr/sss-webhook test
```

Full gate (pre-merge Nyquist evidence pass):
```bash
yarn lint
yarn build
yarn test:sss1
yarn test:sss2
yarn test:integration
yarn test:sdk
docker compose up -d postgres redis
# Run service integration suites once added in Phase 7 plans
# (recommended script names to add):
# yarn test:services:issuance
# yarn test:services:indexer
# yarn test:services:compliance
# yarn test:services:webhook
# yarn test:services:e2e
```

### Requirement-Mapped Verification Strategy

`SRV-01` mint/burn service:
- Quick: unit tests for request validation, idempotency replay/conflict, envelope/error mapping, and job state transitions.
- Full: integration tests enqueueing mint/burn jobs, worker execution via SDK, polling terminal states, and duplicate-key replay safety under concurrency.
- Evidence: job records, idempotency table rows, deterministic response snapshots with stable `code` values.

`SRV-02` indexer service:
- Quick: unit tests for event normalization, dedupe key derivation, projection reducers, and checkpoint updates.
- Full: integration replay tests from seeded event streams validating finalized-only persistence, bounded backfill, reconciliation reports, and holders read-model correctness.
- Evidence: projection snapshots, checkpoint progression logs, dedupe invariants (`UNIQUE` key not violated).

`SRV-03` compliance service:
- Quick: unit tests for screening decision engine outputs (`allow|deny|review_required`) and reason-code determinism.
- Full: integration tests for blacklist/seize workflow orchestration, audit logging with identity chain, and export-job lifecycle (`queued` -> terminal).
- Evidence: audit log entries, export job metadata, reason-code fixtures proving deterministic outcomes.

`SRV-04` webhook service:
- Quick: unit tests for subscription filter matching, per-entity ordering scheduler, retry policy math, signature generation/verification.
- Full: integration tests with mock receivers covering 2xx success, timeout/non-2xx retry, capped attempts to DLQ, secret rotation dual-key grace behavior, and per-entity ordered delivery under parallel load.
- Evidence: delivery attempt history, DLQ entries, signature verification traces, sequence monotonicity per entity key.

### Nyquist Planning Rules

- No plan is complete unless it adds tests and data fixtures in the same slice as behavior.
- Each plan must define pass/fail commands and required artifacts before implementation starts.
- End-of-phase signoff requires one E2E path: issuance/compliance action -> indexer projection update -> webhook delivery with traceable `request_id`.

## Resolved Decisions Used For Plan Authoring

- Internal auth standard is locked to issuer-only authorization plus verifiable operator intent-signature context on mutating flows.
  - Enforced in `07-04` must-have truth and verification checklist for issuer-only rejection + signature-context tests.
- Canonical route versioning is locked to per-service `/v1/*` routes.
  - Enforced in `07-04` Task 2 issuance routes (`/v1/issuance/*`) and `07-03`/`07-05` route surfaces.
- Webhook fanout transport is locked to Postgres outbox plus Redis-backed delivery workers.
  - Enforced in `07-05` must-have truth for transport selection and delivery engine implementation.
- Retention windows are locked as explicit service contracts.
  - Enforced in `07-03` and `07-05` must-have truths for audit-export and delivery/DLQ retention windows and purge behavior.

## Research Verdict

Phase 7 is feasible and ready to plan if planning locks shared contracts first, then implements services in dependency order (`SRV-01` -> `SRV-02` -> `SRV-03/04`). Main risk is cross-service contract drift, not technical feasibility. Nyquist compliance hinges on requirement-mapped validation being designed into each plan, not appended after implementation.

## RESEARCH COMPLETE