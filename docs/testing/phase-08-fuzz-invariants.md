# Phase 08 Fuzz Invariants and Run Policy

## Scope

This document defines executable fuzz invariants and evidence policy for Phase 08 Plan 04 (`TST-02`).
The harnesses are implemented in:

- `trident-tests/fuzz_0/src/bin/fuzz_0.rs`
- `trident-tests/fuzz_0/src/bin/fuzz_sss1.rs`
- `trident-tests/fuzz_0/src/bin/fuzz_sss2.rs`
- `trident-tests/fuzz_0/src/invariants.rs`

## Invariant Definitions

### Invariant: Unauthorized mutation is rejected

- Unauthorized admin/compliance mutations must return an error path.
- Unauthorized attempts are tracked and must never mutate modeled state.
- Assertion source: `InvariantModel::assert_no_unauthorized_mutation_success`.

### Invariant: Supply and account balances remain consistent

- `total_supply` must always equal the sum of tracked account balances.
- Mint/burn/transfer/seize model operations use checked arithmetic.
- Assertion source: `InvariantModel::assert_supply_consistency`.

### Invariant: Panic-free execution

- Each generated operation executes under `catch_unwind`.
- Any panic is treated as invariant failure.
- Assertion source: harness-level panic-free assertions in all binaries.

### Invariant: Transfer-hook rejection path is exercised (SSS-2 lane)

- The SSS-2 campaign must exercise at least one rejection lane:
  - blacklist-based transfer denial, or
  - unauthorized compliance mutation rejection.
- Assertion source: post-iteration assertion in `fuzz_sss2.rs`.

## Command Tiers

### Smoke (CI-safe, deterministic)

- Baseline compile check:
  - `cargo check --manifest-path trident-tests/Cargo.toml -p fuzz_0`
- Workspace smoke test:
  - `cargo test --manifest-path trident-tests/Cargo.toml`
- Optional direct binary runs:
  - `cargo run --manifest-path trident-tests/Cargo.toml -p fuzz_0 --bin fuzz_0`
  - `cargo run --manifest-path trident-tests/Cargo.toml -p fuzz_0 --bin fuzz_sss1`
  - `cargo run --manifest-path trident-tests/Cargo.toml -p fuzz_0 --bin fuzz_sss2`

Default smoke budgets:

- `fuzz_0`: `SSS_FUZZ_SMOKE_ITERS=64`, `SSS_FUZZ_SMOKE_OPS=128`
- `fuzz_sss1`: `SSS1_FUZZ_SMOKE_ITERS=64`, `SSS1_FUZZ_SMOKE_OPS=96`
- `fuzz_sss2`: `SSS2_FUZZ_SMOKE_ITERS=64`, `SSS2_FUZZ_SMOKE_OPS=128`

### Deep (manual/long-running campaign)

Use the same binaries with higher iteration budgets:

- `SSS_FUZZ_SMOKE_ITERS=2000 SSS_FUZZ_SMOKE_OPS=512`
- `SSS1_FUZZ_SMOKE_ITERS=2000 SSS1_FUZZ_SMOKE_OPS=384`
- `SSS2_FUZZ_SMOKE_ITERS=2000 SSS2_FUZZ_SMOKE_OPS=512`

Run form:

- `cargo run --manifest-path trident-tests/Cargo.toml -p fuzz_0 --bin <target>`

Recommended runtime targets:

- Smoke: under 2 minutes total in CI.
- Deep: 20-60 minutes local/nightly depending on hardware.

## Evidence Contract

Evidence required to claim `TST-02`:

- Passing output of:
  - `cargo check --manifest-path trident-tests/Cargo.toml -p fuzz_0`
  - `cargo test --manifest-path trident-tests/Cargo.toml`
- Command log showing which binary/budget ran.
- Exit status `0` for each run.
- Captured stdout confirming completed iteration counts.

Suggested artifact paths:

- `.planning/phases/08-testing-and-fuzzing/evidence/fuzz-smoke-<date>.log`
- `.planning/phases/08-testing-and-fuzzing/evidence/fuzz-deep-<date>.log`

## TST-02 Traceability

- Requirement: `TST-02`
- Proof object: executable deterministic fuzz harnesses + invariant assertions + run policy.
