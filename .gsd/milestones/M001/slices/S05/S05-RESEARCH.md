# Phase 5: TypeScript SDK - Research

**Researched:** 2026-03-10
**Scope:** SDK contracts and implementation strategy for SDK-01/SDK-02/SDK-03
**Confidence:** HIGH (repo-backed), MEDIUM (ergonomics where current code is incomplete)

## User Constraints

### Locked Decisions (from `05-CONTEXT.md`)
- Lifecycle methods return structured transaction results, not signature-only strings.
- Default mutation behavior is send + confirm.
- Mint/burn amount contract is canonical `bigint` in base units.
- Role-gated operations require explicit signer input on each call.
- Public entrypoint shape remains static `create` + `load`.
- `create` supports preset + config file + explicit overrides with precedence `explicit > file > preset`.
- Runtime SSS-1 vs SSS-2 selection derives from resolved compliance flags.
- `create()` returns initialized SDK instance plus initialization transaction metadata.
- Compliance helpers are SSS-2-only and unavailable on non-compliant deployments.
- `blacklistAdd` must enforce non-empty trimmed reason preflight.
- `seize` must keep explicit account parameters (source token account, target owner, treasury token account).
- Compliance operations require explicit operator signers (`blacklister`, `seizer`).
- SDK errors must be typed with stable machine-readable codes.
- SDK preflight should catch local invariants before RPC.
- Core SDK methods should not auto-retry by default.

### Carry-Forward Constraints
- Preserve Phase 4 strict config parsing/normalization and preset handling semantics.
- Preserve SSS-1/SSS-2 compatibility and extension-flag pairing semantics.
- Preserve mint-derived stablecoin identity assumptions from prior phases.
- Keep SDK behavior aligned to on-chain role gating and authority rules.

## Summary

Phase 5 should be planned as an SDK contract-hardening phase with strict mapping to existing on-chain instruction surfaces, not as protocol redesign. The main work is replacing placeholder client wiring in `sdk/core/src/stablecoin.ts` and `sdk/core/src/compliance.ts` with IDL/type-driven program clients, then enforcing the locked API contracts (structured tx results, `bigint` amount inputs, explicit signer-per-call, typed SDK errors).

The highest planning risks are contract drift and false confidence from compile-time-only placeholders. `stablecoin.ts` currently has TODO behavior and placeholder program usage that can type-check but fail at runtime. A second risk is preflight mismatch between SDK defaults and on-chain initialize constraints; planning must explicitly define where preflight is strict and where RPC errors are surfaced through typed wrappers.

## Standard Stack

### Required Core
| Stack | Use | Rationale |
|---|---|---|
| `@coral-xyz/anchor` (`^0.31.1`) | Provider, Program client, BN, RPC methods | Canonical client for this repo and generated `target/types` |
| `@solana/web3.js` (`^1.98.0`) | Connection, transaction confirmation, key handling | Base Solana networking/tx utilities |
| `@solana/spl-token` (`^0.4.10`) | Token-2022 utilities and account helpers | Needed for token account checks and supply/account reads |
| Generated IDLs and types (`target/idl`, `target/types`) | Typed instruction/account contract | Prevents hand-rolled serializer drift |

### Supporting
| Stack | Use |
|---|---|
| `zod` | Runtime input/preflight validation and typed parsing boundaries |
| `@iarna/toml` | Existing config file parsing path from Phase 4 |

### Prescriptive Choice
Use IDL/type-driven Anchor clients. Do not implement manual serializers for instructions/accounts in this phase.

## Architecture Patterns

### Pattern 1: Program Variant Resolution in One Place
Build a small internal client factory that resolves SSS-1 vs SSS-2 program client from resolved config flags during `create`, and validates caller-provided mode during `load`.

### Pattern 2: Transaction Result Envelope for All Mutations
All mutating APIs should return a common typed envelope (`signature`, confirmation state, slot/commitment metadata). `create()` returns this metadata plus initialized SDK instance.

### Pattern 3: BigInt-First Amount Boundary
For amount-bearing APIs, take `bigint` in public API, validate u64 bounds in preflight, then convert to Anchor BN at the call boundary.

### Pattern 4: Explicit Role-Signer Inputs
Keep role signers explicit on each role-gated call to avoid hidden authority assumptions and preserve auditability.

### Pattern 5: Typed Error Surface With Stable Codes
Introduce SDK error classes/codes for validation failures, unsupported operations (e.g., compliance call on SSS-1), and wrapped RPC failures. Caller logic should branch on machine-readable codes, not string matching.

## Requirement Mapping

### SDK-01 Typed Initialization
- Keep `create/load` split and preserve config precedence (`explicit > file > preset`).
- `create` returns `{ sdk, initTx }` (or equivalent shape preserving both values).
- Program selection for compliant variant derives from resolved extension flags.
- Add create-time preflight checks for invariants detectable locally before RPC.

### SDK-02 Lifecycle Operations
- Implement lifecycle methods (`mint`, `burn`, `freeze`, `thaw`, `pause`, `unpause`, role updates, state fetch) via typed Anchor clients.
- Enforce explicit signer input for role-gated actions.
- Return structured transaction results for mutating calls.
- Normalize failures into typed SDK error codes.

### SDK-03 Compliance Helpers
- Keep `compliance` surface SSS-2-only.
- Enforce non-empty trimmed reason in `blacklistAdd` preflight.
- Keep explicit seizure account tuple (`from token account`, `target owner`, `treasury token account`) with explicit `seizer` signer.
- Use same structured tx result and typed error model as lifecycle APIs.

## Don't Hand-Roll

- Do not hand-write instruction serializers or account layouts for owned programs.
- Do not hide role authority inside class construction state for role-gated calls.
- Do not expose generic `Error` strings as the final SDK contract.
- Do not add implicit retry behavior in core SDK methods.

## Common Pitfalls

- Placeholder `Program` typing can compile while runtime calls fail due to missing real IDL wiring.
- Amount inputs as `number` can silently lose precision; enforce `bigint` publicly.
- `load` behavior can become ambiguous if variant detection vs explicit mode validation is not decided early.
- Compliance helpers can leak onto SSS-1 surfaces unless gating is explicit.
- Inconsistent error encoding across methods leads to brittle CLI/service consumers.

## Code Examples

- `sdk/core/src/stablecoin.ts` (current entrypoint and lifecycle gaps)
- `sdk/core/src/compliance.ts` (compliance wrapper surface to harden)
- `sdk/core/src/config.ts` (Phase 4 parsing/merge contract to preserve)
- `sdk/core/src/presets.ts` (preset defaults and compatibility assumptions)
- `tests/sss-1.ts` and `tests/sss-2.ts` (canonical account/signers behavior)
- `target/idl/sss_1.json`, `target/idl/sss_2.json`, `target/types/*.ts` (typed source of truth)
- `.claude/skills/idl-codegen.md` (project policy for IDL/codegen-first clients)

## Validation Architecture

- Framework and commands for quick/full validation:
  - Quick loop (per task while implementing): `yarn test:sdk`.
  - Focused integration loop when SDK touches account wiring assumptions: `anchor test -- tests/sss-1.ts` and/or `anchor test -- tests/sss-2.ts`.
  - Full phase validation before phase completion claim: `yarn test:sdk && anchor test -- tests/sss-1.ts && anchor test -- tests/sss-2.ts`.
- Feedback sampling strategy during execution:
  - Run quick loop after each atomic SDK contract change (API shape, signer contract, preflight rule, error mapping).
  - Every 2-3 completed tasks, run one focused Anchor integration test that matches changed behavior.
  - Before closing the phase, run full validation once on a clean tree and capture exact pass/fail command outputs.
- Task/requirement mapping approach:
  - Maintain explicit mapping in plan tasks: SDK-01 (`create/load` + config precedence + init result), SDK-02 (lifecycle parity + tx envelope + signer inputs), SDK-03 (compliance-only helpers + reason/seize constraints).
  - Each task includes one primary validation command and one assertion target (API contract, runtime behavior, or error code behavior).
  - Phase completion requires evidence that each requirement has at least one passing validation artifact.
- Manual-only checks if any:
  - Type-surface review of public exports in `sdk/core/src/index.ts` to confirm no unintended breaking API exposure.
  - Human review that error codes are stable and documented consistently for CLI/service consumers.
  - Human review that compliance helpers are inaccessible/non-instantiated on SSS-1 deployments.

## Planning Checklist

- [ ] Define public result and error contracts first (transaction envelope + stable error codes).
- [ ] Implement real program client factory from generated IDLs/types.
- [ ] Refactor `create` to return SDK instance plus initialization transaction metadata.
- [ ] Implement lifecycle APIs with bigint/u64 preflight + explicit signers.
- [ ] Finalize deterministic `load` variant behavior (explicit mode validation and/or controlled detection).
- [ ] Harden compliance helper preflight and typed errors.
- [ ] Extend SDK tests for SDK-01/SDK-02/SDK-03 behavioral coverage.
- [ ] Execute quick and full validation command sets and record outcomes.

## Open Questions for Planning

- Should `load` require explicit variant hint always, or support controlled auto-detection with strict validation?
- Should `create` return minimal `{ sdk, initTx }` or include resolved variant/config metadata for downstream tooling?
- How strict should create-time metadata preflight be relative to current on-chain initialize rules to avoid opaque RPC failures while preserving flexibility?