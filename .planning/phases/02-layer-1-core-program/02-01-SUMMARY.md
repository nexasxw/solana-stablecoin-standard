---
phase: 02-layer-1-core-program
plan: 01
subsystem: api
tags: [anchor, solana, token-2022, pda, state-schema]
requires:
  - phase: 01-monorepo-foundation
    provides: monorepo layout, Anchor workspace, and Phase 2 planning inputs
provides:
  - Mint-derived stablecoin PDA documentation shared by SSS-1 and SSS-2
  - Phase 2 baseline schema comments for StablecoinConfig, Stablecoin, and MinterConfig
  - Explicit extension-flag boundaries between SSS-1 baseline behavior and SSS-2 compliance-ready behavior
affects: [02-02, 02-03, 02-04, sdk, docs]
tech-stack:
  added: []
  patterns: [mint-addressed stablecoin PDA identity, stablecoin-addressed minter quotas, phase-scoped schema documentation]
key-files:
  created: [.planning/phases/02-layer-1-core-program/02-01-SUMMARY.md]
  modified:
    - programs/sss-1/src/constants.rs
    - programs/sss-1/src/state.rs
    - programs/sss-2/src/constants.rs
    - programs/sss-2/src/state.rs
key-decisions:
  - "Stablecoin PDAs stay derived from the immutable mint so authority transfer never changes account identity."
  - "Phase 2 keeps default-account-state out of StablecoinConfig and treats extension flags as immutable initialization records."
  - "SSS-1 documents compliance-only extensions as unsupported while SSS-2 documents them as required without pulling Phase 3 behavior into the baseline."
patterns-established:
  - "Shared PDA comments must describe immutable identity inputs, not mutable operator roles."
  - "Shared state docs must spell out whether flags are baseline, deferred, or reserved for later phases."
requirements-completed: [CORE-01]
duration: 2min
completed: 2026-03-09
---

# Phase 2 Plan 01: Account Model Summary

**Mint-addressed stablecoin PDAs and phase-scoped state schema docs for the shared Layer 1 baseline**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T06:28:51Z
- **Completed:** 2026-03-09T06:30:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Locked the shared PDA contract around `[stablecoin, mint]` so authority transfer cannot invalidate the stablecoin address.
- Clarified that minter quotas are derived from the stablecoin PDA rather than any mutable operator role.
- Made the Phase 2 schema boundary explicit by documenting deferred default-account-state behavior and preset-specific extension expectations in both programs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Redesign stablecoin and minter PDA addressing** - `7f63817` (feat)
2. **Task 2: Finalize the shared Phase 2 schema boundary** - `431bb66` (feat)

## Files Created/Modified

- `programs/sss-1/src/constants.rs` - Documents mint-derived stablecoin PDAs and stablecoin-derived minter quota PDAs for SSS-1.
- `programs/sss-1/src/state.rs` - Documents the Phase 2 SSS-1 baseline schema, deferred fields, and immutable extension expectations.
- `programs/sss-2/src/constants.rs` - Documents the same PDA contract for SSS-2 so shared seed semantics do not drift.
- `programs/sss-2/src/state.rs` - Documents the SSS-2 schema extension boundary without pulling Phase 3 behavior into the baseline.
- `.planning/phases/02-layer-1-core-program/02-01-SUMMARY.md` - Records execution outcome, decisions, and verification for this plan.

## Decisions Made

- Stablecoin identity is mint-based, not authority-based, because authority is intentionally transferable.
- Minter quota identity is stablecoin-based so quota records remain valid across role rotation.
- `default_account_frozen` stays out of the shared config until a later phase implements real Token-2022 default-account-state behavior.
- Extension booleans are documented as immutable initialization facts, with SSS-1 rejecting compliance-only flags and SSS-2 requiring them.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `git commit` for Task 2 initially failed because of a stale `.git/index.lock`. Removing the lock and retrying the commit resolved it without changing task scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 now has one explicit account model and schema boundary for initialization and lifecycle work.
- The next plan can implement real Token-2022 mint initialization against this documented contract surface.

## Self-Check

PASSED

---
*Phase: 02-layer-1-core-program*
*Completed: 2026-03-09*
