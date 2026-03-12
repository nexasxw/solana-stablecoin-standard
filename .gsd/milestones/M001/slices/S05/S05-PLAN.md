# S05: Typescript Sdk

**Goal:** Establish the Phase 5 SDK contract foundation before instruction-specific implementation.
**Demo:** Establish the Phase 5 SDK contract foundation before instruction-specific implementation.

## Must-Haves


## Tasks

- [x] **T01: 05-typescript-sdk 01** `est:7min`
  - Establish the Phase 5 SDK contract foundation before instruction-specific implementation.

Purpose: Lock API primitives and initialization/load behavior that all later SDK operations depend on.
Output: Typed create/load, typed errors, and shared tx-result contract with regression coverage.
- [x] **T02: 05-typescript-sdk 02** `est:4min`
  - Implement the full typed lifecycle API surface on top of the Phase 5 foundation.

Purpose: Satisfy SDK-02 while preserving the explicit signer and bigint contracts locked in phase context.
Output: Runtime lifecycle methods and regression tests aligned to Layer 1 instruction behavior.
- [x] **T03: 05-typescript-sdk 03** `est:12min`
  - Deliver SSS-2 compliance helper APIs with explicit operator and account contracts.

Purpose: Satisfy SDK-03 with robust preflight validation and typed behavior consistent with the rest of the SDK.
Output: Hardened compliance module and regression tests for blacklist/seize workflows.

## Files Likely Touched

- `sdk/core/src/stablecoin.ts`
- `sdk/core/src/types.ts`
- `sdk/core/src/index.ts`
- `sdk/core/src/errors.ts`
- `sdk/core/src/client.ts`
- `sdk/core/tests/stablecoin.create.test.ts`
- `sdk/core/src/stablecoin.ts`
- `sdk/core/src/types.ts`
- `sdk/core/src/errors.ts`
- `sdk/core/tests/stablecoin.lifecycle.test.ts`
- `sdk/core/tests/stablecoin.create.test.ts`
- `sdk/core/src/compliance.ts`
- `sdk/core/src/errors.ts`
- `sdk/core/src/types.ts`
- `sdk/core/src/index.ts`
- `sdk/core/tests/compliance.test.ts`
