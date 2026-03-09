# Structure Map

## Top-Level Layout

This repository is a monorepo with Rust, TypeScript, docs, and planning assets side by side. The top-level directories divide cleanly by responsibility:

- `programs/`: Anchor programs for the stablecoin standards and transfer hook.
- `sdk/`: TypeScript SDK and CLI package.
- `services/`: Off-chain service workspaces.
- `tests/`: Anchor integration tests and shared helpers.
- `docs/`: human-readable standard and architecture references.
- `modules/`: reserved Rust workspace members for reusable modules.
- `trident-tests/`: fuzz-testing workspace.
- `.planning/`: generated codebase mapping and planning artifacts.
- `scripts/`: repository support scripts.
- `.github/`: CI and workflow definitions.

## Root Files

The root files establish how the repository is meant to be built and navigated:
- `AGENTS.md` documents repo-specific working rules and preferred commands.
- `README.md` is the high-level product overview.
- `package.json` is the JavaScript workspace root and the main operator entrypoint.
- `Cargo.toml` is the Rust workspace root.
- `Anchor.toml` binds program IDs, provider settings, and the test script.
- `Trident.toml` enables fuzzing configuration.
- `docker-compose.yml` is the intended entrypoint for service orchestration.

## `programs/`

`programs/` contains three standalone Anchor crates:

- `programs/sss-1/`
  - `Cargo.toml`: crate metadata and Anchor dependencies.
  - `src/lib.rs`: public instruction surface for the minimal preset.
  - `src/state.rs`: `Stablecoin` and `MinterConfig` PDA account layouts.
  - `src/constants.rs`: `stablecoin` and `minter` seed bytes.
  - `src/error.rs`: program-specific error codes.
  - `src/events.rs`: emitted audit events.
  - `src/instructions/`: instruction handlers split into `initialize.rs`, `mint.rs`, `burn.rs`, `freeze_account.rs`, `thaw_account.rs`, and `admin.rs`.

- `programs/sss-2/`
  - Mirrors the SSS-1 shape but adds compliance-specific state and handlers.
  - `src/state.rs` includes `BlacklistEntry` plus `blacklister` and `seizer` roles.
  - `src/instructions/compliance.rs` adds blacklist and seizure flows.

- `programs/sss-transfer-hook/`
  - `src/lib.rs`: hook program entrypoints.
  - `src/state.rs`: hook-side `BlacklistEntry` view for PDA lookup.
  - `src/constants.rs`: `blacklist` and `extra-account-metas` seed bytes.
  - `src/instructions/initialize.rs`: intended setup for the extra account meta list.
  - `src/instructions/transfer_hook.rs`: transfer-time blacklist enforcement.

Within each program crate, the consistent layout makes navigation predictable: read `src/lib.rs`, then the matching `src/instructions/*.rs`, then `src/state.rs`.

## `sdk/`

`sdk/` currently contains one package:

- `sdk/core/package.json`: package metadata for `@stbr/sss-token` and the `sss-token` CLI binary.
- `sdk/core/tsconfig.json`: local TypeScript config.
- `sdk/core/src/index.ts`: public export barrel.
- `sdk/core/src/stablecoin.ts`: main SDK façade for initialization and token management.
- `sdk/core/src/compliance.ts`: SSS-2-only wrapper for blacklist and seizure operations.
- `sdk/core/src/presets.ts`: preset definitions for `SSS_1` and `SSS_2`.
- `sdk/core/src/pda.ts`: PDA derivation helpers mirrored from the Rust programs.
- `sdk/core/src/types.ts`: public SDK types.

The package shape suggests both library and CLI usage, but `dist/cli.js` is declared in `sdk/core/package.json` without a matching source file in `sdk/core/src/` yet. That is useful context for anyone expecting a finished CLI.

## `services/`

`services/` contains four TypeScript workspace packages:

- `services/mint-burn/`
- `services/compliance/`
- `services/indexer/`
- `services/webhook/`

Each service currently has the same minimal structure:
- `package.json` with `build`, `dev`, `test`, `lint`, and `format` scripts.
- `src/` directory present but empty.

Structurally, the service packages are placeholders. The repo has already named the bounded contexts, but no service code has been added yet.

## `tests/`

The conventional integration test layout is simple:

- `tests/helpers/index.ts`: helper functions like `airdrop`, `sleep`, and `newKeypair`.
- `tests/sss-1.ts`: planned end-to-end flow for the minimal standard.
- `tests/sss-2.ts`: planned end-to-end flow for the compliant standard.

The test files currently describe scenarios in TODO form rather than executing them. They are still useful because they reveal intended behavior and operator workflows.

## `docs/`

`docs/` is the human-facing reference layer:

- `docs/ARCHITECTURE.md`: high-level system architecture narrative.
- `docs/SSS-1.md`: standard-specific reference for the minimal token.
- `docs/SSS-2.md`: standard-specific reference for the compliant token.

This directory is small, but it is where architectural intent is documented outside the code.

## `modules/`

`modules/` is included in the Rust workspace via `Cargo.toml`, but it is not populated with source files yet:

- `modules/sss-compliance/src/`
- `modules/sss-roles/src/`

These directories matter structurally because they show the intended future extraction of reusable Rust components from the programs.

## `trident-tests/`

`trident-tests/` is a separate Rust workspace dedicated to fuzzing:

- `trident-tests/Cargo.toml`: workspace root.
- `trident-tests/fuzz_0/Cargo.toml`: first fuzz target package.
- `trident-tests/fuzz_0/src/bin/fuzz_0.rs`: scaffolded Trident entrypoint for `sss-1`.

Like the service layer, this area is structurally present before it is fully implemented.

## What Is Missing On Purpose

A few expected paths are referenced but not present yet:
- `sdk/core/src/stablecoin.ts` comments refer to generated IDLs under `target/idl/`, but those files are not committed here.
- `sdk/core/package.json` declares `dist/cli.js`, but no CLI source file exists under `sdk/core/src/`.
- The service packages expect `src/index.ts` for `dev`, but their `src/` folders are empty.

These absences are part of the current structure, not mistakes in this map. They show where the repo intends to grow.

## Fast Navigation Guide

If you need to orient quickly:
- Start at `programs/` for the real implementation.
- Use `sdk/core/src/` to understand the planned client API.
- Use `tests/` to understand intended user flows.
- Treat `services/`, `modules/`, and `trident-tests/` as reserved extension points.

## Bottom Line

The repository structure is clean and deliberate. The dense, active code lives in `programs/`, while the surrounding TypeScript packages and auxiliary Rust workspaces already define future boundaries even where implementation has not caught up.
