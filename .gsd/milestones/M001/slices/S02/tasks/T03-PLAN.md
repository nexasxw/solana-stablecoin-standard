# T03: 02-layer-1-core-program 03

**Slice:** S02 — **Milestone:** M001

## Description

Harden lifecycle and admin behavior around the finalized Phase 2 contract surface.

Purpose: Turn the existing brownfield instruction scaffolding into a stable, explicit, and testable Layer 1 lifecycle contract.
Output: Corrected lifecycle handlers, admin flows, and error surfaces across the shared core behavior.

## Must-Haves

- [ ] Authorized lifecycle instructions succeed against the finalized initialization and account model.
- [ ] Unauthorized, paused, quota-breaching, and otherwise invalid calls fail through explicit and testable Anchor errors.
- [ ] Authority transfer and admin updates no longer rely on the old mutable-authority PDA assumption.

## Files

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
