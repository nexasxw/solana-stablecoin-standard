# Phase 7: Backend Services - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the backend service layer for issuance lifecycle, indexing, compliance workflows, and downstream webhook delivery on top of the completed SDK and CLI contracts. This phase defines service behavior and integration contracts for mint/burn, indexer, compliance, and webhook flows; it does not add new product capabilities outside SRV-01 through SRV-04.

</domain>

<decisions>
## Implementation Decisions

### Service Contract
- Use async job-oriented mutations as the primary interaction model for mint/burn and compliance actions.
- Standardize one canonical response envelope across all services (success/data/error, code, request_id, timestamp).
- Use shared job lifecycle states across services: `queued`, `running`, `succeeded`, `failed`, `canceled`.
- Treat machine-readable error codes as stable API contract; message text is non-contractual.

### Webhook Semantics
- Deliver webhooks with at-least-once guarantees.
- Use bounded exponential backoff retries with capped attempts and dead-letter terminal state.
- Require HMAC payload signatures (with timestamp) for authenticity/replay protection.
- Preserve ordering per entity key (stablecoin/mint scoped), not global ordering.

### Auth Boundaries
- Require signed operator intent for operator-triggered mutating requests.
- Use service identity auth for internal service-to-service calls (mTLS or short-lived JWT identity).
- Scope authorization per stablecoin/mint to prevent cross-issuer privilege bleed.
- Require end-to-end audit identity chain: requester, approving authority, and executing service identity.

### Event/Data Consistency
- Treat finalized on-chain events as source of truth for persistent service state.
- Require idempotency keys on mutating APIs with deterministic replay behavior.
- Implement periodic reconciliation/backfill to repair stream gaps or temporary RPC misses.
- Version all event envelopes explicitly (`event_version`) and keep Phase 7 changes backward-compatible/additive.

### Claude's Discretion
- Exact endpoint paths/route naming and package-level folder structure.
- Concrete polling/subscription interface shape for job status checks.
- Internal retry timing constants and dead-letter persistence model.
- Observability implementation details (metric names, logger fields) as long as identity and contract decisions above are preserved.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sdk/core/src/stablecoin.ts`: canonical lifecycle/admin/compliance call surface to invoke from services.
- `sdk/core/src/errors.ts`: existing stable error code taxonomy to map into service envelopes.
- `sdk/core/src/cli.ts` and CLI wrappers: reference contract for deterministic output/error behavior.
- `services/*/package.json` scaffolds: existing TypeScript build/dev/lint structure for each service package.

### Established Patterns
- Deterministic contracts are preferred over implicit runtime behavior (from Phases 5-6).
- Role/signature explicitness is required for privileged actions.
- Existing service packages are currently thin scaffolds (`src/index.ts` placeholders), so Phase 7 should establish shared service conventions.

### Integration Points
- Mint/burn and compliance services should orchestrate through SDK APIs, not duplicate chain logic.
- Indexer outputs should feed compliance/audit and webhook event publishing surfaces.
- Webhook service should subscribe to normalized internal event envelopes emitted by indexer/compliance/issuance flows.
- Phase 7 outputs must preserve compatibility with existing CLI and future docs/devnet proof phases.

</code_context>

<specifics>
## Specific Ideas

- Keep service APIs automation-first with stable envelopes and error codes.
- Preserve strong operator attribution in every mutating flow for auditability.
- Maintain contract consistency across all four services to reduce integration overhead.

</specifics>

<deferred>
## Deferred Ideas

- Consumer-facing dashboard/operator GUI for service orchestration.
- Advanced cross-tenant analytics/reporting beyond Phase 7 service contracts.

</deferred>

---

*Phase: 07-backend-services*
*Context gathered: 2026-03-11*
