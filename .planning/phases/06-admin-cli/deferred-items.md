# Deferred Items

## 2026-03-11 - Plan 06-03 Verification

- `yarn test:sss2` has pre-existing failures outside CLI scope:
  - `tests/sss-2.ts:171` - `TypeError: Assignment to constant variable.`
  - `tests/sss-2.ts:225` - `TypeError: Assignment to constant variable.`
  - `tests/sss-2.ts:397` - Token-2022 ATA setup failure (`Invalid Mint`) in `createToken2022Ata`.
- These failures are unrelated to files modified in plan `06-03` and were not auto-fixed per scope boundary rules.
