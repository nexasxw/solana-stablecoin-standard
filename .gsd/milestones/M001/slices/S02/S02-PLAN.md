# S02: Layer 1 Core Program

**Goal:** Lock the shared Layer 1 account model before deeper implementation work.
**Demo:** Lock the shared Layer 1 account model before deeper implementation work.

## Must-Haves


## Tasks

- [x] **T01: 02-layer-1-core-program 01** `est:2min`
  - Lock the shared Layer 1 account model before deeper implementation work.

Purpose: Remove the current PDA and schema ambiguity so initialization, lifecycle logic, and tests all build on a stable contract surface.
Output: Finalized state structs, seed constants, and schema comments for the shared core program baseline.
- [x] **T02: 02-layer-1-core-program 02** `est:7min`
  - Implement real Layer 1 initialization around the finalized Phase 2 schema.

Purpose: Make the shared contract usable by creating a real Token-2022 mint, assigning the right authorities, and persisting stable state that later flows can trust.
Output: Working `initialize` handlers, explicit initialization errors, and parity-safe entrypoint wiring in both programs.
- [x] **T03: 02-layer-1-core-program 03** `est:9min`
  - Harden lifecycle and admin behavior around the finalized Phase 2 contract surface.

Purpose: Turn the existing brownfield instruction scaffolding into a stable, explicit, and testable Layer 1 lifecycle contract.
Output: Corrected lifecycle handlers, admin flows, and error surfaces across the shared core behavior.
- [x] **T04: 02-layer-1-core-program 04** `est:2h`
  - Turn the Phase 2 contract into a verifiable deliverable through targeted Anchor integration tests.

Purpose: Replace the current TODO scaffolding with an authoritative automated suite that proves the Layer 1 contract actually works and fails correctly.
Output: Runnable Phase 2 integration tests, helper coverage for account setup, and any minimal repo plumbing needed for targeted execution.

## Files Likely Touched

- `programs/sss-1/src/constants.rs`
- `programs/sss-1/src/state.rs`
- `programs/sss-2/src/constants.rs`
- `programs/sss-2/src/state.rs`
- `programs/sss-1/src/instructions/initialize.rs`
- `programs/sss-1/src/lib.rs`
- `programs/sss-1/src/events.rs`
- `programs/sss-1/src/error.rs`
- `programs/sss-2/src/instructions/initialize.rs`
- `programs/sss-2/src/lib.rs`
- `programs/sss-2/src/events.rs`
- `programs/sss-2/src/error.rs`
- `programs/sss-1/src/instructions/mint.rs`
- `programs/sss-1/src/instructions/burn.rs`
- `programs/sss-1/src/instructions/freeze_account.rs`
- `programs/sss-1/src/instructions/thaw_account.rs`
- `programs/sss-1/src/instructions/admin.rs`
- `programs/sss-1/src/error.rs`
- `programs/sss-2/src/instructions/mint.rs`
- `programs/sss-2/src/instructions/burn.rs`
- `programs/sss-2/src/instructions/freeze_account.rs`
- `programs/sss-2/src/instructions/thaw_account.rs`
- `programs/sss-2/src/instructions/admin.rs`
- `programs/sss-2/src/error.rs`
- `Anchor.toml`
- `tests/helpers/index.ts`
- `tests/sss-1.ts`
- `tests/integration.ts`
