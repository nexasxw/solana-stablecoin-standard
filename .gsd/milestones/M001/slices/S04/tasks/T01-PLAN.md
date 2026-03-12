# T01: 04-preset-configurations 01

**Slice:** S04 — **Milestone:** M001

## Description

Deliver the executable SDK contract for presets and custom config resolution.

Purpose: Complete the code and tests that enforce PRE-01/02/03 behavior in SDK core before docs closeout.
Output: Hardened preset/config code path with create-focused regression coverage.

## Must-Haves

- [ ] The SDK exposes canonical SSS-1 and SSS-2 presets with locked extension expectations (SSS-1: both false, SSS-2: both true) and `defaultAccountFrozen = false` for shipped presets.
- [ ] Custom TOML and JSON config inputs are normalized to runtime `StablecoinConfig` through strict validation (required name/symbol, unknown-field rejection, defaults, and paired compliance flags).
- [ ] Final initialization config resolution remains deterministic as `explicit options > config file > preset defaults` and is enforced on the `create` path.

## Files

- `sdk/core/src/presets.ts`
- `sdk/core/src/config.ts`
- `sdk/core/src/stablecoin.ts`
- `sdk/core/src/types.ts`
- `sdk/core/tests/presets.test.ts`
- `sdk/core/tests/config.test.ts`
- `sdk/core/tests/stablecoin.create.test.ts`
