# Phase 4 Research: Preset Configurations

## Research Goal

Determine what planners need to execute Phase 4 (`PRE-01`, `PRE-02`, `PRE-03`) with low rework:
- ship canonical SSS-1 and SSS-2 presets,
- parse and strictly validate TOML/JSON custom configs,
- keep preset/config behavior aligned with Layer 1 and compliance surfaces.

## What Is Already Implemented (Important Planning Input)

Phase 4 is largely implemented in the current codebase and passing SDK tests.

### Evidence in Code

- Presets exist and are typed:
  - `sdk/core/src/presets.ts`
  - `Presets` enum with `SSS_1` and `SSS_2`
  - canonical `SSS1_CONFIG` and `SSS2_CONFIG`
- Strict config parsing/validation exists:
  - `sdk/core/src/config.ts`
  - strict schema (`.strict()`) rejects unknown fields
  - required non-empty `name` and `symbol`
  - defaults (`uri`, `decimals`, `default_account_frozen`)
  - compliance flags must be paired (`true/true` or `false/false`)
  - merge precedence is implemented as: `explicit > file > preset`
- Integration point exists in SDK create path:
  - `sdk/core/src/stablecoin.ts`
  - `create()` loads preset, optional file config, resolves final config, and enforces preset compatibility checks
- Docs already describe preset/config contract:
  - `docs/SSS-1.md`, `docs/SSS-2.md`, `docs/ARCHITECTURE.md`

### Evidence in Tests

- `sdk/core/tests/presets.test.ts`
- `sdk/core/tests/config.test.ts`
- `yarn test:sdk` passes (8 passing tests in `@stbr/sss-token` on 2026-03-10)

## Requirement Mapping (PRE-01/02/03)

- `PRE-01` (minimal SSS-1 preset): Implemented via `SSS1_CONFIG` and `Presets.SSS_1`.
- `PRE-02` (compliant SSS-2 preset): Implemented via `SSS2_CONFIG` and `Presets.SSS_2`.
- `PRE-03` (validated custom TOML/JSON): Implemented via `parseStablecoinConfigString`, `loadStablecoinConfigFile`, `validateStablecoinConfig`, and strict Zod schemas.

## Locked Decisions From Context (Do Not Re-open in Planning)

From `04-CONTEXT.md`, planners should treat these as fixed:
- Preset contract:
  - `SSS_1`: permanent delegate = `false`, transfer hook = `false`
  - `SSS_2`: permanent delegate = `true`, transfer hook = `true`
  - `defaultAccountFrozen = false` for shipped presets
- File schema:
  - input keys are `snake_case`
  - unknown keys are rejected
  - `name` and `symbol` required, non-empty
- Merge precedence:
  - `explicit options > config file > preset defaults`
- Carry-forward constraints:
  - extension flags are immutable initialization facts
  - SDK behavior must mirror on-chain SSS-1/SSS-2 surfaces

## Alignment With Phase 3 Dependencies

Phase 3 locked that compliance behavior is gated by paired extension flags and only active for SSS-2-compatible initialization. Phase 4 config logic correctly mirrors this via:
- paired-flag validation in `validateStablecoinConfig`
- preset compatibility checks in `SolanaStablecoin.create`

This dependency appears satisfied at the SDK contract level.

## Planning Implications

Because core implementation is present, Phase 4 planning should focus on **closeout and hardening**, not greenfield build.

Recommended plan shape:
1. Contract verification pass
- Confirm all Phase 4 decisions in `04-CONTEXT.md` exactly match implementation behavior.
- Verify no drift between `types.ts`, `config.ts`, `presets.ts`, and docs.

2. Targeted coverage hardening
- Add tests for any uncovered edge cases that are decision-critical (for example, explicit preset override failures in `create()` behavior).
- Keep tests SDK-level and deterministic.

3. Documentation and traceability closeout
- Ensure docs and examples match actual parser behavior and precedence ordering.
- Mark PRE requirements complete only after code+tests+docs alignment is proven.

## Potential Gaps/Risks To Check During Planning

- `create()` contains preset compatibility checks, but most current tests are unit tests for config helpers. Add/create-path-focused tests if missing.
- Runtime callers from plain JS can bypass TypeScript enum typing; planner should decide whether to add defensive runtime guard for unknown preset values (optional hardening).
- Ensure error message semantics are stable enough for downstream CLI/service consumption in later phases.

## Concrete Files Planners Should Target

- SDK core:
  - `sdk/core/src/presets.ts`
  - `sdk/core/src/config.ts`
  - `sdk/core/src/stablecoin.ts`
  - `sdk/core/src/types.ts`
- SDK tests:
  - `sdk/core/tests/presets.test.ts`
  - `sdk/core/tests/config.test.ts`
  - (potentially) new tests for `stablecoin.create` config/preset guards
- Docs:
  - `docs/SSS-1.md`
  - `docs/SSS-2.md`
  - `docs/ARCHITECTURE.md`

## Validation Commands For Execution Phase

Run narrow-to-broad:
- `yarn test:sdk`
- `yarn lint`
- `yarn format:check`
- `yarn test` (if cross-surface behavior is touched beyond SDK)

## Project Skill Pattern Notes

- `.claude/skills/SKILL.md` exists but is `vault-standard-dev` (ERC-4626 vault-focused).
- No project-local preset/config skill was found; use repo conventions and existing SDK/test patterns directly.

## Research Verdict

Phase 4 is implementation-heavy already and should be planned as a verification/hardening/documentation closeout phase that proves PRE-01/02/03 with explicit evidence, rather than a net-new feature build.
