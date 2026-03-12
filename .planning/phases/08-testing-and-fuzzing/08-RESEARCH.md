# Phase 8: Testing And Fuzzing - Research

**Researched:** 2026-03-12  
**Scope:** Planning inputs for `TST-01`, `TST-02`, `TST-03`  
**Research question:** What do we need to know to plan this phase well?

## What Is Locked Already

From roadmap/state and prior phase outputs:
- Phase goal is fixed: confidence layer across unit, integration, fuzz, and devnet/stress verification.
- Requirement contract is fixed: `TST-01`, `TST-02`, `TST-03`.
- Dependency is Phase 7 outputs (services + cross-service integration path).
- Existing verification notes show a Phase 7 automation mismatch: `@stbr/sss-indexer` and `@stbr/sss-webhook` have real tests in `src/__tests__`, but workspace `test` scripts still return placeholder success.
- Planning must treat deterministic, executable verification commands as first-class deliverables, not follow-up cleanup.

## Requirement Mapping (TST-01 / TST-02 / TST-03)

`TST-01` - Unit and integration coverage for SSS-1 and SSS-2 flows:
- Reusable now:
  - `tests/sss-1.ts` and `tests/sss-2.ts` already cover major lifecycle/compliance flows with live Anchor RPC paths.
  - `tests/helpers/index.ts` already centralizes PDA derivation, airdrop, ATA setup, transfer-hook transfer, and Anchor error assertions.
  - `tests/integration.ts` already proves cross-service `request_id` continuity.
  - `sdk/core/tests/*.test.ts` and `services/*/src/__tests__/*.test.ts` already provide broad off-chain contract coverage.
- Needed to satisfy phase intent:
  - Add instruction-level unit tests (Rust) for high-value pure/state transition logic where possible.
  - Expand negative-path integration scenarios to close edge-case gaps across SSS-1/SSS-2 instructions.
  - Normalize service workspace test scripts so validation commands represent real execution.

`TST-02` - Trident fuzz coverage for high-risk instruction paths:
- Reusable now:
  - `Trident.toml` and `trident-tests/` workspace exist.
  - `trident-tests/fuzz_0` crate already depends on `trident-fuzz` and `sss-1`.
- Hard gap:
  - `trident-tests/fuzz_0/src/bin/fuzz_0.rs` is still a scaffold with no instruction corpus, no invariants, and no running fuzz campaign.
- Needed:
  - Implement one or more real fuzz binaries with scenario generators and invariants tied to the most risk-prone on-chain paths.

`TST-03` - Devnet stress or proof flows for shipped presets:
- Reusable now:
  - CLI surface exists (`./scripts/sss-token`) with init/lifecycle/compliance commands needed for operator-style proof flows.
  - Preset docs exist (`docs/SSS-1.md`, `docs/SSS-2.md`).
- Hard gaps:
  - No devnet verification script/test harness exists yet.
  - Anchor/devnet program IDs remain placeholders in `Anchor.toml` and docs.
  - No stress runner or reproducible evidence artifact path is defined.
- Needed:
  - Add deterministic devnet proof scripts and artifact capture contract per preset (SSS-1 and SSS-2).

## Current Reusable Test Assets

### On-chain integration assets
- `tests/sss-1.ts` (8 integration scenarios): initialize, minter quota, mint, freeze/thaw, burn/roles, pause/unpause + mint guards, authority transfer, PDA stability.
- `tests/sss-2.ts` (12 integration scenarios): compliance-enabled initialize, extension gating, role rotation, mint setup, treasury rotation, blacklist add/remove/check behavior, transfer-hook sender/recipient denial, seizure preconditions, successful seizure, SSS-1 compliance gating.
- `tests/helpers/index.ts`: deterministic helper primitives reused by both suites.

### Off-chain/system integration assets
- `tests/integration.ts`: authoritative cross-service E2E trace spanning issuance -> indexer projection -> webhook delivery with stable `request_id` linkage.
- `sdk/core/tests/`: substantial CLI/SDK contract suite already present.
- `services/mint-burn`, `services/indexer`, `services/compliance`, `services/webhook`: each has `src/__tests__` coverage.

### Fuzzing assets
- `Trident.toml` fuzz program declarations for SSS-1, SSS-2, and transfer-hook program IDs.
- `trident-tests/` Rust workspace scaffold with `fuzz_0` crate.

## Hard Gaps To Plan Explicitly

1. No active Trident fuzz implementation exists yet (scaffold only).
2. No Rust unit-test layer exists in programs (`#[cfg(test)]` / `#[test]` absent), so current coverage is mostly integration-level.
3. Devnet proof/stress path is not implemented and has no artifact contract.
4. Service test-command drift (`indexer`, `webhook`) can create false confidence in phase gates unless corrected in this phase.
5. Current planning/codebase docs about testing are partially stale versus actual repository state; this phase should refresh testing reality as part of closeout.

## High-Risk Instruction Paths (Fuzz Priority)

Use these as first-pass fuzz targets because they combine role gates, PDA/account constraints, and Token-2022 CPI state transitions:
- SSS-1 `mint` and `burn`: quota accounting, paused state, token account validity, frozen-state behavior.
- SSS-1/SSS-2 admin flows: `update_minter`, `update_roles`, `transfer_authority` invariants and no-op rejection.
- SSS-2 `add_to_blacklist` / `remove_from_blacklist`: reason normalization/length boundaries, PDA lifecycle semantics.
- SSS-2 `seize`: coupled preconditions (treasury set, blacklisted owner, frozen account), delegate burn+mint preservation semantics.
- Transfer hook `transfer_hook`: sender/recipient blacklist denial invariants and allow-path safety when blacklist PDAs are absent.

## Recommended Plan Decomposition (Multiple Plan Files)

Use 5 plans so verification infrastructure lands before deeper expansion:

1. `08-01-PLAN.md` - Validation Baseline And Command Truth
- Scope: fix and lock the test-command contract used by this phase.
- Must include:
  - normalize workspace `test` scripts where real suites already exist;
  - define quick/full verification commands for this phase;
  - add/refresh phase validation file (`08-VALIDATION.md`) with Nyquist compliance contract.
- Requirements: `TST-01` (foundation), `TST-03` (devnet/stress command lane setup).

2. `08-02-PLAN.md` - SSS-1/SSS-2 Unit + Integration Expansion
- Scope: deepen on-chain coverage for core and edge behavior.
- Must include:
  - targeted additions to `tests/sss-1.ts` and `tests/sss-2.ts` for missed negative/edge paths;
  - Rust unit tests for high-value local logic where practical.
- Requirements: `TST-01`.

3. `08-03-PLAN.md` - Cross-Layer Regression Matrix
- Scope: ensure SDK/CLI/services plus on-chain tests compose into one deterministic confidence story.
- Must include:
  - expand integration assertions around preset behavior consistency;
  - ensure cross-layer regression command set is stable and executable in CI/local.
- Requirements: `TST-01`.

4. `08-04-PLAN.md` - Trident Fuzz Harness Implementation
- Scope: build real fuzz targets and invariants for high-risk paths.
- Must include:
  - replace scaffold `fuzz_0.rs` with executable fuzz loops;
  - add at least one additional fuzz binary if separating SSS-1/SSS-2 paths improves signal;
  - encode explicit invariants (no unauthorized state mutation, supply consistency where expected, no panic/abort paths).
- Requirements: `TST-02`.

5. `08-05-PLAN.md` - Devnet/Stress Proof For Shipped Presets
- Scope: reproducible preset verification on devnet-oriented flow.
- Must include:
  - scriptable proof flow for SSS-1 and SSS-2 using real CLI commands;
  - artifact capture contract (command logs, signatures, state snapshots);
  - stress profile (repeat/multi-op run) with deterministic pass/fail criteria.
- Requirements: `TST-03`.

## Validation Architecture

Nyquist goal for Phase 8: every requirement (`TST-01..03`) must map to executable commands, concrete evidence artifacts, and a clear fast-loop vs full-loop cadence.

### Command Baseline

Quick gate (task-level):
```bash
yarn lint
yarn test:sss1
yarn test:sss2
yarn test:integration
yarn test:sdk
yarn workspace @stbr/sss-mint-burn test
yarn workspace @stbr/sss-compliance test
yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'
yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'
cargo check --manifest-path trident-tests/Cargo.toml -p fuzz_0
```

Full gate (phase signoff candidate):
```bash
yarn lint
yarn build
yarn test:sss1
yarn test:sss2
yarn test:integration
yarn test:sdk
yarn workspace @stbr/sss-mint-burn test
yarn workspace @stbr/sss-compliance test
yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'
yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'
cargo test --manifest-path trident-tests/Cargo.toml
```

Devnet/stress proof gate (TST-03 evidence lane):
```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
# Plus phase-owned preset proof scripts to be added in 08-05, executed against devnet and archived as artifacts.
```

### Requirement-Mapped Verification Strategy

`TST-01`:
- On-chain: `tests/sss-1.ts`, `tests/sss-2.ts` plus added edge scenarios.
- Cross-layer: `tests/integration.ts` and workspace SDK/service tests.
- Evidence: passing command output + explicit scenario matrix in phase verification doc.

`TST-02`:
- Fuzz binaries in `trident-tests/fuzz_*/src/bin/*.rs` execute deterministic corpus/invariant runs.
- Evidence: fuzz run summaries, crash-free run metadata, and documented invariant set.

`TST-03`:
- Preset proof scripts execute SSS-1 and SSS-2 operator flows on devnet.
- Evidence: transaction signatures, CLI output captures, and pre/post state checks per preset.

### Nyquist Planning Rules (Must Apply To Every 08-XX Plan)

1. Every task must declare one automated verify command before implementation starts.
2. No plan can be marked complete if any requirement-mapped command is placeholder/no-op.
3. Fuzz tasks must define invariants first, generator second, run command third.
4. Devnet/stress tasks must define artifact paths and retention before first execution.
5. At least one quick gate command must run after each merged task chunk; full gate must run at wave end.
6. Phase signoff requires proof that `TST-01`, `TST-02`, and `TST-03` each have executable evidence, not just planned files.

## Open Decisions To Resolve During Planning

- Whether to keep a single `fuzz_0` target or split into dedicated SSS-1 / SSS-2 / transfer-hook binaries.
- Minimum acceptable fuzz runtime budget per CI/local tier (smoke vs deep campaign).
- Devnet stress profile shape: repeated deterministic scenario loop vs concurrency load model.
- Whether to migrate direct mocha invocations for indexer/webhook into workspace `test` scripts in 08-01 or treat as pre-phase hygiene.

## Research Verdict

Phase 8 is ready to plan with high confidence if planning starts by locking verification command truth and closes existing automation drift first. The codebase already has substantial integration assets for `TST-01`; the critical missing work is active Trident fuzzing (`TST-02`) and reproducible devnet/stress proof lanes (`TST-03`).

## RESEARCH COMPLETE
