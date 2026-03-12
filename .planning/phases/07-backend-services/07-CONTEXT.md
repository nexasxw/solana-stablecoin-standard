# Phase 7: Backend Services - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the backend service layer for issuance lifecycle, indexing, compliance workflows, and downstream webhook delivery on top of the completed SDK and CLI contracts. This phase defines service behavior and integration contracts for mint/burn, indexer, compliance, and webhook flows; it does not add new product capabilities outside SRV-01 through SRV-04.

</domain>

<decisions>
## Implementation Decisions

### Cross-service contract baseline
- Use async job-oriented mutations as the primary interaction model for mint/burn and compliance actions.
- Standardize one canonical response envelope across all services (`success`, `data`, `error`, `code`, `request_id`, `timestamp`).
- Use shared job lifecycle states across services: `queued`, `running`, `succeeded`, `failed`, `canceled`.
- Treat machine-readable error codes as stable API contract; message text is non-contractual.
- Require idempotency keys on all mutating APIs with deterministic replay behavior.

### Issuance service behavior (SRV-01)
- Expose separate mint and burn job contracts (not one combined action endpoint).
- Allow mutating submissions from authenticated issuer systems only; each request must carry operator intent signature context.
- Reject invalid schema/auth/idempotency synchronously before queue admission.
- Expose both `GET job by id` and tenant-scoped recent job listing endpoints for operator workflows.

### Indexer behavior and read models (SRV-02)
- Make stablecoin-centric state the primary projection contract: supply, role changes, minter quotas, pause state, blacklist events, seizure events.
- Persist finalized on-chain events as authoritative state; lower-commitment reads are non-authoritative.
- Expose operator-triggered bounded backfill API plus scheduled reconciliation jobs for gap repair.
- Publish a versioned internal event stream plus deterministic query API for downstream consumers.

### Compliance service behavior (SRV-03)
- Expose synchronous screening decisions (`allow`, `deny`, `review_required`) with stable machine-readable reason codes.
- Treat on-chain blacklist state as canonical enforcement source; off-chain caches/indexes are derived.
- Support paged audit query APIs and async export jobs for large audit artifacts.
- On borderline screening outcomes, return `review_required` and block mutation until recorded operator override.

### Webhook behavior (SRV-04)
- Deliver webhooks with at-least-once guarantees.
- Preserve ordering per entity key (stablecoin/mint scoped), not global ordering.
- Count any 2xx response within timeout as delivery success; retry on timeout/non-2xx/network failure.
- Use bounded exponential backoff retries with capped attempts and dead-letter terminal state.
- Require HMAC payload signatures (with timestamp) for authenticity/replay protection.
- Support tenant-scoped subscriptions with event-type filters and status controls.
- Lock canonical payload envelope: `event_id`, `event_type`, `event_version`, `request_id`, `occurred_at`, and typed event body.
- Support webhook secret rotation with bounded dual-key grace window.

### Auth and tenancy boundaries
- Use service identity auth for internal service-to-service calls (mTLS or short-lived JWT identity).
- Scope authorization per stablecoin/mint tenant to prevent cross-issuer privilege bleed.
- Require end-to-end audit identity chain: requester, approving authority, and executing service identity.

### Event compatibility constraints
- Version all event envelopes explicitly (`event_version`) and keep Phase 7 changes backward-compatible/additive.
- Treat finalized chain state as source of truth for persistent off-chain state.

### Claude's Discretion
- Exact endpoint paths/route naming and package-level folder structure.
- Concrete field-level payload naming beyond locked envelope keys.
- Internal retry timing constants and dead-letter persistence model.
- Observability implementation details (metric names, logger fields) as long as identity and contract decisions above are preserved.
- Exact retention windows for projections, job history, and delivery logs.

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

- Keep service APIs automation-first with stable envelopes and deterministic error codes.
- Preserve strong operator attribution in every mutating flow for auditability.
- Make backfill/reconciliation explicit operational primitives instead of implicit recovery behavior.
- Keep webhook subscriptions tenant-owned with event filter controls rather than global fan-out defaults.

</specifics>

<deferred>
## Deferred Ideas

- Consumer-facing dashboard/operator GUI for service orchestration.
- Advanced cross-tenant analytics/reporting beyond Phase 7 service contracts.

</deferred>

---

*Phase: 07-backend-services*
*Context gathered: 2026-03-11*
