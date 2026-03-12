# Phase 08 Command Truth

This document is the authoritative command contract for Phase 08 (`testing-and-fuzzing`).

## Scope

- Freeze deterministic verification lanes used by `08-01` through `08-05`.
- Ensure all service checks execute real suites under `src/__tests__`.
- Define the devnet proof prerequisites used by `TST-03`.

## Verification Lanes

| Lane | Purpose | Canonical Command |
|------|---------|-------------------|
| Quick | Fast confidence gate after small batches of commits | `yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn test:services` |
| Full | Pre-handoff and wave-complete gate | `yarn lint && yarn build && yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn workspace @stbr/sss-mint-burn test && yarn workspace @stbr/sss-compliance test && yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && cargo test --manifest-path trident-tests/Cargo.toml` |
| Devnet proof | Deterministic command surface check before live proof capture | `./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help` |

## Service Test Truth

- `@stbr/sss-indexer`: `yarn workspace @stbr/sss-indexer run test`
- `@stbr/sss-webhook`: `yarn workspace @stbr/sss-webhook run test`
- Both workspace `test` commands must execute:
  - `mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'`
- Placeholder pass-through scripts are not allowed for Phase 8.

## Change Control

- If any lane command changes, update:
  - `.planning/phases/08-testing-and-fuzzing/08-VALIDATION.md`
  - `docs/testing/phase-08-command-truth.md`
- If operator-facing runbooks reference lane behavior, ensure they point to this document as lane authority:
  - `docs/OPERATIONS.md` (Phase 09 reviewer flow)
- Updates must include a passing run for the affected lane in the plan summary evidence.
