# Phase 11: Docker Packaging - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Package the existing backend stack behind a single reviewer-friendly Docker entry point that satisfies OPS-01/02/03. This phase defines startup contracts, profile behavior, and reviewer documentation for Docker usage. It does not add new backend service capabilities.

</domain>

<decisions>
## Implementation Decisions

### Entrypoint Contract
- Canonical reviewer entrypoint is Docker Compose directly, not wrapper scripts or Make targets.
- Canonical start flow uses detached mode (`docker compose up -d` and `docker compose --profile sss2 up -d`).
- Startup success requires both `docker compose ps` service-up verification and deterministic health endpoint checks.
- If any required service fails health checks, the flow is fail-fast with diagnostics (logs/health evidence) before proceeding.

### Service Matrix And Profiles
- Default profile includes the current core set: `mint-burn`, `indexer`, `webhook`, `postgres`, and `redis`.
- SSS-2-specific behavior is enabled via the existing `sss2` Compose profile to include `compliance`.
- Startup should keep strict readiness gating for deterministic dependency ordering.
- Host ports are fixed and explicitly documented as part of reviewer contract behavior.

### Image And Runtime Policy
- Packaging prioritizes reviewer reproducibility over local hot-reload development ergonomics.
- Canonical env contract is a versioned example env file (`.env.example`) copied/filled by reviewers.
- Canonical image acquisition path is local build from repository source via Compose.
- Data volumes are preserved by default across reruns; clean-state rerun uses an explicit documented reset command (`docker compose down -v`).

### Claude's Discretion
- Exact naming and placement of Docker documentation sections as long as the contracts above are explicit.
- Final wording of reviewer troubleshooting steps and diagnostics output examples.
- Exact command sequencing for build/start/check blocks as long as deterministic pass/fail criteria remain intact.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docker-compose.yml`: existing baseline service graph already includes default stack and `sss2` profile.
- `docs/OPERATIONS.md`: existing compose command contract and reviewer command-to-artifact mapping style.
- `README.md`: existing quickstart and compose commands to align as top-level reviewer entrypoint.
- Service packages under `services/*`: existing build contexts and runtime ports/environment patterns.

### Established Patterns
- Deterministic command contracts are preferred across prior phases.
- Reviewer docs use command-to-artifact and explicit pass/fail criteria.
- Profile-based SSS-2 enablement already exists and should remain canonical.

### Integration Points
- Phase 11 packaging must align with existing service runtime expectations in `services/mint-burn`, `services/indexer`, `services/compliance`, and `services/webhook`.
- Docker docs should integrate with existing operations/reviewer evidence docs without duplicating conflicting contracts.
- Compose startup/check commands should map cleanly to OPS requirements traceability.

</code_context>

<specifics>
## Specific Ideas

- Keep the reviewer path as one predictable compose-first flow with explicit default and SSS-2 variants.
- Treat health checks as required completion gates, not optional smoke checks.
- Keep reset behavior explicit and intentional to avoid destructive defaults.

</specifics>

<deferred>
## Deferred Ideas

- Wrapper CLI/Make UX for stack control beyond Compose-native entrypoints.
- Registry-published prebuilt reviewer images as an optional future optimization.

</deferred>

---

*Phase: 11-docker-packaging*
*Context gathered: 2026-03-13*
