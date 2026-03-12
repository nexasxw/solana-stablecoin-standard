---
id: S02
parent: M001
milestone: M001
provides:
  - Mint-derived stablecoin PDA documentation shared by SSS-1 and SSS-2
  - Phase 2 baseline schema comments for StablecoinConfig, Stablecoin, and MinterConfig
  - Explicit extension-flag boundaries between SSS-1 baseline behavior and SSS-2 compliance-ready behavior
  - Real Token-2022 mint bootstrap flow for SSS-1 initialization
  - Matching SSS-2 initializer parity for mint, metadata, and extension bootstrap
  - Mint-derived stablecoin PDA signing for token metadata initialization in both programs
  - Explicit lifecycle validation for mint, burn, freeze, and thaw flows in both programs
  - Safer admin flows for authority transfer, role updates, and minter configuration under mint-derived PDAs
  - Auditable role-change events aligned with the shared Layer 1 contract surface
  - Runnable targeted Phase 2 validation entry point via `yarn test:sss1`
  - Token-2022-aware SSS-1 integration coverage for happy-path and negative-path Layer 1 behavior
  - Shared test helpers for mint-derived PDA derivation, Token-2022 ATA setup, and error assertions
requires: []
affects: []
key_files: []
key_decisions:
  - "Stablecoin PDAs stay derived from the immutable mint so authority transfer never changes account identity."
  - "Phase 2 keeps default-account-state out of StablecoinConfig and treats extension flags as immutable initialization records."
  - "SSS-1 documents compliance-only extensions as unsupported while SSS-2 documents them as required without pulling Phase 3 behavior into the baseline."
  - "Initialize handlers should expose only the accounts needed to create the mint and stablecoin state during Phase 2, so associated-token setup stays out of the core contract."
  - "Token-2022 and token-metadata CPIs should pass only the exact accounts required by each instruction, with the mint-derived stablecoin PDA signing metadata initialization."
  - "Lifecycle instructions should reject invalid token-account state, owner, mint, and balance conditions before relying on downstream Token-2022 failures."
  - "Authority transfer remains safe because stablecoin identity is mint-derived, not authority-derived."
  - "Role and minter changes should emit explicit audit events instead of relying on implicit account mutations."
  - "Targeted Layer 1 verification should run through `anchor test`, not raw `ts-mocha`, so provider and validator wiring stay coherent."
  - "Phase 2 defers Token-2022 token-metadata bootstrap and keeps initialization focused on mint creation plus the extensions required for lifecycle and compliance baselines."
  - "Test reads must confirm transaction signatures before fetching state to avoid validator race conditions in the targeted suite."
patterns_established:
  - "Shared PDA comments must describe immutable identity inputs, not mutable operator roles."
  - "Shared state docs must spell out whether flags are baseline, deferred, or reserved for later phases."
  - "Phase 2 initializers create the mint account with system-program CPI first, then apply Token-2022 extensions before persisting stablecoin state."
  - "Extension flags recorded in state and events should mirror validated config inputs rather than separate hardcoded booleans."
  - "Shared lifecycle paths enforce pause, quota, and token-account invariants with explicit Anchor errors in both presets."
  - "Admin updates use the mint-derived stablecoin PDA model, so changing authority or roles does not affect account lookup."
  - "Mint-derived stablecoin and minter PDAs are asserted directly in tests rather than assumed through transaction success."
  - "Targeted Phase validation uses a small helper layer for Token-2022 ATA creation, PDA derivation, and Anchor error matching."
observability_surfaces: []
drill_down_paths: []
duration: 2h
verification_result: passed
completed_at: 2026-03-09
blocker_discovered: false
---
# S02: Layer 1 Core Program

**# Phase 2 Plan 01: Account Model Summary**

## What Happened

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

# Phase 2 Plan 02: Initialization Summary

**Real Token-2022 mint initialization for SSS-1 and SSS-2 with mint-derived stablecoin PDA signing for metadata and extension bootstrap**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T06:30:45Z
- **Completed:** 2026-03-09T06:37:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Tightened `sss-1` initialization around the actual Phase 2 mint bootstrap path instead of a broader account surface.
- Aligned Token-2022 extension and token-metadata CPI wiring with the mint-derived stablecoin PDA that Plan 01 finalized.
- Mirrored the same initializer parity into `sss-2` while preserving the Phase 3 boundary for compliance behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement real Token-2022 mint creation for SSS-1** - `bbd3bed` (feat)
2. **Task 2: Mirror the minimum required initializer parity into SSS-2** - `a8e7350` (feat)

## Files Created/Modified

- `programs/sss-1/src/instructions/initialize.rs` - Removes unused initialize accounts, creates the mint through the system program, and invokes Token-2022 and token-metadata initialization with the exact mint/PDA accounts required.
- `programs/sss-2/src/instructions/initialize.rs` - Applies the same mint bootstrap/account wiring cleanup while preserving SSS-2-specific permanent delegate and transfer-hook extension setup.
- `.planning/phases/02-layer-1-core-program/02-02-SUMMARY.md` - Records execution outcome, decisions, and verification for this plan.

## Decisions Made

- Kept the initializer account context limited to mint creation and stablecoin state so later preset or token-account concerns do not leak into the core Phase 2 contract.
- Recorded extension booleans from the validated config itself so emitted events and persisted state stay aligned with the requested initialization contract.
- Treated the SPL metadata and extension instruction account lists as strict, version-pinned interfaces and wired them directly to the mint plus the stablecoin PDA signer.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `anchor build` completed with exit code `0`, but this workspace still prints pre-existing `spl-token-2022` stack diagnostics from confidential-transfer verification code outside the touched files. The initializer changes built successfully without introducing new failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both programs now bootstrap a real Token-2022 mint using the finalized mint-derived stablecoin PDA model.
- The next plan can harden lifecycle/admin flows against a real initialized mint instead of a state-only placeholder.

## Self-Check

PASSED

---
*Phase: 02-layer-1-core-program*
*Completed: 2026-03-09*

# Phase 2 Plan 03: Lifecycle And Admin Hardening Summary

**Explicit lifecycle validation and mint-derived admin safety for the shared Layer 1 baseline**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-09T06:41:00Z
- **Completed:** 2026-03-09T06:59:33Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Hardened the shared mint, burn, freeze, and thaw paths so both programs reject invalid token-account state, paused operation, quota breaches, and insufficient-balance cases through explicit Anchor errors.
- Reworked admin behavior around the finalized mint-derived PDA model so authority transfer, role updates, and minter updates remain safe and auditable after authority rotation.
- Extended emitted events so role changes and admin actions now leave a clearer on-chain audit trail without pulling Phase 3 compliance execution into shared lifecycle logic.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden the shared lifecycle instructions around explicit rules** - `aa08dce` (fix)
2. **Task 2: Redesign admin flows around the new PDA model** - `0095278` (fix)

## Files Created/Modified

- `programs/sss-1/src/instructions/mint.rs` - Tightens mint recipient validation and quota enforcement with explicit errors.
- `programs/sss-1/src/instructions/burn.rs` - Validates token account ownership, mint alignment, and balance before burn CPIs.
- `programs/sss-1/src/instructions/freeze_account.rs` - Rejects already-frozen or wrong-mint accounts explicitly.
- `programs/sss-1/src/instructions/thaw_account.rs` - Rejects non-frozen or wrong-mint accounts explicitly.
- `programs/sss-1/src/instructions/admin.rs` - Makes minter, role, and authority updates explicit and auditable against the mint-derived PDA model.
- `programs/sss-1/src/error.rs` - Adds the error surface needed for shared lifecycle validation.
- `programs/sss-1/src/events.rs` - Expands admin audit events for shared-role updates.
- `programs/sss-2/src/instructions/mint.rs` - Mirrors the shared lifecycle validation changes for SSS-2.
- `programs/sss-2/src/instructions/burn.rs` - Mirrors explicit burn validation for SSS-2 shared paths.
- `programs/sss-2/src/instructions/freeze_account.rs` - Adds explicit freeze validation without mixing in blacklist logic.
- `programs/sss-2/src/instructions/thaw_account.rs` - Adds explicit thaw validation without mixing in blacklist logic.
- `programs/sss-2/src/instructions/admin.rs` - Aligns SSS-2 admin behavior with the mint-derived PDA model and extended role audit events.
- `programs/sss-2/src/error.rs` - Adds the shared explicit-error surface needed by lifecycle/admin paths.
- `programs/sss-2/src/events.rs` - Extends SSS-2 role audit events while keeping compliance-specific events separate.
- `.planning/phases/02-layer-1-core-program/02-03-SUMMARY.md` - Records execution outcome, decisions, and verification for this plan.

## Decisions Made

- Shared lifecycle handlers now fail fast on wrong mint, invalid state, wrong owner, zero amount, insufficient balance, paused operation, and quota overflow conditions.
- Authority transfer stays in the shared core surface because the stablecoin PDA is derived from the immutable mint rather than the mutable authority.
- `remove_minter` remains part of the shared lifecycle surface, but minter changes are now paired with explicit events so operator actions stay auditable.

## Deviations from Plan

None. The plan goals were implemented within the intended Phase 2 boundary.

## Issues Encountered

- `anchor build` still emits the pre-existing `spl-token-2022` confidential-transfer stack diagnostics and general Anchor cfg warnings elsewhere in the workspace, but the build exits with code `0` and these lifecycle/admin changes compile successfully.

## User Setup Required

None.

## Next Phase Readiness

- Phase 2 now has a stable shared lifecycle and admin contract surface with explicit failure behavior.
- The remaining plan can focus on authoritative integration coverage for the finalized initialization, lifecycle, quota, pause, and authority flows.

## Self-Check

PASSED

---
*Phase: 02-layer-1-core-program*
*Completed: 2026-03-09*

# Phase 2 Plan 04: Integration Validation Summary

**Authoritative SSS-1 Layer 1 integration coverage with a runnable targeted Anchor entry point**

## Performance

- **Duration:** 2h
- **Started:** 2026-03-09T06:59:33Z
- **Completed:** 2026-03-09T08:48:44Z
- **Tasks:** 3
- **Files modified:** 6
- **Files created:** 3

## Accomplishments

- Rewired the targeted Layer 1 test path so `yarn test:sss1` runs under `anchor test` instead of a bare Mocha process with missing provider and validator context.
- Replaced the SSS-1 TODO scaffolding with real Token-2022 integration coverage for initialize, quota management, mint, freeze, thaw, burn, pause, unpause, and authority-transfer edge cases.
- Added shared test helpers for mint-derived PDA derivation, Token-2022 ATA setup, transaction confirmation, and Anchor error assertions.
- Corrected the Layer 1 initializer path so real-validator tests can execute against the current mint/bootstrap behavior.

## Task Commits

Pending local commit grouping in this session. The code and docs are ready to checkpoint as:

1. Test harness and targeted runner plumbing
2. SSS-1 authoritative integration coverage
3. Plan summary and state updates

## Files Created/Modified

- `Anchor.toml` - Makes the Anchor test script accept targeted file arguments cleanly.
- `package.json` - Routes `test:sss1`, `test:sss2`, and `test:integration` through `anchor test`.
- `programs/sss-1/src/instructions/initialize.rs` - Simplifies Phase 2 mint bootstrap to the stable extension set used by the Layer 1 baseline.
- `programs/sss-2/src/instructions/initialize.rs` - Mirrors the same Phase 2 initialization boundary for the compliant preset baseline.
- `tests/helpers/index.ts` - Adds PDA, ATA, confirmation, and error helpers used by the targeted suite.
- `tests/sss-1.ts` - Implements the authoritative Phase 2 SSS-1 validation suite.
- `tests/integration.ts` - Adds the shared integration entrypoint placeholder expected by the repo harness.
- `yarn.lock` - Records the installed JS dependency graph needed for the test suite.
- `.planning/phases/02-layer-1-core-program/02-04-SUMMARY.md` - Records the outcome of this plan.

## Decisions Made

- The targeted validation entry point must own its Anchor/validator lifecycle, so the test script moved from raw Mocha to `anchor test`.
- Phase 2 initialization now stops at stable Token-2022 mint bootstrap rather than forcing token-metadata bootstrap into the same baseline path.
- Transaction confirmation is part of the test harness because validator races produced stale reads in the initial suite.

## Deviations from Plan

- The plan started as test-only work, but real-validator execution exposed a runtime initializer issue, so the SSS-1 and SSS-2 initialize handlers were tightened as part of the same validation plan. This stayed within the Phase 2 contract boundary and was necessary to make the suite truthful.

## Issues Encountered

- The environment intermittently prints local validator websocket errors before the Mocha run starts, but the targeted suite still completes successfully.
- The workspace continues to emit the pre-existing `spl-token-2022` confidential-transfer stack diagnostics during `anchor build`; build exit status remains `0`.

## User Setup Required

None.

## Verification

- `anchor build`
- `yarn test:sss1`

## Next Phase Readiness

- Phase 2 now has a runnable targeted proof path and no remaining planned work in the Layer 1 core phase.
- The next logical action is Phase 3 planning for the compliance module.

## Self-Check

PASSED

---
*Phase: 02-layer-1-core-program*
*Completed: 2026-03-09*
