# T03: 05-typescript-sdk 03

**Slice:** S05 — **Milestone:** M001

## Description

Deliver SSS-2 compliance helper APIs with explicit operator and account contracts.

Purpose: Satisfy SDK-03 with robust preflight validation and typed behavior consistent with the rest of the SDK.
Output: Hardened compliance module and regression tests for blacklist/seize workflows.

## Must-Haves

- [ ] Compliance helpers are available only for SSS-2-compatible deployments and surface explicit unsupported-operation failures otherwise.
- [ ] `blacklistAdd` enforces non-empty trimmed reason preflight and compliance mutations require explicit operator signers.
- [ ] `seize` preserves explicit account contract (source token account, target owner, treasury token account) and returns shared typed transaction result metadata.

## Files

- `sdk/core/src/compliance.ts`
- `sdk/core/src/errors.ts`
- `sdk/core/src/types.ts`
- `sdk/core/src/index.ts`
- `sdk/core/tests/compliance.test.ts`
