# Phase 10: Devnet Proof - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy required SSS programs to Solana Devnet and capture reviewer-verifiable proof of representative SSS-1 and SSS-2 transaction flows. This phase locks deployment/proof evidence contracts for DEP-01, DEP-02, and DEP-03. It does not add new protocol features.

</domain>

<decisions>
## Implementation Decisions

### Representative Flow Scope (DEP-02)
- Keep current Phase 08 lane depth as the minimum representative flow baseline.
- Require one deterministic negative-path transaction per lane in addition to successful operations.
- Use authority-default signer behavior with optional role-specific signer overrides (current script model).
- Stress lane is optional bonus evidence for this phase, not a completion gate.

### Program Deployment Identity (DEP-01)
- Record deployed devnet IDs for all three programs: `sss_1`, `sss_2`, and `sss_transfer_hook`.
- Canonical program IDs must be published in both `Anchor.toml` (`[programs.devnet]`) and a reviewer-facing docs table.
- Redeploys are allowed during execution, but one final canonical ID set must be published with timestamped evidence.
- Evidence must include authority snapshots for each published program ID.

### Reviewer Evidence Contract (DEP-03)
- Use new Phase 10 artifact paths under `artifacts/devnet/phase-10/...` (do not repurpose Phase 08 directories).
- Require Solana Explorer links for every recorded transaction signature and every canonical program ID.
- Each run must publish both a human-readable markdown summary and a machine-readable JSON manifest.
- Canonical proof publication uses a dedicated Phase 10 evidence document plus immutable artifact references.

### Rerun Acceptance Policy
- Reviewer acceptance requires at least two successful full proof runs with distinct `RUN_ID` values.
- Required runs must use fresh mints and produce unique run artifacts.
- Any failed lane invalidates that run; only full-pass runs count.
- Accepted proof evidence must be fresh: generated within 24 hours of final submission handoff.

### Claude's Discretion
- Exact file names for the Phase 10 markdown summary/JSON manifest outputs.
- Exact evidence doc path and table/section layout, as long as canonical publication rules above are met.
- Optional inclusion of stress-lane evidence in the final reviewer package.

</decisions>

<specifics>
## Specific Ideas

- Keep the proven deterministic Phase 08 proof style as the behavioral floor, then extend it for explicit deployment identity publication.
- Evidence should be reviewer-first: command trace + signatures + explorer links + authority snapshots, all cross-checkable.
- Maintain strict non-destructive run behavior with unique `RUN_ID` and immutable artifact outputs.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/devnet/phase-08-sss1-proof.sh`: deterministic SSS-1 proof lane with command logs, signatures CSV, and state snapshots.
- `scripts/devnet/phase-08-sss2-proof.sh`: deterministic SSS-2 proof lane with compliance evidence (`blacklist-check`) and signature capture.
- `scripts/devnet/phase-08-stress.sh`: bounded retry orchestration that can remain optional supporting evidence.
- `scripts/devnet/README.md`: existing command-to-artifact contract language that can be adapted for Phase 10 publication.
- `docs/testing/phase-08-devnet-evidence.md`: existing reviewer evidence format baseline for deterministic proof artifacts.

### Established Patterns
- Proof scripts enforce mandatory `RUN_ID` and fail when artifact directories already exist.
- Mutating operations are captured in `signatures.csv` with stable `operation,signature` format.
- Summaries and run metadata are emitted as explicit files per run (`summary.md`, `run-metadata.env`).
- Prior docs work uses command-to-artifact mapping tables as reviewer verification contracts.

### Integration Points
- `Anchor.toml` `[programs.devnet]` is the canonical configuration source for deployed program IDs.
- `scripts/sss-token` is the standard CLI execution surface used by proof scripts.
- Phase 10 evidence docs must align with existing docs/testing conventions and traceability mapping.
- Artifact conventions established in Phase 08 provide direct scaffolding for Phase 10 paths and manifests.

</code_context>

<deferred>
## Deferred Ideas

- Making stress lane mandatory remains deferred; for Phase 10 it is optional evidence.

</deferred>

---

*Phase: 10-devnet-proof*
*Context gathered: 2026-03-13*
