# T03: 07-backend-services 03

**Slice:** S07 — **Milestone:** M001

## Description

Deliver SRV-03 compliance decisioning, mutation orchestration, and audit export capabilities.

Purpose: lock deterministic compliance outcomes and evidence surfaces needed by operations and later E2E proof.
Output: compliance APIs/jobs/audit exports with stable reason-code and identity-chain behavior.

## Must-Haves

- [ ] Compliance screening returns only `allow|deny|review_required` with stable reason codes and blocks mutation on unresolved review outcomes.
- [ ] On-chain blacklist state remains canonical enforcement source; compliance caches/indexes are derived and reconcilable.
- [ ] Compliance mutation jobs and audit export jobs use shared async lifecycle contracts and preserve full request identity chain.
- [ ] Compliance audit export artifacts follow locked retention contract (30 days) with deterministic purge behavior.

## Files

- `services/shared/src/db/schema.sql`
- `services/compliance/src/index.ts`
- `services/compliance/src/routes/screening.ts`
- `services/compliance/src/routes/compliance-jobs.ts`
- `services/compliance/src/routes/audit.ts`
- `services/compliance/src/jobs/compliance-worker.ts`
- `services/compliance/src/jobs/audit-export-worker.ts`
- `services/compliance/src/store/compliance-repository.ts`
- `services/compliance/src/__tests__/compliance.integration.test.ts`
