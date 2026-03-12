# S07: Backend Services

**Goal:** Establish the shared backend contracts and persistence baseline used by every Phase 7 service.
**Demo:** Establish the shared backend contracts and persistence baseline used by every Phase 7 service.

## Must-Haves


## Tasks

- [x] **T01: 07-backend-services 01** `est:2min`
  - Establish the shared backend contracts and persistence baseline used by every Phase 7 service.

Purpose: lock cross-service response/error/job contracts before service-specific execution work begins.
Output: reusable `services/shared` package and baseline schema primitives.
- [x] **T02: 07-backend-services 02** `est:8min`
  - Deliver SRV-02 finalized-event indexer, stablecoin projections, and operational backfill/reconciliation controls.

Purpose: convert on-chain activity into deterministic off-chain state and versioned internal events.
Output: production indexer ingest path, read APIs, and bounded repair controls.
- [x] **T03: 07-backend-services 03** `est:5min`
  - Deliver SRV-03 compliance decisioning, mutation orchestration, and audit export capabilities.

Purpose: lock deterministic compliance outcomes and evidence surfaces needed by operations and later E2E proof.
Output: compliance APIs/jobs/audit exports with stable reason-code and identity-chain behavior.
- [x] **T04: 07-backend-services 04** `est:8min`
  - Deliver SRV-01 issuance command path with shared auth/context/idempotency middleware and deterministic worker execution.

Purpose: make mint/burn backend mutation flows production-safe and replay-safe.
Output: issuance APIs, async workers, and deterministic SRV-01 regression tests.
- [x] **T05: 07-backend-services 05** `est:25min`
  - Deliver SRV-04 webhook subscription and delivery engine with deterministic retries, ordering, authenticity, and dead-letter semantics.

Purpose: provide downstream integration hooks with contractual reliability and signature verification behavior.
Output: webhook CRUD + delivery workers + regression suites for ordering/retry/signature-rotation invariants.
- [x] **T06: 07-backend-services 06** `est:2min`
  - Finalize Phase 7 with cross-service E2E evidence and integration-hardening regression tests.

Purpose: prove SRV-01..04 work together as one deterministic backend workflow.
Output: authoritative integration trace plus targeted hardening tests for boundary contracts.

## Files Likely Touched

- `package.json`
- `services/shared/package.json`
- `services/shared/tsconfig.json`
- `services/shared/src/contracts/envelope.ts`
- `services/shared/src/contracts/errors.ts`
- `services/shared/src/contracts/jobs.ts`
- `services/shared/src/db/schema.sql`
- `services/shared/src/index.ts`
- `services/shared/src/db/schema.sql`
- `services/indexer/src/ingest/finalized-consumer.ts`
- `services/indexer/src/ingest/event-normalizer.ts`
- `services/indexer/src/projections/stablecoin-projection.ts`
- `services/indexer/src/projections/holder-balances.ts`
- `services/indexer/src/reconciliation/backfill.ts`
- `services/indexer/src/routes/projections.ts`
- `services/indexer/src/store/indexer-repository.ts`
- `services/indexer/src/__tests__/indexer.integration.test.ts`
- `.planning/phases/07-backend-services/07-02-SUMMARY.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `services/shared/src/db/schema.sql`
- `services/compliance/src/index.ts`
- `services/compliance/src/routes/screening.ts`
- `services/compliance/src/routes/compliance-jobs.ts`
- `services/compliance/src/routes/audit.ts`
- `services/compliance/src/jobs/compliance-worker.ts`
- `services/compliance/src/jobs/audit-export-worker.ts`
- `services/compliance/src/store/compliance-repository.ts`
- `services/compliance/src/__tests__/compliance.integration.test.ts`
- `services/shared/src/db/schema.sql`
- `services/shared/src/middleware/request-context.ts`
- `services/shared/src/auth/service-auth.ts`
- `services/shared/src/middleware/idempotency.ts`
- `services/mint-burn/src/routes/issuance.ts`
- `services/mint-burn/src/jobs/issuance-worker.ts`
- `services/mint-burn/src/store/issuance-repository.ts`
- `services/mint-burn/src/__tests__/issuance.api.test.ts`
- `services/mint-burn/src/__tests__/issuance.worker.test.ts`
- `services/shared/src/db/schema.sql`
- `services/webhook/src/routes/subscriptions.ts`
- `services/webhook/src/routes/deliveries.ts`
- `services/webhook/src/jobs/delivery-worker.ts`
- `services/webhook/src/security/signature.ts`
- `services/webhook/src/store/webhook-repository.ts`
- `services/webhook/src/__tests__/delivery-ordering.test.ts`
- `services/webhook/src/__tests__/retry-dlq.test.ts`
- `services/webhook/src/__tests__/signature-rotation.test.ts`
- `tests/integration.ts`
- `services/compliance/src/__tests__/screening.test.ts`
- `services/compliance/src/__tests__/audit-export.test.ts`
- `services/webhook/src/index.ts`
- `services/shared/src/db/schema.sql`
