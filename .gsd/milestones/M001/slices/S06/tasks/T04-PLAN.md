# T04: 06-admin-cli 04

**Slice:** S06 — **Milestone:** M001

## Description

Close unresolved Phase 6 verification gaps by repairing the failing `tests/sss-2.ts` cases and re-running the required verification command chain.

Purpose: Convert Phase 6 from "implemented but unverified" to "verified complete" by eliminating false-negative test failures.
Output: Green `yarn test:sss2` and updated verification evidence for 06-admin-cli.

## Must-Haves

- [ ] The Phase 6 verification chain is green end-to-end, including `yarn test:sss2`, so CLI completion is proven without unresolved regressions.
- [ ] The three failing SSS-2 test cases are repaired with deterministic setup and no mutable-const runtime failures.
- [ ] Seizure precondition tests use valid Token-2022 mint/account setup so failures assert intended program errors (not setup artifacts like `Invalid Mint`).

## Files

- `tests/sss-2.ts`
- `tests/helpers/token2022.ts`
- `.planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md`
