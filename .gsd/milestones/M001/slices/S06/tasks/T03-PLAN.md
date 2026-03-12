# T03: 06-admin-cli 03

**Slice:** S06 — **Milestone:** M001

## Description

Complete SSS-2 compliance and management command coverage with final hardening for automation and documentation parity.

Purpose: Close CLI-02/CLI-03 by delivering compliance commands, management-path decisions, and requirement-mapped integration validation.
Output: Full compliance operator surface and finalized runtime behavior contracts ready for backend-service reuse.

## Must-Haves

- [ ] SSS-2 compliance commands are fully available in CLI (`blacklist add/remove/check`, `seize`) with variant gating and stable error handling.
- [ ] Runtime behavior is automation-safe: deterministic output schema, stable exit codes, and explicit unsupported-operation failures for incompatible variants.
- [ ] Management command scope is explicit and executable for this phase (excluding `minters get`, owned by Plan 02), with non-implementable placeholders either concretely implemented or documented as deferred.

## Files

- `sdk/core/src/cli/commands/compliance.ts`
- `sdk/core/src/cli/commands/management.ts`
- `sdk/core/src/cli/output.ts`
- `sdk/core/src/cli/errors.ts`
- `sdk/core/src/cli/context.ts`
- `sdk/core/tests/cli.compliance.test.ts`
- `sdk/core/tests/cli.management.test.ts`
- `sdk/core/tests/cli.integration.test.ts`
- `README.md`
