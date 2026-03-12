# T05: 06-admin-cli 05

**Slice:** S06 — **Milestone:** M001

## Description

Close remaining Phase 6 verification gaps by fixing three failing `yarn test:sss2` cases and re-establishing end-to-end verification proof.

Purpose: Remove deterministic test regressions that currently block phase closeout.
Output: Green SSS-2 test suite and updated verification report with no unresolved Phase 6 gaps.

## Must-Haves

- [ ] `yarn test:sss2` is green with no constant-reassignment runtime failures in `tests/sss-2.ts`.
- [ ] Seizure precondition setup builds valid Token-2022 mint/account state, so assertions exercise intended program errors (not setup artifacts like `Invalid Mint`).
- [ ] Phase 6 verification evidence is refreshed after fixes, preserving requirement traceability across `CLI-01`, `CLI-02`, and `CLI-03`.

## Files

- `tests/sss-2.ts`
- `tests/helpers/index.ts`
- `.planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md`
