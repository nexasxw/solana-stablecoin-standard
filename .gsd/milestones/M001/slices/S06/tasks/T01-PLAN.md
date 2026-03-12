# T01: 06-admin-cli 01

**Slice:** S06 — **Milestone:** M001

## Description

Deliver the CLI foundation and runtime configuration layer that all Phase 6 commands depend on.

Purpose: Create executable CLI bootstrap, deterministic config/env/flag precedence, signer/context loading, and output/error contracts.
Output: A stable CLI core that downstream plans can extend without reworking configuration or error semantics.

## Must-Haves

- [ ] CLI bootstrap exists with deterministic command wiring, strict non-zero failure exits, and stable machine-readable JSON output mode.
- [ ] Runtime config resolution is canonical and test-guarded as `flags > environment variables > config file` with strict validation errors.
- [ ] CLI context and signer resolution are explicit, enabling per-command override with global defaults and no hidden signer inference.

## Files

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
