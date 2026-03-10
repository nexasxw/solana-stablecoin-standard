---
phase: 05-typescript-sdk
plan: 01
subsystem: api
tags: [typescript, sdk, anchor, solana, idl]
requires:
  - phase: 04-preset-configurations
    provides: strict config parsing and precedence semantics
provides:
  - Canonical SDK transaction result envelope and typed error codes
  - IDL-driven SSS-1/SSS-2 client resolution for create/load flows
  - Deterministic create/load regression coverage with stable preflight error assertions
affects: [06-cli-tooling, 07-services-integration, sdk-consumers]
tech-stack:
  added: []
  patterns:
    - IDL-based program client factory with variant-first resolution
    - Machine-readable SDK error taxonomy for preflight and unsupported operations
key-files:
  created:
    - sdk/core/src/errors.ts
    - sdk/core/src/client.ts
  modified:
    - sdk/core/src/types.ts
    - sdk/core/src/index.ts
    - sdk/core/src/stablecoin.ts
    - sdk/core/tests/stablecoin.create.test.ts
key-decisions:
  - "Expose initialization transaction metadata via SolanaStablecoin.initialization while preserving create() call shape."
  - "Keep load() deterministic by requiring explicit variant hints (variant/isSSS2/extensions) instead of implicit network probing."
patterns-established:
  - "Typed SDK errors always carry stable code values for caller branching."
  - "Compliance surface is derived from resolved variant and is null for SSS-1."
requirements-completed: [SDK-01, SDK-02, SDK-03]
duration: 7min
completed: 2026-03-10
---

# Phase 5 Plan 1: SDK Contract Foundation Summary

**Type-safe SDK foundation now exposes deterministic SSS-1/SSS-2 create/load behavior with initialization metadata and stable machine-readable error contracts.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-10T13:16:00Z
- **Completed:** 2026-03-10T13:23:15Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added canonical SDK transaction result contracts (`SdkTxResult`) and shared typed error classes with stable error codes.
- Replaced placeholder create/load wiring with IDL-driven client resolution and deterministic variant selection.
- Expanded regression tests for create/load return shape, variant precedence, and validation-code stability.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define canonical SDK result and error contracts** - `18b1042` (feat)
2. **Task 2: Implement typed client resolution and create/load contracts** - `4ddb6c5` (feat)
3. **Task 3: Add initialization/load regression coverage** - `a03cb68` (test)

**Plan metadata:** `PENDING` (docs: complete plan)

## Files Created/Modified
- `sdk/core/src/errors.ts` - Adds `SdkErrorCode` and typed SDK error classes.
- `sdk/core/src/client.ts` - Adds IDL-based client factory and deterministic load variant resolution helpers.
- `sdk/core/src/types.ts` - Adds tx result and confirmation metadata contracts.
- `sdk/core/src/index.ts` - Exports SDK error contracts on public surface.
- `sdk/core/src/stablecoin.ts` - Implements typed create/load flows with variant-driven compliance gating.
- `sdk/core/tests/stablecoin.create.test.ts` - Adds deterministic create/load and error-code regression tests.

## Decisions Made
- Kept `create()` return ergonomics unchanged (`SolanaStablecoin` instance) and surfaced initialization metadata via `stablecoin.initialization`.
- Implemented `load()` variant resolution precedence as: `variant` > `isSSS2` > paired `extensions` hints.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript `override` compatibility for error `cause`**
- **Found during:** Task 2 (typed client resolution and create/load contracts)
- **Issue:** `yarn test:sdk` failed with TS4113 because `Error` base typing in this toolchain does not declare `cause` with override support.
- **Fix:** Removed the `override` modifier from `StablecoinSdkError.cause`.
- **Files modified:** `sdk/core/src/errors.ts`
- **Verification:** `yarn test:sdk`
- **Committed in:** `4ddb6c5` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for compilation; no scope creep.

## Issues Encountered
- Placeholder create/load implementation had no typed program client boundary; resolved by introducing `sdk/core/src/client.ts` and moving variant resolution there.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SDK has stable create/load contracts and shared error/result primitives for lifecycle and compliance expansion in later plans.
- No blockers identified for continuing Phase 5 plan sequence.

---
*Phase: 05-typescript-sdk*
*Completed: 2026-03-10*

## Self-Check: PASSED

- FOUND: `.planning/phases/05-typescript-sdk/05-01-SUMMARY.md`
- FOUND: `18b1042`
- FOUND: `4ddb6c5`
- FOUND: `a03cb68`
