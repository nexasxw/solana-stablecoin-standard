# SDK Reference

## Prerequisites

- Node.js 20+
- Yarn 1.x workspace tooling
- Anchor CLI 0.31+
- Solana CLI configured for the target cluster
- Repository dependencies installed with `yarn install`

## Scope

This document captures shipped SDK behavior for the current repository state.

## Package Surface

- Package: `@stbr/sss-token`
- Source: `sdk/core/src/`
- Runtime entrypoints:
  - `SolanaStablecoin.create(...)`
  - `SolanaStablecoin.load(...)`
  - preset selector `Presets.SSS_1` and `Presets.SSS_2`

## Preset And Config Contract

SDK initialization follows deterministic precedence:

1. explicit runtime options
2. config file values
3. preset defaults

Configuration file rules:

- file keys must be `snake_case`
- unknown fields are rejected
- non-object roots are rejected
- unsupported preset values fail at runtime

## Command Surfaces

Use these commands from repository root to verify the SDK/CLI surface:

```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
```

## Verification References

- `docs/testing/phase-08-command-truth.md`
- `docs/testing/phase-08-regression-matrix.md`
- `.planning/phases/09-documentation/09-VALIDATION.md`

## Deferred Content

Detailed API call-by-call examples and failure-path matrices are completed in later Phase 9 plans.
