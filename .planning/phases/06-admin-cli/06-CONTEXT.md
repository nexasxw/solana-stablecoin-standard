# Phase 6: Admin CLI - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the `sss-token` operator CLI on top of the completed SDK so operators can initialize SSS-1/SSS-2/custom deployments, run lifecycle/admin operations, execute SSS-2 compliance commands, and use runtime config/env inputs consistently. This phase defines CLI command contracts and operator UX only; backend services, docs expansion, and other new capabilities remain out of scope.

</domain>

<decisions>
## Implementation Decisions

### Command Surface
- Organize commands by domain groups (init, lifecycle/admin, compliance, info/management) rather than a fully flat command list.
- Prefer explicit command names as primary UX (`freeze`, `unpause`, `update-roles`, etc.), with aliases optional.
- Target full Phase 6 command coverage in this phase (not MVP subset), aligned with CLI-01/CLI-02/CLI-03 and current README command expectations.
- Use positional operands for required values plus flags for optional behavior.

### Config and Auth Inputs
- Runtime precedence is locked to: `flags > environment variables > config file`.
- Signer model uses a global default signer source with per-command override flags.
- RPC source defaults from config/env with one-off override via command flag.
- CLI should support a standard default config path when `--config` is omitted, with explicit override support.

### Output and Error UX
- Default output is human-readable terminal format, with `--json` for machine-readable output.
- Exit behavior is strict: any command failure exits non-zero.
- CLI output should include stable SDK error codes when available (alongside readable messages).
- High-impact operations should remain automation-friendly by default, with explicit confirmation control (`--yes`) for guarded flows.

### Carry-forward Constraints from Prior Phases
- Preserve Phase 4 config resolution semantics and strict config validation expectations.
- Preserve Phase 5 SDK contracts: explicit signer-driven role actions, typed lifecycle/compliance behavior, deterministic preflight errors, and no implicit retry policy.
- Keep CLI behavior aligned to on-chain role gating and SSS-1/SSS-2 compatibility constraints.

### Claude's Discretion
- Exact command tree layout and subcommand nesting depth, as long as grouped-domain structure and explicit naming remain intact.
- Output rendering details (table format, field ordering, color/spinner usage) for human mode.
- Exact flag names where semantically equivalent and consistent with existing command vocabulary.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sdk/core/src/stablecoin.ts`: complete typed lifecycle/admin operations for CLI command handlers.
- `sdk/core/src/compliance.ts`: blacklist/seize helper surface for SSS-2 CLI flows.
- `sdk/core/src/config.ts` and `sdk/core/src/presets.ts`: reusable config/preset parsing and validation baseline.
- `sdk/core/src/errors.ts`: stable SDK error-code taxonomy to expose via CLI.
- `sdk/core/package.json`: already includes `commander`, `chalk`, `ora`, and `cli-table3` dependencies and `bin` mapping for `sss-token`.

### Established Patterns
- SDK contracts already enforce explicit signer and preflight semantics; CLI should remain a thin, explicit orchestration layer.
- Repository docs and README already define target command vocabulary; implementation should keep parity.
- TypeScript strictness and test-first behavior in `sdk/core/tests` are established quality expectations.

### Integration Points
- CLI command handlers should call the existing SDK create/load, lifecycle, and compliance methods directly.
- Config/env resolution should integrate with existing SDK config parsing behavior to avoid duplicated drift.
- CLI command contracts must be stable for direct reuse in Phase 7 services and later documentation/devnet proof phases.

</code_context>

<specifics>
## Specific Ideas

- Preserve README CLI command parity so operator workflows in docs remain executable.
- Keep command UX explicit and script-friendly: deterministic output, stable exit behavior, and machine-readable errors.
- Treat CLI as operator tooling, not a consumer UX layer.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-admin-cli*
*Context gathered: 2026-03-10*
