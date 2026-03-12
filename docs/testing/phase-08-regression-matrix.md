# Phase 08 Plan 03 Regression Matrix

This matrix captures the deterministic cross-layer regression evidence for `TST-01` (preset consistency from on-chain behavior through SDK and service boundaries).

## Coverage Matrix

| Scenario | Layer | Command | Deterministic Evidence | Requirement |
| --- | --- | --- | --- | --- |
| SSS-1 + SSS-2 end-to-end lifecycle and compliance contract continuity | Root integration | `yarn test:integration` | `tests/integration.ts` asserts stable transaction/request metadata continuity and machine-readable failures across integration flow | `TST-01` |
| SDK load preset/extension resolution stability | SDK | `yarn test:sdk` | `sdk/core/tests/stablecoin.create.test.ts` validates deterministic `SSS_2` resolution from paired extension hints | `TST-01` |
| SDK lifecycle behavior compatibility by variant | SDK | `yarn test:sdk` | `sdk/core/tests/stablecoin.lifecycle.test.ts` enforces deterministic unsupported operation behavior for SSS-1 treasury mutation | `TST-01` |
| SDK compliance error-code continuity | SDK | `yarn test:sdk` | `sdk/core/tests/compliance.test.ts` maps compliance/seize RPC failures to stable `RPC_ERROR` plus operation metadata | `TST-01` |
| Mint/burn API idempotency and stable error envelope behavior | Service (mint-burn) | `yarn workspace @stbr/sss-mint-burn test` | `services/mint-burn/src/__tests__/issuance.api.test.ts` confirms deterministic replay request ID and `stable_code` error details | `TST-01` |
| Compliance screening repeatability and deterministic decision envelope | Service (compliance) | `yarn workspace @stbr/sss-compliance test` | `services/compliance/src/__tests__/screening.test.ts` verifies repeated identical input yields identical request/decision/reason payload | `TST-01` |

## Command Lane (Reproducible Order)

1. `yarn test:integration`
2. `yarn test:sdk`
3. `yarn workspace @stbr/sss-mint-burn test`
4. `yarn workspace @stbr/sss-compliance test`

## Evidence Notes

- All commands are CI-safe and non-watch.
- Evidence files above are plan-owned regression checks for `08-03`.
- This matrix is paired with `.planning/phases/08-testing-and-fuzzing/08-VALIDATION.md` command truth and is intended for reviewer signoff of `TST-01`.
