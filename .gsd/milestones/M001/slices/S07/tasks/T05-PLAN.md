# T05: 07-backend-services 05

**Slice:** S07 — **Milestone:** M001

## Description

Deliver SRV-04 webhook subscription and delivery engine with deterministic retries, ordering, authenticity, and dead-letter semantics.

Purpose: provide downstream integration hooks with contractual reliability and signature verification behavior.
Output: webhook CRUD + delivery workers + regression suites for ordering/retry/signature-rotation invariants.

## Must-Haves

- [ ] Webhook fanout transport is locked to a Postgres outbox table drained by Redis-backed delivery workers (no direct queue pub/sub fanout path).
- [ ] Webhooks are at-least-once, ordered per entity key, signed with timestamped HMAC, retried with bounded exponential backoff, and dead-lettered on terminal failure.
- [ ] Secret rotation supports bounded dual-key grace verification without delivery interruption.
- [ ] Retention windows are contractual: webhook deliveries retained 90 days and webhook dead letters retained 180 days with deterministic purge behavior.

## Files

- `services/shared/src/db/schema.sql`
- `services/webhook/src/routes/subscriptions.ts`
- `services/webhook/src/routes/deliveries.ts`
- `services/webhook/src/jobs/delivery-worker.ts`
- `services/webhook/src/security/signature.ts`
- `services/webhook/src/store/webhook-repository.ts`
- `services/webhook/src/__tests__/delivery-ordering.test.ts`
- `services/webhook/src/__tests__/retry-dlq.test.ts`
- `services/webhook/src/__tests__/signature-rotation.test.ts`
