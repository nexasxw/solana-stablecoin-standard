# T04: 02-layer-1-core-program 04

**Slice:** S02 — **Milestone:** M001

## Description

Turn the Phase 2 contract into a verifiable deliverable through targeted Anchor integration tests.

Purpose: Replace the current TODO scaffolding with an authoritative automated suite that proves the Layer 1 contract actually works and fails correctly.
Output: Runnable Phase 2 integration tests, helper coverage for account setup, and any minimal repo plumbing needed for targeted execution.

## Must-Haves

- [ ] `tests/sss-1.ts` becomes the authoritative automated proof for Phase 2 happy-path and negative-path behavior.
- [ ] Test assertions cover PDA derivation, state persistence, mint authority wiring, pause behavior, quotas, and authorization failures.
- [ ] The repo has a runnable targeted validation entry point for the Layer 1 contract.

## Files

- `Anchor.toml`
- `tests/helpers/index.ts`
- `tests/sss-1.ts`
- `tests/integration.ts`
