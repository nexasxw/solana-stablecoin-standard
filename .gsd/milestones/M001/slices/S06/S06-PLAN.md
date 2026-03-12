# S06: Admin Cli

**Goal:** Deliver the CLI foundation and runtime configuration layer that all Phase 6 commands depend on.
**Demo:** Deliver the CLI foundation and runtime configuration layer that all Phase 6 commands depend on.

## Must-Haves


## Tasks

- [x] **T01: 06-admin-cli 01** `est:7min`
  - Deliver the CLI foundation and runtime configuration layer that all Phase 6 commands depend on.

Purpose: Create executable CLI bootstrap, deterministic config/env/flag precedence, signer/context loading, and output/error contracts.
Output: A stable CLI core that downstream plans can extend without reworking configuration or error semantics.
- [x] **T02: 06-admin-cli 02** `est:11min`
  - Implement the Phase 6 init, lifecycle, and admin command surface for daily operator workflows.

Purpose: Satisfy CLI-01 and CLI-02 by wiring explicit command contracts to SDK create/load and lifecycle/admin APIs.
Output: Executable `sss-token` commands for initialization, lifecycle mutations, role updates, and supply/state queries.
- [x] **T03: 06-admin-cli 03** `est:9min`
  - Complete SSS-2 compliance and management command coverage with final hardening for automation and documentation parity.

Purpose: Close CLI-02/CLI-03 by delivering compliance commands, management-path decisions, and requirement-mapped integration validation.
Output: Full compliance operator surface and finalized runtime behavior contracts ready for backend-service reuse.
- [x] **T04: 06-admin-cli 04** `est:3min`
  - Close unresolved Phase 6 verification gaps by repairing the failing `tests/sss-2.ts` cases and re-running the required verification command chain.

Purpose: Convert Phase 6 from "implemented but unverified" to "verified complete" by eliminating false-negative test failures.
Output: Green `yarn test:sss2` and updated verification evidence for 06-admin-cli.
- [x] **T05: 06-admin-cli 05** `est:4min`
  - Close remaining Phase 6 verification gaps by fixing three failing `yarn test:sss2` cases and re-establishing end-to-end verification proof.

Purpose: Remove deterministic test regressions that currently block phase closeout.
Output: Green SSS-2 test suite and updated verification report with no unresolved Phase 6 gaps.
- [x] **T06: 06-admin-cli 06** `est:6min`
  - Close the remaining Phase 6 UAT gaps by making CLI invocation deterministic for operators and aligning documentation + verification with the runnable shell contract.

Purpose: Ensure UAT command checks exercise real CLI behavior instead of failing at shell command resolution.
Output: Reliable operator command path, updated docs, and refreshed Phase 6 verification evidence.

## Files Likely Touched

- `sdk/core/src/stablecoin.ts`
- `sdk/core/src/cli.ts`
- `sdk/core/src/cli/config.ts`
- `sdk/core/src/cli/context.ts`
- `sdk/core/src/cli/output.ts`
- `sdk/core/src/cli/errors.ts`
- `sdk/core/src/cli/signer.ts`
- `sdk/core/src/cli/types.ts`
- `sdk/core/tests/stablecoin.create.test.ts`
- `sdk/core/tests/cli.config.test.ts`
- `sdk/core/tests/cli.output.test.ts`
- `sdk/core/src/cli.ts`
- `sdk/core/src/cli/commands/init.ts`
- `sdk/core/src/cli/commands/lifecycle.ts`
- `sdk/core/src/cli/commands/admin.ts`
- `sdk/core/src/cli/commands/minters.ts`
- `sdk/core/src/cli/parsers.ts`
- `sdk/core/src/cli/confirm.ts`
- `sdk/core/tests/cli.init.test.ts`
- `sdk/core/tests/cli.lifecycle.test.ts`
- `sdk/core/tests/cli.admin.test.ts`
- `sdk/core/src/cli/commands/compliance.ts`
- `sdk/core/src/cli/commands/management.ts`
- `sdk/core/src/cli/output.ts`
- `sdk/core/src/cli/errors.ts`
- `sdk/core/src/cli/context.ts`
- `sdk/core/tests/cli.compliance.test.ts`
- `sdk/core/tests/cli.management.test.ts`
- `sdk/core/tests/cli.integration.test.ts`
- `README.md`
- `tests/sss-2.ts`
- `tests/helpers/token2022.ts`
- `.planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md`
- `tests/sss-2.ts`
- `tests/helpers/index.ts`
- `.planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md`
- `package.json`
- `README.md`
- `scripts/sss-token`
- `scripts/install-sss-token.sh`
- `sdk/core/tests/cli.integration.test.ts`
- `.planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md`
