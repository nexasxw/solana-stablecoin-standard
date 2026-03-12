# T04: 07-backend-services 04

**Slice:** S07 — **Milestone:** M001

## Description

Deliver SRV-01 issuance command path with shared auth/context/idempotency middleware and deterministic worker execution.

Purpose: make mint/burn backend mutation flows production-safe and replay-safe.
Output: issuance APIs, async workers, and deterministic SRV-01 regression tests.

## Must-Haves

- [ ] All mutating issuance requests enforce durable idempotency with deterministic replay and deterministic conflict on payload mismatch.
- [ ] Issuance exposes separate async mint and burn job contracts with lifecycle states `queued|running|succeeded|failed|canceled`.
- [ ] Request identity chain (requester, approver, executing service identity) is persisted on mutating job records.
- [ ] Issuer-only authorization is enforced and operator override/approval carries verifiable intent-signature context persisted with the job identity chain.

## Files

- `services/shared/src/db/schema.sql`
- `services/shared/src/middleware/request-context.ts`
- `services/shared/src/auth/service-auth.ts`
- `services/shared/src/middleware/idempotency.ts`
- `services/mint-burn/src/routes/issuance.ts`
- `services/mint-burn/src/jobs/issuance-worker.ts`
- `services/mint-burn/src/store/issuance-repository.ts`
- `services/mint-burn/src/__tests__/issuance.api.test.ts`
- `services/mint-burn/src/__tests__/issuance.worker.test.ts`
