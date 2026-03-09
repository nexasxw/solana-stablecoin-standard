# Phase 2 Research: Layer 1 Core Program

## Research Goal

Phase 2 needs to turn the current scaffolded stablecoin program surface into a stable, testable Layer 1 contract that later preset, SDK, CLI, and service work can build on without reworking the core interface.

The practical question for planning is not "what instructions should exist?" because most of them already exist as stubs. The real questions are:

- What is the canonical shared account model?
- Which invariants must be locked before downstream work starts?
- Which parts of the current code are reusable versus unsafe to build on?
- Which repo-level blockers must be handled so Phase 2 can be validated?

## Current Starting Point

The repo already contains most of the intended Layer 1 surface in Rust:

- `programs/sss-1/` already defines `initialize`, `mint`, `burn`, `freeze_account`, `thaw_account`, `pause`, `unpause`, `update_minter`, `remove_minter`, `update_roles`, and `transfer_authority`.
- `programs/sss-1/src/state.rs` already defines `StablecoinConfig`, `Stablecoin`, and `MinterConfig`.
- `programs/sss-1/src/error.rs` and `programs/sss-1/src/events.rs` already define most of the explicit error and event surface.
- `programs/sss-2/` duplicates the same baseline lifecycle logic and adds compliance-specific roles and instructions that belong to Phase 3.
- `tests/sss-1.ts` and `tests/sss-2.ts` already outline the intended verification scenarios, but they are almost entirely TODOs.
- `sdk/core/src/pda.ts` already mirrors the current PDA scheme and is a good signal for which seeds downstream code expects.

The main gap is not missing files. The main gap is that the existing program surface is not yet safe or complete enough to treat as the foundation layer.

## What Planning Must Decide Up Front

### 1. What "shared Layer 1 program" means in this repo

The roadmap and phase context describe a shared Layer 1 Anchor program, but the current repo shape is two preset programs with duplicated core logic:

- `sss-1` contains the minimal lifecycle baseline.
- `sss-2` contains the same baseline plus compliance additions.

Planning should explicitly choose one of these approaches:

1. Harden `sss-1` as the canonical Layer 1 baseline, then keep `sss-2` aligned until Phase 3 extends it.
2. Extract shared Rust code into a common crate or module and have both programs consume it.
3. Introduce a third deployed core program, which would be a much larger architecture shift than the current repo suggests.

Recommended planning stance: use option 1 for Phase 2 unless there is a strong reason to pay the extraction cost now. It matches the current tree, avoids introducing a new program ID, and keeps the phase focused on `CORE-01` through `CORE-03`.

### 2. Stablecoin PDA seed strategy

This is the biggest design blocker in the current code. Today the stablecoin PDA is derived from:

- `["stablecoin", authority]`

That breaks `transfer_authority`, because the PDA address stays the same while later instructions try to re-derive it from the new authority. Planning must resolve this before any downstream interface is frozen.

Viable directions:

- Seed the stablecoin PDA from the mint instead of the authority.
- Seed from an immutable stablecoin id generated at initialization.
- Keep the current seed and remove or radically redefine `transfer_authority`, which is the weakest option.

Recommended planning stance: make the stablecoin PDA independent of the mutable authority field. The mint is the cleanest candidate because it is already unique, later clients naturally know it, and the authority can then rotate safely.

### 3. Phase boundary with SSS-2 compliance

Phase 2 owns the shared lifecycle contract. Phase 3 owns blacklist enforcement, seizure, and the transfer-hook flow. The repo already mixes these concerns.

Planning should keep these boundaries explicit:

- Phase 2 should fully deliver the shared account model, lifecycle instructions, roles, quotas, pause rules, and explicit errors.
- Phase 2 should preserve config compatibility for later SSS-2 work.
- Phase 2 should avoid fully implementing blacklist and transfer-hook enforcement unless the planner intentionally expands scope.

### 4. Whether `default_account_frozen` is real scope

`StablecoinConfig` includes `default_account_frozen`, but:

- the docs do not list `DefaultAccountState` in the extension matrix,
- the initialize handlers do not apply it,
- later instruction logic does not depend on it.

Planning should either:

- remove or defer this field from the Phase 2 contract surface, or
- explicitly implement the Token-2022 default-account-state extension now.

This should not stay ambiguous because it affects mint initialization and the public config shape.

### 5. What quota means

Current code tracks:

- `quota`: max allowed minting for a minter
- `minted`: cumulative amount minted so far

Burning does not restore quota. That means quota currently behaves like a lifetime issuance cap, not an outstanding net mint cap. Planning should confirm this is the desired business rule and test it explicitly.

## CORE-01: `StablecoinConfig` And Stablecoin State PDAs

### What must be true

Phase 2 must ship a stable account model for:

- a canonical stablecoin state PDA,
- per-minter quota PDAs,
- the shared configuration struct passed to initialization.

### Existing reusable code paths

- `programs/sss-1/src/state.rs` already defines the right baseline shapes.
- `programs/sss-2/src/state.rs` shows the extension path for compliance roles.
- `sdk/core/src/pda.ts` already mirrors the stablecoin, minter, blacklist, and extra-account-meta seeds.

### Gaps to plan around

- The stablecoin PDA seed is currently coupled to a mutable authority field.
- `StablecoinConfig` is duplicated in `sss-1`, `sss-2`, and `sdk/core/src/types.ts`; drift is likely unless one canonical schema is chosen.
- `default_account_frozen` is present but not implemented.
- `sss-1` comments say permanent delegate and transfer hook should always be false, but the current initializer accepts and stores whatever is passed in.
- The current initialize handlers only store a mint pubkey; they do not create or validate a real Token-2022 mint account.

### Planning implications

- The first executable plan should lock the stablecoin PDA seed scheme and finalize the shared account schema.
- The planner should decide whether `sss-1` is the only Phase 2 state model to implement, with `sss-2` alignment deferred, or whether the same schema changes must land in both programs in this phase.
- The planner should treat mint creation as part of `CORE-01`, not as a later polish step, because the stablecoin state is meaningless if it points to an uninitialized mint.

### Likely file touch points

- `programs/sss-1/src/state.rs`
- `programs/sss-1/src/constants.rs`
- `programs/sss-1/src/instructions/initialize.rs`
- `programs/sss-1/src/lib.rs`
- `programs/sss-1/src/error.rs`
- `programs/sss-1/src/events.rs`
- `programs/sss-2/src/state.rs` if the shared schema must stay aligned this phase
- `sdk/core/src/pda.ts` and `sdk/core/src/types.ts` later, once the interface is frozen

## CORE-02: Shared Lifecycle Instructions

### What must be true

Phase 2 must make the shared lifecycle instruction set executable and stable:

- `initialize`
- `mint`
- `burn`
- `freeze_account`
- `thaw_account`
- `pause`
- `unpause`
- `update_minter`
- `update_roles`
- `transfer_authority`

The current code already includes all of these, plus `remove_minter`.

### Existing reusable code paths

- `programs/sss-1/src/instructions/mint.rs` already contains the quota accounting and Token-2022 `mint_to` CPI pattern.
- `programs/sss-1/src/instructions/burn.rs` already contains the Token-2022 `burn` CPI pattern.
- `programs/sss-1/src/instructions/freeze_account.rs` and `thaw_account.rs` already contain the PDA-signed freeze/thaw CPI pattern.
- `programs/sss-1/src/instructions/admin.rs` already contains the lifecycle admin surface and event scaffolding.
- `programs/sss-2/src/instructions/*` duplicates the same patterns and can be used as a parity checklist.

### Gaps to plan around

- `initialize` is still the biggest missing piece. It does not actually create or configure the mint or its Token-2022 extensions.
- `mint` does not currently validate the recipient token account as tightly as the other token flows.
- `update_minter` uses `init_or_reuse`, which appears non-standard for the declared Anchor 0.31 setup. Planning should assume this needs verification or replacement.
- `transfer_authority` is functionally unsafe until the PDA seed problem is fixed.
- `update_roles` does not emit a role-change event even though the docs position state changes as auditable.
- `burn` currently burns from the caller's own token account only. Planning should confirm that this matches the intended issuer workflow.

### Planning implications

- The planner should split initialization from lifecycle hardening. Initialization is a full work package on its own because it combines mint creation, extension setup, authority assignment, and state persistence.
- The planner should isolate the authority-transfer redesign because it changes account addressing assumptions across all instruction handlers.
- `remove_minter` is not called out in the phase context, but it already exists in code and docs. The planner should either include it explicitly or defer it intentionally.

### Likely file touch points

- `programs/sss-1/src/instructions/initialize.rs`
- `programs/sss-1/src/instructions/mint.rs`
- `programs/sss-1/src/instructions/burn.rs`
- `programs/sss-1/src/instructions/freeze_account.rs`
- `programs/sss-1/src/instructions/thaw_account.rs`
- `programs/sss-1/src/instructions/admin.rs`
- `programs/sss-1/src/lib.rs`
- `programs/sss-2/src/instructions/*.rs` if parity with the baseline must be kept in-phase

## CORE-03: Roles, Quotas, Pause Rules, And Explicit Errors

### What must be true

Phase 2 must enforce these rules on-chain:

- only authorized operators can call the relevant lifecycle instructions,
- minter quotas are enforced deterministically,
- paused state blocks the operations it is supposed to block,
- invalid calls fail with explicit Anchor errors instead of panics or opaque downstream failures.

### Existing reusable code paths

- Role checks already exist as account constraints in `burn.rs`, `freeze_account.rs`, `thaw_account.rs`, and the admin/compliance handlers.
- Pause checks already exist in `mint.rs` and `burn.rs`.
- Quota accounting already exists in both `sss-1` and `sss-2` mint handlers.
- Explicit error enums already exist in `programs/sss-1/src/error.rs` and `programs/sss-2/src/error.rs`.

### Gaps to plan around

- Unauthorized mint attempts currently fail by missing or mismatched `MinterConfig`, but the planner should decide whether that is enough or whether a clearer explicit role error is needed.
- The current pause model blocks mint and burn only. Planning should confirm whether freeze, thaw, and admin operations remain allowed while paused.
- Quota semantics are cumulative, not net-of-burn. This must be made explicit in tests and docs.
- Some invalid states still depend on downstream token-program failures because initialization does not yet establish the right mint authorities.
- `sss-2` already introduces compliance-only errors and roles. Planning should avoid mixing those into the shared Phase 2 acceptance criteria except where the config surface must remain compatible.

### Planning implications

- Negative-path behavior deserves its own executable plan or at least a dedicated test plan, not just incidental assertions inside happy-path tests.
- Explicit error coverage is part of the phase deliverable, not a later hardening task, because the phase context explicitly calls for clear Anchor errors.
- The planner should ensure each role has at least one happy-path test and one unauthorized-path test.

### Likely file touch points

- `programs/sss-1/src/error.rs`
- `programs/sss-1/src/instructions/mint.rs`
- `programs/sss-1/src/instructions/burn.rs`
- `programs/sss-1/src/instructions/admin.rs`
- `programs/sss-1/src/instructions/freeze_account.rs`
- `programs/sss-1/src/instructions/thaw_account.rs`
- `tests/sss-1.ts`
- `tests/helpers/index.ts`

## Implementation Constraints

- The repo has validation blockers outside the core program logic:
  - `Cargo.toml` includes `modules/*`, but `modules/sss-compliance` and `modules/sss-roles` are empty, so workspace-level cargo commands are currently suspect.
  - root `package.json` uses `yarn workspaces foreach`, but the codebase notes say the current local Yarn version is 1.x, which does not support that syntax.
  - `Anchor.toml` points `anchor test` at `tests/integration.ts`, which does not exist.
- Token-2022 mint bootstrap is mandatory work. The current state-only initialization is not enough to satisfy the phase goal.
- Anchor account constraints and PDA bumps are already the dominant pattern in the repo. Phase 2 should keep that pattern rather than inventing custom validation helpers.
- The stablecoin interface must stop moving after this phase because the roadmap says SDK, CLI, services, docs, and deployment all depend on it next.
- There is code duplication between `sss-1` and `sss-2`. Planning should assume every shared-surface change has either:
  - a deliberate parity update cost, or
  - an extraction cost into shared Rust code.

## Existing Reusable Code Paths

- `programs/sss-1/src/lib.rs` is the best current baseline for the Phase 2 instruction surface.
- `programs/sss-1/src/state.rs` and `programs/sss-1/src/error.rs` are the baseline shared account and error model.
- `programs/sss-1/src/instructions/mint.rs`, `burn.rs`, `freeze_account.rs`, and `thaw_account.rs` already implement the right CPI shape once initialization makes the mint real.
- `programs/sss-1/src/instructions/admin.rs` already defines the operator-management surface.
- `programs/sss-2/src/state.rs` is useful as a forward-compatibility check for how Phase 3 will extend the core state model.
- `sdk/core/src/pda.ts` is the existing downstream contract for PDA derivation.
- `tests/sss-1.ts` is already organized as the correct Phase 2 scenario matrix, even though it needs to be implemented.

## Likely File Touch Points

Primary Phase 2 files:

- `programs/sss-1/src/lib.rs`
- `programs/sss-1/src/state.rs`
- `programs/sss-1/src/constants.rs`
- `programs/sss-1/src/error.rs`
- `programs/sss-1/src/events.rs`
- `programs/sss-1/src/instructions/initialize.rs`
- `programs/sss-1/src/instructions/mint.rs`
- `programs/sss-1/src/instructions/burn.rs`
- `programs/sss-1/src/instructions/freeze_account.rs`
- `programs/sss-1/src/instructions/thaw_account.rs`
- `programs/sss-1/src/instructions/admin.rs`
- `tests/sss-1.ts`
- `tests/helpers/index.ts`

Files likely touched if the team keeps `sss-2` aligned during Phase 2:

- `programs/sss-2/src/lib.rs`
- `programs/sss-2/src/state.rs`
- `programs/sss-2/src/error.rs`
- `programs/sss-2/src/events.rs`
- `programs/sss-2/src/instructions/initialize.rs`
- `programs/sss-2/src/instructions/mint.rs`
- `programs/sss-2/src/instructions/burn.rs`
- `programs/sss-2/src/instructions/freeze_account.rs`
- `programs/sss-2/src/instructions/thaw_account.rs`
- `programs/sss-2/src/instructions/admin.rs`

Files that should stay mostly out of scope unless interface drift forces follow-up work:

- `programs/sss-2/src/instructions/compliance.rs`
- `programs/sss-transfer-hook/src/**`
- `sdk/core/src/stablecoin.ts`
- `sdk/core/src/compliance.ts`

## Validation Architecture

Phase 2 should be validated primarily through Anchor integration tests, not through the SDK.

### 1. Preflight validation

Before planner-level success criteria are declared, the phase needs a runnable test entry point. That means the plan should account for any minimal repo fixes required to make targeted Anchor tests executable.

### 2. Core happy-path suite

`tests/sss-1.ts` should become the main phase proof and cover:

- initialize creates the stablecoin PDA and a real Token-2022 mint
- default roles are assigned correctly
- `update_minter` creates or updates a minter config
- mint succeeds for an authorized minter
- freeze and thaw succeed for an authorized pauser
- burn succeeds for an authorized burner
- pause and unpause toggle the state correctly

### 3. Core negative-path suite

The same suite should verify explicit failures for:

- zero mint and zero burn amounts
- quota overflow
- mint while paused
- burn while paused
- unauthorized mint, freeze, thaw, burn, pause, and role-update attempts
- invalid authority-transfer behavior, or the corrected post-redesign behavior

### 4. Account-model assertions

Tests should assert more than transaction success:

- stablecoin PDA derivation matches the final seed scheme
- minter PDA derivation matches the final seed scheme
- stablecoin fields persist expected role and flag values
- mint authority and freeze authority are actually controlled by the stablecoin PDA
- Token-2022 extension state matches the intended Phase 2 contract surface

### 5. Scope guard

Phase 2 does not need to finish:

- transfer-hook blacklist enforcement
- seizure behavior
- fuzzing
- devnet proof
- SDK end-to-end ergonomics

Those belong to later phases unless the planner intentionally expands scope.

## Key Risks

- Authority-transfer bricking risk: the current stablecoin PDA seed strategy makes `transfer_authority` unsafe.
- False-complete initialization risk: storing a mint pubkey without creating a correctly configured Token-2022 mint will make later CPI paths fail in confusing ways.
- Scope-bleed risk: trying to fully wire SSS-2 transfer-hook behavior in Phase 2 will collapse the boundary with Phase 3.
- Interface-drift risk: `StablecoinConfig` and PDA derivation logic already exist in Rust, tests, docs, and SDK code; any uncoordinated change will ripple.
- Validation-blind-spot risk: current tests are TODOs, the SDK is stubbed, and repo-level test tooling has gaps, so green signals can be misleading unless Phase 2 adds direct integration coverage.
- Duplicate-core risk: if `sss-1` and `sss-2` are both edited without a clear ownership model, the shared lifecycle surface will drift again before Phase 3 starts.

## Recommended Plan Shape

The phase should likely break into three or four executable plans:

1. Lock the shared account model and PDA strategy.
2. Implement real Token-2022 mint initialization and finalize the shared config surface.
3. Harden lifecycle/admin instruction behavior, including authority transfer and explicit errors.
4. Turn `tests/sss-1.ts` into the authoritative validation suite for `CORE-01` through `CORE-03`.

If the team decides to keep `sss-2` aligned in the same phase, add a separate parity plan instead of silently folding that work into the core-program plan.
