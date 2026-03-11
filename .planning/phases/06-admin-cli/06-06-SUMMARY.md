---
phase: 06-admin-cli
plan: 06
subsystem: api
tags: [cli, sdk, operator-workflow, documentation, verification]
requires:
  - phase: 06-admin-cli
    provides: prior CLI command surface, runtime precedence, and lifecycle/compliance tests
provides:
  - deterministic repo-level CLI invocation wrapper
  - idempotent local shell installer for sss-token
  - README command contract aligned with runnable operator path
  - invocation-contract regression coverage in SDK integration tests
  - refreshed phase verification evidence closing UAT command-path gaps
affects: [phase-07-backend-services, operator-runbooks, UAT]
tech-stack:
  added: []
  patterns: [repo-wrapper-cli-entrypoint, installer-dry-run-contract, invocation-path-regression-test]
key-files:
  created:
    - scripts/sss-token
    - scripts/install-sss-token.sh
  modified:
    - package.json
    - README.md
    - sdk/core/src/cli.ts
    - sdk/core/tests/cli.integration.test.ts
    - .planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md
key-decisions:
  - "Standardized operator invocation on ./scripts/sss-token to avoid shell PATH ambiguity."
  - "Added an installer script as an optional convenience layer, not a hard prerequisite."
  - "Handled explicit --help as exit 0 in runCli to support deterministic shell availability checks."
patterns-established:
  - "CLI contract pattern: docs, wrapper, installer, and tests must reference the same invocation path."
  - "Verification evidence must include shell-level command availability in addition to feature tests."
requirements-completed: [CLI-01, CLI-02, CLI-03]
duration: 6min
completed: 2026-03-11
---

# Phase 06 Plan 06: Admin CLI Summary

**Repo-level `./scripts/sss-token` wrapper plus installer and regression coverage now provide a deterministic operator command path that closes UAT command-not-found gaps.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-11T05:38:14Z
- **Completed:** 2026-03-11T05:43:55Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added a deterministic repository wrapper (`./scripts/sss-token`) and optional linker installer (`./scripts/install-sss-token.sh`) for operator shells.
- Aligned `README.md` CLI usage examples with the exact wrapper path used by verification and UAT.
- Added invocation-contract regression coverage and refreshed Phase 6 verification evidence showing UAT tests 1-3 are now reachable.

## Task Commits

Each task was committed atomically:

1. **Task 1: Ship and document deterministic CLI invocation path** - `e7a448b` (feat)
2. **Task 2: Add fast regression check for invocation contract** - `53d39e7` (test)
3. **Task 3: Refresh phase verification evidence after command-path fix** - `301047e` (docs)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `scripts/sss-token` - repository wrapper that ensures CLI build availability and executes the SDK CLI entrypoint.
- `scripts/install-sss-token.sh` - idempotent symlink installer with `--dry-run` support for `~/.local/bin/sss-token`.
- `package.json` - root aliases for wrapper execution and installer invocation.
- `README.md` - canonicalized CLI examples and invocation contract documentation.
- `sdk/core/src/cli.ts` - explicit `commander.helpDisplayed` success handling for `--help`.
- `sdk/core/tests/cli.integration.test.ts` - invocation-contract regression test for documented wrapper path.
- `.planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md` - updated verification evidence and UAT closure statements.

## Decisions Made
- Standardized on `./scripts/sss-token` as the authoritative repo checkout invocation path so operator docs and tests resolve commands identically.
- Kept shell-link installation optional and additive to preserve deterministic behavior in fresh clones without requiring global PATH mutation.
- Treated `--help` as a success path (`exit 0`) to support shell-level command availability checks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Explicit help path returned non-zero exit**
- **Found during:** Task 1 (Ship and document deterministic CLI invocation path)
- **Issue:** `./scripts/sss-token --help` returned `CLI_USAGE` non-zero exit, breaking the plan's command-availability verification contract.
- **Fix:** Added `commander.helpDisplayed` handling in `runCli` to return `0` for explicit help execution.
- **Files modified:** `sdk/core/src/cli.ts`
- **Verification:** `./scripts/sss-token --help` now succeeds and prints command inventory.
- **Committed in:** `e7a448b` (part of task commit)

**2. [Rule 3 - Blocking] Node child-process EPERM in test runtime**
- **Found during:** Task 2 (Add fast regression check for invocation contract)
- **Issue:** `spawnSync`/`execSync` invocations failed with sandbox `EPERM`, preventing reliable subprocess-based assertion.
- **Fix:** Switched to a process-local invocation-contract test using `runCli(["node", wrapperPath, "--help"])` with captured stdout/stderr.
- **Files modified:** `sdk/core/tests/cli.integration.test.ts`
- **Verification:** `yarn test:sdk -- --grep "invocation contract"` passed.
- **Committed in:** `53d39e7` (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required to make command-path verification deterministic in the current environment; no scope creep.

## Issues Encountered
- `anchor test` emits transient websocket warnings before `ts-mocha` execution for `test:sss1` and `test:sss2`, but both suites completed with all tests passing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 6 command-path UAT gaps are closed with executable evidence.
- Phase 7 service work can assume an explicit and documented operator CLI contract.

## Self-Check: PASSED

---
*Phase: 06-admin-cli*
*Completed: 2026-03-11*
