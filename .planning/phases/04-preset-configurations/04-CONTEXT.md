# Phase 4: Preset Configurations - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver SDK-level preset definitions for SSS-1 and SSS-2 plus strict custom configuration parsing/validation for TOML and JSON. This phase locks the preset/config contract used by downstream SDK/CLI/service work. CLI UX and runtime operational flows stay in later phases.

</domain>

<decisions>
## Implementation Decisions

### Preset contract behavior
- Keep `Presets` enum (`SSS_1`, `SSS_2`) as the public selector and expose a typed canonical preset shape (`PresetConfig`).
- Preset compatibility is strict: conflicting compliance flags must hard-fail.
  - `SSS_1` requires `enablePermanentDelegate = false` and `enableTransferHook = false`.
  - `SSS_2` requires `enablePermanentDelegate = true` and `enableTransferHook = true`.
- `defaultAccountFrozen` stays `false` for both shipped presets in this phase.

### Config schema and validation policy
- Config files use documented `snake_case` keys for file input.
- Unknown fields in TOML/JSON are rejected (strict schema).
- `name` and `symbol` are required and non-empty before create-time config is considered valid.
- Runtime defaults remain:
  - `uri = ""`
  - `decimals = 6`
  - `default_account_frozen = false` unless explicitly provided.
- Compliance extension flags must be paired (both `true` or both `false`), never mixed.

### Config resolution behavior
- Final merge precedence is locked to: `explicit options > config file > preset defaults`.
- File format detection is by extension (`.toml`/`.json`) with optional explicit format override.
- Parser/validator normalize file input into SDK runtime `StablecoinConfig` camelCase shape.

### Carry-forward constraints from prior phases
- Preserve Phase 2 decision that extension flags are immutable initialization facts.
- Preserve Phase 2 and 3 alignment that SDK-facing behavior must mirror on-chain Layer 1 + compliance surfaces.
- Preset/config outputs must remain compatible with mint-derived stablecoin identity and current SSS-1/SSS-2 instruction expectations.

### Claude's Discretion
- Exact helper/module boundaries inside `sdk/core` for config parsing and validation utilities.
- Exact error-message text granularity as long as semantic behavior above stays locked.
- Additional edge-case tests that reinforce, but do not expand, the phase boundary.

</decisions>

<specifics>
## Specific Ideas

- Keep this phase SDK-centric: no CLI command UX expansion here.
- Treat strict validation as a safety feature to prevent silent issuer misconfiguration.
- Keep parser output deterministic so Phase 5/6 consumers can build on one stable config contract.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sdk/core/src/presets.ts`: canonical SSS preset definitions and selector.
- `sdk/core/src/types.ts`: shared SDK config and create-option types.
- `sdk/core/src/stablecoin.ts`: single create path where config resolution should be enforced.
- `sdk/core/src/config.ts`: strict parsing/validation + merge logic for TOML/JSON and runtime config.
- `sdk/core/tests/config.test.ts` and `sdk/core/tests/presets.test.ts`: phase-specific verification coverage.

### Established Patterns
- TypeScript strict mode + ESLint no-unused-vars from workspace conventions.
- Named exports and feature-focused files in `sdk/core/src`.
- Runtime safety through explicit errors and deterministic input normalization.

### Integration Points
- `SolanaStablecoin.create` consumes resolved config and gates SSS-1 vs SSS-2 behavior.
- Docs (`docs/SSS-1.md`, `docs/SSS-2.md`, `docs/ARCHITECTURE.md`) must reflect the same preset/config contract.
- Later Phase 5 SDK API expansion and Phase 6 CLI flows will depend on this normalized config contract.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-preset-configurations*
*Context gathered: 2026-03-10*
