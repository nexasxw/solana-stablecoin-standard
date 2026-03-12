# T02: 07-backend-services 02

**Slice:** S07 — **Milestone:** M001

## Description

Deliver SRV-02 finalized-event indexer, stablecoin projections, and operational backfill/reconciliation controls.

Purpose: convert on-chain activity into deterministic off-chain state and versioned internal events.
Output: production indexer ingest path, read APIs, and bounded repair controls.

## Must-Haves

- [ ] Only finalized chain events become authoritative persisted state; non-finalized observations are never committed to durable projections.
- [ ] Event ingestion is deduplicated with deterministic uniqueness keys and checkpoint progression is monotonic.
- [ ] Indexer publishes normalized, versioned internal events consumable by compliance and webhook services without schema drift.
- [ ] Backfill and reconciliation are explicit bounded operations with operator-visible status.

## Files

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
