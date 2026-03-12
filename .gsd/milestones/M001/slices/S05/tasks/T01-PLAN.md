# T01: 05-typescript-sdk 01

**Slice:** S05 — **Milestone:** M001

## Description

Establish the Phase 5 SDK contract foundation before instruction-specific implementation.

Purpose: Lock API primitives and initialization/load behavior that all later SDK operations depend on.
Output: Typed create/load, typed errors, and shared tx-result contract with regression coverage.

## Must-Haves

- [ ] `SolanaStablecoin.create` and `SolanaStablecoin.load` expose a typed contract that preserves config precedence (`explicit > file > preset`) and deterministic SSS-1/SSS-2 variant resolution.
- [ ] SDK mutation contracts use one shared transaction result envelope and typed error codes so downstream CLI/services can branch on machine-readable failures.
- [ ] Compliance surface availability is stateful and explicit (`compliance` only when SSS-2 compatibility flags are enabled).

## Files

- `sdk/core/src/stablecoin.ts`
- `sdk/core/src/types.ts`
- `sdk/core/src/index.ts`
- `sdk/core/src/errors.ts`
- `sdk/core/src/client.ts`
- `sdk/core/tests/stablecoin.create.test.ts`
