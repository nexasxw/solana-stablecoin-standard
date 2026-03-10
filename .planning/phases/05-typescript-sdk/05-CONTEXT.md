# Phase 5: TypeScript SDK - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the public TypeScript SDK for initialization, lifecycle operations, and SSS-2 compliance helpers. This phase defines developer-facing SDK call contracts that match the finalized on-chain Layer 1 and compliance behavior plus Phase 4 preset/config rules. CLI command UX, backend service behavior, and non-SDK features remain out of scope.

</domain>

<decisions>
## Implementation Decisions

### Lifecycle API contract
- Lifecycle methods should return a structured transaction result (not signature-only).
- Default transaction behavior is send + confirm.
- Amount inputs for mint/burn should use base-unit `bigint` as the canonical contract.
- Role-gated lifecycle methods require explicit per-call signer parameters.

### Initialization ergonomics
- Keep the existing static split (`create` and `load`) as the public entrypoint shape.
- Allow combined config sources in `create` (preset + config file + explicit overrides), preserving locked Phase 4 precedence: `explicit > file > preset`.
- Runtime SSS-1 vs SSS-2 program selection should be derived from resolved compliance flags.
- `create()` should provide both initialized SDK instance and initialization transaction metadata.

### Compliance helper contract
- Compliance helpers remain SSS-2-only (`compliance` unavailable on non-compliant deployments).
- `blacklistAdd` should enforce non-empty trimmed reason preflight validation.
- `seize` should keep explicit account parameters (source token account, target owner, treasury token account) rather than only high-level owner inputs.
- Compliance actions require explicit per-call operator signers (`blacklister` / `seizer`).

### Error and validation UX
- Use typed SDK errors for caller-facing failures (not generic errors only).
- Include stable machine-readable error codes.
- Apply strong preflight checks for known local invariants before RPC submission.
- Core SDK methods should not auto-retry by default; retry behavior is caller-controlled.

### Carry-forward constraints from prior phases
- Preserve strict config validation and normalized parsing policy from Phase 4.
- Preserve immutable SSS-1/SSS-2 compatibility semantics and extension-flag pairing.
- Preserve mint-derived stablecoin identity expectations from Layer 1/compliance work.
- Keep SDK behavior aligned with on-chain role gating and authority expectations.

### Claude's Discretion
- Exact TypeScript type names and helper boundaries for transaction result and error classes.
- Internal module organization for lifecycle method implementations and shared RPC helpers.
- Optional convenience wrappers that do not alter the canonical explicit contracts above.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sdk/core/src/stablecoin.ts`: existing class surface (`create`, `load`, lifecycle stubs) to extend rather than replace.
- `sdk/core/src/compliance.ts`: existing blacklist/seize wrapper structure for SDK-03 behavior.
- `sdk/core/src/config.ts` and `sdk/core/src/presets.ts`: finalized preset/config resolution contract from Phase 4.
- `sdk/core/src/pda.ts`: PDA derivation helpers already mirroring on-chain seeds.
- `sdk/core/src/types.ts`: shared SDK option/state type definitions as baseline.

### Established Patterns
- Named exports with feature-focused files under `sdk/core/src`.
- TypeScript strict mode and workspace lint/format rules remain the default quality bar.
- Runtime guardrails are preferred when invariant violations can be detected before RPC.

### Integration Points
- `SolanaStablecoin` lifecycle methods must map to Layer 1 instruction surface (`mint`, `burn`, `freeze`, `thaw`, `pause`, role updates).
- `ComplianceModule` methods must align with SSS-2 blacklist/seizure rules from Phase 3.
- `sdk/core/src/index.ts` must expose finalized Phase 5 APIs without breaking preset/config guarantees from Phase 4.
- Phase 6 CLI and Phase 7 services will consume these SDK contracts directly.

</code_context>

<specifics>
## Specific Ideas

- Preserve explicit signer requirements to keep operator actions auditable and reduce hidden authority assumptions.
- Keep SDK defaults deterministic and safe-first for operator workflows.
- Prioritize contracts that are easy for CLI/services to consume without ambiguous runtime behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-typescript-sdk*
*Context gathered: 2026-03-10*
