# T02: 05-typescript-sdk 02

**Slice:** S05 — **Milestone:** M001

## Description

Implement the full typed lifecycle API surface on top of the Phase 5 foundation.

Purpose: Satisfy SDK-02 while preserving the explicit signer and bigint contracts locked in phase context.
Output: Runtime lifecycle methods and regression tests aligned to Layer 1 instruction behavior.

## Must-Haves

- [ ] Lifecycle operations map directly to the on-chain instruction surface with explicit role signers and no hidden authority assumptions.
- [ ] Amount-bearing APIs use `bigint` as the canonical public contract with strict u64 preflight checks before RPC submission.
- [ ] Mutating lifecycle methods return the shared typed transaction result envelope and normalize local/RPC failures into stable SDK error codes.

## Files

- `sdk/core/src/stablecoin.ts`
- `sdk/core/src/types.ts`
- `sdk/core/src/errors.ts`
- `sdk/core/tests/stablecoin.lifecycle.test.ts`
- `sdk/core/tests/stablecoin.create.test.ts`
