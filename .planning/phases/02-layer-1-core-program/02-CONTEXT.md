# Phase 2: Layer 1 Core Program - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the shared Layer 1 Anchor program that both SSS presets build on. This phase covers `StablecoinConfig`, stablecoin state and quota PDAs, the shared lifecycle instruction set, Token-2022 mint configuration during initialization, role-based access control, explicit Anchor errors, and the on-chain enforcement of pause and quota rules. Presets, compliance transfer hooks, SDK ergonomics, CLI flows, services, tests beyond core coverage, and deployment proof stay in later phases.

</domain>

<decisions>
## Implementation Decisions

### Contract surface
- `StablecoinConfig` is the initialization contract shared by SSS-1 and SSS-2.
- The shared instruction set must include `initialize`, `mint`, `burn`, `freeze_account`, `thaw_account`, `pause`, `unpause`, `update_minter`, `update_roles`, and `transfer_authority`.
- The Layer 1 contract is the root implementation issue and later phases build on its finalized interface.

### Access control and state rules
- Role-based access control must cover authority, minter, burner, pauser, blacklister, and seizer where applicable.
- Per-minter quotas and a global pause state must be enforced on-chain.
- Invalid or unauthorized actions must fail through clear Anchor error codes instead of panics.

### Token-2022 behavior
- `initialize` must apply the correct Token-2022 mint configuration for the requested preset behavior.
- The account model must include PDA layout for the stablecoin state and minter quota state.
- The contract must be stable enough that presets, SDK work, services, tests, and deployment can build on it without changing the core interface again immediately.

### Claude's Discretion
- Exact module boundaries inside the program crates
- Specific PDA seed naming as long as it stays consistent and testable
- Internal helper abstractions, instruction file organization, and test helper structure

</decisions>

<specifics>
## Specific Ideas

- Linear issue source: `NEX-6` "Layer 1: Anchor program - StablecoinConfig + core instructions"
- This phase is explicitly described in Linear as the root implementation issue that blocks SDK, services, tests, docs, and deployment work.
- Success must be visible through happy-path execution plus rejection of unauthorized or invalid calls.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `programs/sss-1/` and `programs/sss-2/`: existing Anchor program locations where shared patterns and future contract usage already live
- `tests/` and `tests/helpers/`: existing integration-test locations for Anchor-driven verification flows
- `sdk/core/src/`: existing SDK surface that will need a stable Layer 1 contract to target

### Established Patterns
- `AGENTS.md` expects focused instruction files under `programs/*/src/instructions/`
- TypeScript integration tests are already organized at the repo root and should stay close to the on-chain behavior under test
- The codebase already separates on-chain programs, SDK/CLI packages, services, and docs by top-level directory

### Integration Points
- Layer 1 contract APIs will become the dependency for later preset configuration work in `programs/` and `docs/`
- SDK and CLI packages will mirror the instruction and account model defined here
- Backend services, test harnesses, and devnet proof work all depend on the final Layer 1 interface

</code_context>

<deferred>
## Deferred Ideas

- Compliance transfer-hook behavior and blacklist enforcement belong to Phase 3.
- Preset materialization and custom config parsing belong to Phase 4.
- SDK, CLI, services, extended testing, devnet proof, Docker, and submission packaging belong to later phases already captured in the roadmap.

</deferred>

---
*Phase: 02-layer-1-core-program*
*Context gathered: 2026-03-09*
