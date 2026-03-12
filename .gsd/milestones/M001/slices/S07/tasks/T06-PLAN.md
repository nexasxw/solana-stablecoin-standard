# T06: 07-backend-services 06

**Slice:** S07 — **Milestone:** M001

## Description

Finalize Phase 7 with cross-service E2E evidence and integration-hardening regression tests.

Purpose: prove SRV-01..04 work together as one deterministic backend workflow.
Output: authoritative integration trace plus targeted hardening tests for boundary contracts.

## Must-Haves

- [ ] End-to-end request trace continuity (`request_id`) from command request through projection and webhook attempt evidence is required for Phase 7 signoff.
- [ ] Cross-service regressions must prove locked envelope/job/error contracts remain consistent at integration boundaries.
- [ ] Retention purge behavior used by compliance exports and webhook evidence remains deterministic under integration execution.

## Files

- `tests/integration.ts`
- `services/compliance/src/__tests__/screening.test.ts`
- `services/compliance/src/__tests__/audit-export.test.ts`
- `services/webhook/src/index.ts`
- `services/shared/src/db/schema.sql`
