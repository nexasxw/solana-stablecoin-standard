# T06: 06-admin-cli 06

**Slice:** S06 — **Milestone:** M001

## Description

Close the remaining Phase 6 UAT gaps by making CLI invocation deterministic for operators and aligning documentation + verification with the runnable shell contract.

Purpose: Ensure UAT command checks exercise real CLI behavior instead of failing at shell command resolution.
Output: Reliable operator command path, updated docs, and refreshed Phase 6 verification evidence.

## Must-Haves

- [ ] Repo operators have a deterministic documented path to execute the CLI command contract from shell without relying on hidden environment assumptions.
- [ ] CLI invocation guidance and examples in README match the actual runnable command path used by UAT.
- [ ] Verification evidence includes a shell-level command availability check plus existing lifecycle/compliance JSON-envelope behavior checks.

## Files

- `package.json`
- `README.md`
- `scripts/sss-token`
- `scripts/install-sss-token.sh`
- `sdk/core/tests/cli.integration.test.ts`
- `.planning/phases/06-admin-cli/06-admin-cli-VERIFICATION.md`
