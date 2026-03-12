# Phase 6: Admin CLI - Research

**Researched:** 2026-03-10  
**Scope:** Planning inputs for `CLI-01`, `CLI-02`, `CLI-03`  
**Phase Goal:** Deliver `sss-token` operator CLI using the SDK internally.

## What Is Locked Already

From `06-CONTEXT.md`, the following are fixed and should not be re-litigated during planning:
- Command UX is domain-grouped (init, lifecycle/admin, compliance, info/management).
- Runtime config precedence is `flags > environment variables > config file`.
- CLI defaults to human-readable output with `--json` opt-in.
- Command failures exit non-zero.
- SDK error codes should be surfaced in CLI output when available.
- High-impact operations should support explicit confirmation bypass (`--yes`).
- CLI must preserve Phase 4 config semantics and Phase 5 explicit signer behavior.

## Requirement Fit (CLI-01/02/03)

- `CLI-01` (init + manage SSS-1/SSS-2/custom): feasible with current SDK `create/load`, preset/config parser, and lifecycle APIs.
- `CLI-02` (mint/burn/freeze/thaw/pause/roles/supply checks): mostly feasible with current SDK methods.
- `CLI-03` (compliance + runtime config from env/config): compliance methods exist in SDK, but CLI runtime config layer is net-new and must be designed.

## Current Codebase Reality (Important for Planning)

## Existing Assets You Can Reuse
- `sdk/core/src/stablecoin.ts`: lifecycle/admin SDK surface (`mint`, `burn`, `freeze`, `thaw`, `pause`, `unpause`, `updateMinter`, `removeMinter`, `updateRoles`, `transferAuthority`, `setTreasury`, `getState`, `getTotalSupply`).
- `sdk/core/src/compliance.ts`: SSS-2 compliance operations (`blacklistAdd`, `blacklistRemove`, `seize`, `isBlacklisted`).
- `sdk/core/src/config.ts` + `sdk/core/src/presets.ts`: strict preset/custom config parsing for initialization inputs.
- `sdk/core/src/errors.ts`: machine-readable error codes (`INVALID_ARGUMENT`, `INVALID_AMOUNT`, `MISSING_SIGNER`, `UNSUPPORTED_OPERATION`, `RPC_ERROR`, etc.).
- `sdk/core/package.json`: CLI dependencies (`commander`, `chalk`, `ora`, `cli-table3`) and bin mapping already declared as `sss-token -> dist/cli.js`.

## Gaps You Must Plan Around
- No CLI source exists yet (`sdk/core/src/cli.ts` missing).
- No runtime CLI config schema/loader exists yet (separate from stablecoin create config parser).
- README command catalog includes management commands (`minters list`, `holders`, `audit-log`) that are not all directly exposed by current SDK APIs.
- Root README references docs files (`docs/SDK.md`, `docs/OPERATIONS.md`) that do not currently exist; avoid using them as source of truth for Phase 6 behavior.

## Dependency Risk to Surface Early

Phase 6 depends on Phase 5 being complete and runtime-safe. In current code, `SolanaStablecoin.create()` still returns a simulated init signature (`simulated-init-*`) and does not submit `initialize` RPC. If this remains true at plan execution time, `sss-token init` cannot satisfy real operator expectations.

Planning implication:
- Add a **Phase-entry gate**: verify SDK init path is real on-chain before implementing CLI workflows that assume live deployment.
- If not real, route as blocker/fix path before or at start of Phase 6 execution.

## Command Surface Strategy (Planning Baseline)

Use explicit top-level verbs plus grouped subcommands where needed:

- `init`
- `mint`, `burn`, `freeze`, `thaw`, `pause`, `unpause`
- `roles update`, `authority transfer`
- `minters add`, `minters remove`, `minters get` (or `status` if list is deferred)
- `status`, `supply`
- `blacklist add`, `blacklist remove`, `blacklist check`
- `seize`, `treasury set`

Notes for planner:
- Keep required operands positional; optional behavior as flags.
- Maintain parity with README where feasible, but prefer executable contracts over undocumented placeholders.
- For commands requiring variant-specific behavior, fail fast with clear unsupported errors (for SSS-1 vs SSS-2 paths).

## Runtime Config Architecture (CLI-03)

Define a dedicated operator runtime config (separate from token initialization config):
- Suggested fields: `rpc_url`, `commitment`, `mint`, `variant`, `default_signer`, `authority_signer`, `minter_signer`, `burner_signer`, `pauser_signer`, `blacklister_signer`, `seizer_signer`, `treasury_token_account`, `output`, `confirm`.
- File formats: TOML/JSON/YAML acceptable if kept strict and deterministic.
- Resolution algorithm: parse config file (if present) -> overlay env vars -> overlay flags.
- Validation: explicit type checks and role-specific signer/key constraints before SDK calls.

Critical planning decision to lock:
- Canonical env var namespace (recommend `SSS_TOKEN_*` to avoid collisions).

## Error and Output Contract

Human mode:
- concise status line + key fields (signature, mint/stablecoin, role, amount, slot/confirmation when available).

JSON mode (`--json`):
- stable envelope with `ok`, `command`, `data`, `error`.
- include `error.code` from SDK when error is `StablecoinSdkError`.
- include non-zero `exitCode` mapping by category (validation/usage/rpc/unsupported).

## Plan-Ready Task Decomposition

A practical Phase 6 plan should split into three execution tracks:

1. CLI foundation + runtime config layer (`CLI-03` backbone)
- Implement command bootstrap, shared context builder, signer loading, config/env/flag merge, output/error renderer.

2. Lifecycle/admin command implementation (`CLI-01`, `CLI-02`)
- Wire init/manage/lifecycle/role/supply/status commands to SDK.
- Normalize argument parsing (`PublicKey`, `bigint`, signer files) and enforce preflight guards.

3. Compliance + management commands + hardening (`CLI-02`, `CLI-03`)
- Wire blacklist/seize/treasury flows.
- Decide realistic scope for `minters list`, `holders`, `audit-log` (implement with SDK/program account queries or explicitly defer to later phase if truly out-of-scope).

## Planning Decisions That Must Be Explicit Before Execution

- Final command inventory for Phase 6 completion (especially management commands not directly covered by SDK methods).
- Role signer resolution rules (global signer fallback + per-command overrides).
- Canonical env var names and default config file location.
- JSON output schema and exit code policy.
- Whether CLI reads on-chain events now for `audit-log` or defers this until indexer/services phase.

## Project Skill Pattern Notes

- Project-local skill pack exists at `.claude/skills/` (`vault-standard-dev`) and is vault/Anchor focused, not CLI-specific.
- No project-local `.agents/skills/` directory exists.
- For Phase 6 planning, rely on repository conventions and SDK/test patterns rather than skill-specific CLI templates.

## Validation Architecture

Validation should run narrow-to-broad and map directly to requirement IDs.

- Unit/contract tests (new under `sdk/core/tests/cli.*.test.ts`):
  - command parsing
  - config/env/flag precedence
  - signer resolution and required-arg validation
  - JSON/human output contract
  - exit-code mapping and SDK error-code passthrough

- Command integration tests (process-level):
  - invoke built CLI (`node sdk/core/dist/cli.js ...`) with fixture configs/env
  - assert stdout/stderr/exit code deterministically
  - use SDK/method mocks where possible for fast feedback

- End-to-end smoke checks (local validator):
  - `init` for SSS-1 and SSS-2/custom path
  - lifecycle happy path (`mint`, `burn`, `freeze`, `thaw`, `pause`, `unpause`, `supply`, `status`)
  - compliance happy path (`blacklist add/remove/check`, `seize`) on SSS-2

Recommended command cadence during execution:
- Fast loop: `yarn test:sdk`
- CLI build check: `yarn workspace @stbr/sss-token build`
- Full CLI phase pass (before claiming done):
  - `yarn workspace @stbr/sss-token build && yarn test:sdk && yarn test:sss1 && yarn test:sss2`

Requirement trace in validation:
- `CLI-01`: init/manage presets/custom + signer/config plumbing.
- `CLI-02`: lifecycle/admin/compliance command behavior and failures.
- `CLI-03`: env/config/flag precedence and runtime config determinism.

## Research Verdict

Phase 6 is ready to plan, but planning quality depends on treating it as a real CLI product phase, not just command wiring:
- lock command inventory and runtime config contract up front,
- add an explicit phase-entry gate for SDK init realism,
- keep CLI thin over SDK contracts, with deterministic output/error semantics for operators and automation.