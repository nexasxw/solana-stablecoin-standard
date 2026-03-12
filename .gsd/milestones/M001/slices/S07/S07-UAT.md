# S07: Backend Services — UAT

**Milestone:** M001
**Written:** 2026-03-12

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S07 delivers backend contract/persistence/runtime invariants that are best validated through deterministic automated integration and service regression evidence rather than interactive UI behavior.

## Preconditions

- Repository dependencies installed (`yarn install`).
- TypeScript workspace builds cleanly.
- Local test environment can execute mocha/ts-node and Anchor test harness.

## Smoke Test

Run `yarn build` from repo root and verify all service/shared workspaces compile without TypeScript errors.

## Test Cases

### 1. Cross-service request_id continuity

1. Run `yarn test:integration`.
2. Execute the Phase 7 integration test in `tests/integration.ts`.
3. **Expected:** one passing test proving deterministic request_id continuity from issuance command through indexer projection to webhook delivery evidence.

### 2. Issuance deterministic admission and worker lifecycle

1. Run `yarn workspace @stbr/sss-mint-burn test`.
2. Validate API tests for idempotency replay/conflict and issuer-only auth.
3. Validate worker tests for queued→running→terminal transitions and error recording.
4. **Expected:** all tests pass with stable envelope/error behavior and normalized event emission.

### 3. Compliance screening, gating, and audit export lifecycle

1. Run `yarn workspace @stbr/sss-compliance test`.
2. Validate screening decision contracts and reason-code determinism.
3. Validate review-required gating, override behavior, and export retention lifecycle tests.
4. **Expected:** all tests pass with deterministic `allow|deny|review_required` outcomes and stable audit export transitions.

### 4. Webhook ordering/retry/DLQ/signature rotation contracts

1. Run `yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'`.
2. Validate per-entity ordering invariants.
3. Validate bounded exponential retry to DLQ and retention purge behavior.
4. Validate dual-key HMAC rotation and timestamp tolerance rejection.
5. **Expected:** all tests pass with deterministic ordering and authenticity semantics.

## Edge Cases

### Idempotency payload conflict under same tenant/key

1. Submit same `(tenant_id, idempotency_key)` with different payload fingerprint.
2. **Expected:** deterministic conflict response (not replay success), with stable error envelope and preserved original record.

### Equal-timestamp webhook deliveries for same entity

1. Enqueue multiple same-entity deliveries at identical timestamps.
2. **Expected:** deterministic processing order remains stable via enqueue-sequence tie-break; no reordering drift.

## Failure Signals

- Build failures in shared/service packages.
- Missing or unstable envelope fields (`success`, `data|error`, `code`, `request_id`, `timestamp`).
- Non-deterministic lifecycle transitions (skips, illegal state regressions, or hidden terminal failures).
- Webhook retries that never reach terminal DLQ state or violate per-entity order.
- Compliance mutations executing while screening remains `review_required` without recorded override.

## Requirements Proved By This UAT

- SRV-01 — issuance API/worker deterministic lifecycle, auth, and idempotency behavior.
- SRV-02 — finalized-only ingestion and deterministic off-chain projection behavior.
- SRV-03 — compliance screening/mutation/audit export contracts with deterministic reason-codes and retention.
- SRV-04 — webhook subscription/delivery reliability with ordering, retries, DLQ, and signature rotation.
- TST-01 — integrated backend/unit coverage for critical S07 service boundaries.

## Not Proven By This UAT

- OPS-01/OPS-02/OPS-03 Docker startup and packaging flows (covered in later slices).
- DEP-01/DEP-02/DEP-03 devnet deployment/proof behavior.
- Trident fuzz coverage objectives (TST-02) and broader non-service feature regressions.

## Notes for Tester

- `yarn test:integration` may print transient websocket errors before successful test completion under Anchor harness; treat pass/fail status and assertions as source of truth.
- Node module-type warnings are currently non-blocking and known; they do not invalidate deterministic contract assertions.
