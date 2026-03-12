# T02: 06-admin-cli 02

**Slice:** S06 — **Milestone:** M001

## Description

Implement the Phase 6 init, lifecycle, and admin command surface for daily operator workflows.

Purpose: Satisfy CLI-01 and CLI-02 by wiring explicit command contracts to SDK create/load and lifecycle/admin APIs.
Output: Executable `sss-token` commands for initialization, lifecycle mutations, role updates, and supply/state queries.

## Must-Haves

- [ ] Operators can initialize and manage SSS-1, SSS-2, and custom deployments through explicit CLI commands wired to SDK contracts.
- [ ] Lifecycle/admin commands (`mint`, `burn`, `freeze`, `thaw`, `pause`, `unpause`, roles/authority/minter updates, `status`, `supply`) enforce required arguments and signer requirements before SDK calls.
- [ ] High-impact mutations support explicit confirmation bypass (`--yes`) while preserving automation-safe deterministic behavior.

## Files

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
