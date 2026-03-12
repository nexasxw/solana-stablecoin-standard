---
id: S05
parent: M001
milestone: M001
provides:
  - Canonical SDK transaction result envelope and typed error codes
  - IDL-driven SSS-1/SSS-2 client resolution for create/load flows
  - Deterministic create/load regression coverage with stable preflight error assertions
  - Typed lifecycle/admin mutation APIs mapped to SSS-1/SSS-2 Anchor instructions
  - Deterministic bigint/u64 preflight validation with stable machine-readable SDK error codes
  - Lifecycle regression tests for signer requirements, tx envelope shape, and RPC error normalization
  - Typed SSS-2 compliance mutation result envelopes
  - Deterministic compliance preflight validation with stable local error codes
  - Regression coverage for blacklist/seize contracts and non-SSS-2 gating behavior
requires: []
affects: []
key_files: []
key_decisions:
  - "Expose initialization transaction metadata via SolanaStablecoin.initialization while preserving create() call shape."
  - "Keep load() deterministic by requiring explicit variant hints (variant/isSSS2/extensions) instead of implicit network probing."
  - "Keep role/admin APIs explicit-per-call by requiring signer arguments on every privileged mutation."
  - "Use local preflight error variants (`INVALID_ARGUMENT`, `INVALID_AMOUNT`, `MISSING_SIGNER`) so callers can branch before RPC."
  - "Kept SSS-1 compliance inaccessibility as null on SolanaStablecoin while enforcing explicit UnsupportedOperationError on disabled compliance module execution paths."
  - "Mapped compliance reason validation into a dedicated INVALID_REASON error code for branchable caller logic."
patterns_established:
  - "Typed SDK errors always carry stable code values for caller branching."
  - "Compliance surface is derived from resolved variant and is null for SSS-1."
  - "Lifecycle methods are IDL-driven wrappers, not manual instruction serialization."
  - "Role update APIs reject no-op requests locally for deterministic failure semantics."
  - "Compliance mutation methods now return { operation, signature, confirmation } metadata."
  - "blacklistAdd trims reasons and rejects empty input preflight before RPC."
observability_surfaces: []
drill_down_paths: []
duration: 12min
verification_result: passed
completed_at: 2026-03-10
blocker_discovered: false
---
# S05: Typescript Sdk

**# Phase 5 Plan 1: SDK Contract Foundation Summary**

## What Happened

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

# Phase 5 Plan 2: Lifecycle SDK Parity Summary

**SDK lifecycle/admin surface now mirrors on-chain SSS instructions with explicit signers, u64-safe bigint preflight checks, and typed transaction/error contracts.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T13:30:16Z
- **Completed:** 2026-03-10T13:34:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Implemented typed runtime methods for lifecycle mutations (`mint`, `burn`, `freeze`, `thaw`, `pause`, `unpause`) and admin operations (`updateMinter`, `removeMinter`, `transferAuthority`, `updateRoles`, `setTreasury`).
- Added deterministic local preflight guards for signer/public-key invariants and `bigint` amount boundaries (`0..u64::MAX`) with stable SDK error codes.
- Added lifecycle regression coverage validating signer enforcement, amount validation, tx-result envelope consistency, state/minter fetch helpers, and RPC error normalization.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement typed lifecycle mutation methods** - `5f22252` (feat)
2. **Task 2: Enforce bigint/u64 preflight and typed error normalization** - `12b813c` (fix)
3. **Task 3: Add lifecycle regression tests** - `71cca3c` (test)

**Plan metadata:** `PENDING` (docs: complete plan)

## Files Created/Modified
- `sdk/core/src/stablecoin.ts` - Adds full lifecycle/admin instruction wrappers, typed tx envelopes, and typed state/minter fetch helpers.
- `sdk/core/src/types.ts` - Adds lifecycle/admin option contracts and typed minter state shape.
- `sdk/core/src/errors.ts` - Adds stable preflight error codes and typed error variants.
- `sdk/core/tests/stablecoin.lifecycle.test.ts` - Adds deterministic SDK lifecycle regression coverage via mocked clients.
- `sdk/core/tests/stablecoin.create.test.ts` - Extends initialization envelope assertions.

## Decisions Made
- Required explicit signer parameters for each privileged mutation to avoid hidden authority assumptions in SDK call sites.
- Kept RPC-path normalization centralized in `executeMutation` so lifecycle methods share stable `RPC_ERROR` behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Account namespace typing blocked SDK compile after lifecycle fetch helpers**
- **Found during:** Task 1 (Implement typed lifecycle mutation methods)
- **Issue:** `Program<Idl>` account namespace typing did not expose `stablecoin` / `minterConfig`, causing `TS2339` failures in `yarn test:sdk`.
- **Fix:** Added localized account namespace casts in fetch helpers while preserving runtime behavior and typed return mapping.
- **Files modified:** `sdk/core/src/stablecoin.ts`
- **Verification:** `yarn test:sdk`
- **Committed in:** `5f22252` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for compile/test completion; no scope expansion.

## Issues Encountered
- Lifecycle regression tests initially failed strict mock typing for `Connection`; resolved by casting mock connection through `unknown` to satisfy strict structural checks while keeping deterministic test behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 5 lifecycle SDK API parity is implemented and contract-tested, enabling Plan 05-03 compliance hardening to focus on SSS-2 helper depth.
- No blockers identified for continuing Phase 5 execution.

---
*Phase: 05-typescript-sdk*
*Completed: 2026-03-10*

## Self-Check: PASSED

- FOUND: `.planning/phases/05-typescript-sdk/05-02-SUMMARY.md`
- FOUND: `5f22252`
- FOUND: `12b813c`
- FOUND: `71cca3c`

# Phase 5 Plan 3: Compliance Helper Contracts Summary

**SSS-2 compliance helpers now enforce explicit signer/account/reason contracts and return typed mutation metadata with stable machine-readable failures.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-10T13:28:17Z
- **Completed:** 2026-03-10T13:40:15Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Hardened compliance mutation API contracts to return typed operation-aware transaction metadata.
- Added deterministic compliance preflight validation, including non-empty trimmed reason checks and explicit signer/public key enforcement.
- Added regression tests covering blacklist/seize contracts, SSS-1 inaccessibility behavior, and stable error/result semantics.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden compliance module contracts and gating behavior** - `6c78f06` (feat)
2. **Task 2: Add preflight validation and stable compliance error codes** - `aca7356` (fix)
3. **Task 3: Add compliance-focused regression tests** - `0a05628` (test)

**Plan metadata:** `PENDING` (docs: complete plan)

## Files Created/Modified
- `sdk/core/src/compliance.ts` - Adds typed compliance tx results, explicit SSS-2 gating checks, preflight validation, and RPC error normalization.
- `sdk/core/src/errors.ts` - Adds stable `INVALID_REASON` taxonomy for caller-branchable compliance reason failures.
- `sdk/core/src/types.ts` - Adds shared `ComplianceMutationKind` and `ComplianceTxResult` types.
- `sdk/core/tests/compliance.test.ts` - Adds deterministic coverage for SDK-03 blacklist/seize contracts and failure semantics.
- `sdk/core/src/index.ts` - Aligns public package usage example with current typed mutation signatures.

## Decisions Made
- Kept `SolanaStablecoin.compliance` null for SSS-1 create/load paths to preserve the established inaccessibility contract.
- Added explicit unsupported-operation behavior within `ComplianceModule` when instantiated with `enabled: false`, so unsupported flows remain deterministic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Workspace had concurrent-wave baseline edits in `sdk/core/src/stablecoin.ts`; execution proceeded against that baseline as requested and verification remained green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SDK compliance APIs are now safe for CLI/service integration with explicit operator/error contracts.
- No blockers identified for continuing Phase 5 execution.

---
*Phase: 05-typescript-sdk*
*Completed: 2026-03-10*

## Self-Check: PASSED

- FOUND: `.planning/phases/05-typescript-sdk/05-03-SUMMARY.md`
- FOUND: `6c78f06`
- FOUND: `aca7356`
- FOUND: `0a05628`
