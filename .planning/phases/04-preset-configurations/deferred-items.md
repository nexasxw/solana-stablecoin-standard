# Deferred Items (Phase 04 Preset Configurations)

## 2026-03-10

- `yarn format:check` fails due pre-existing formatting in unrelated files:
  - `sdk/core/src/compliance.ts`
  - `sdk/core/src/config.ts`
  - `sdk/core/src/pda.ts`
  - `sdk/core/src/stablecoin.ts`
  - `tests/helpers/index.ts`
  - `tests/sss-1.ts`
  - `tests/sss-2.ts`
- Not auto-fixed in plan `04-02` because this plan only modifies documentation (`docs/SSS-1.md`, `docs/SSS-2.md`, `docs/ARCHITECTURE.md`).
