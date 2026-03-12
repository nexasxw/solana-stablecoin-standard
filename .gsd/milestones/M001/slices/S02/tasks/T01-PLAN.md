# T01: 02-layer-1-core-program 01

**Slice:** S02 — **Milestone:** M001

## Description

Lock the shared Layer 1 account model before deeper implementation work.

Purpose: Remove the current PDA and schema ambiguity so initialization, lifecycle logic, and tests all build on a stable contract surface.
Output: Finalized state structs, seed constants, and schema comments for the shared core program baseline.

## Must-Haves

- [ ] Stablecoin and minter PDAs use a seed scheme that remains valid after authority transfer.
- [ ] Phase 2 defines one canonical shared account model for core lifecycle behavior without pulling Phase 3 compliance scope into the baseline.
- [ ] Stored config and state fields are explicit about which flags are supported now versus deferred.

## Files

- `programs/sss-1/src/constants.rs`
- `programs/sss-1/src/state.rs`
- `programs/sss-2/src/constants.rs`
- `programs/sss-2/src/state.rs`
