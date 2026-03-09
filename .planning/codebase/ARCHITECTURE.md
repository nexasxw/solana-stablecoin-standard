# Architecture Map

## Current Shape

This repository is a layered monorepo centered on three Anchor programs in `programs/` and a TypeScript workspace around them. The implemented core is on-chain Rust. The SDK, service, and test layers exist, but large parts of those layers are still scaffolded.

The top-level orchestration lives in `package.json`, `Cargo.toml`, `Anchor.toml`, and `Trident.toml`:
- `package.json` defines the Yarn workspaces for `sdk/core` and `services/*`, plus the main build, lint, format, and Anchor test commands.
- `Cargo.toml` defines the Rust workspace for `programs/*` and `modules/*` and centralizes Anchor and SPL dependencies.
- `Anchor.toml` binds localnet and devnet program IDs and points `anchor test` at the TypeScript integration suite in `tests/`.
- `Trident.toml` and `trident-tests/` reserve a fuzzing layer for later hardening work.

## Layer Model

The codebase resolves into five practical layers:

1. Workspace and tooling layer: `package.json`, `Cargo.toml`, `Anchor.toml`, `Trident.toml`, `docker-compose.yml`.
2. On-chain standards layer: `programs/sss-1/`, `programs/sss-2/`, and `programs/sss-transfer-hook/`.
3. Client abstraction layer: `sdk/core/src/`.
4. Off-chain integration layer: `services/*/`.
5. Verification and reference layer: `tests/`, `trident-tests/`, and `docs/`.

The dependency direction is mostly top-down. The TypeScript SDK and tests depend on the on-chain programs conceptually, while the Rust programs do not depend on the TypeScript packages.

## On-Chain Boundaries

Each program follows the same internal pattern:
- `src/lib.rs` is the public entrypoint and dispatch table.
- `src/instructions/*.rs` contains one instruction module per use case.
- `src/state.rs` defines PDA-backed account layouts and config structs.
- `src/constants.rs` holds PDA seed bytes.
- `src/events.rs` and `src/error.rs` define the program's event and error surface.

`programs/sss-1/src/lib.rs` is the minimal stablecoin preset. It exposes initialization, mint, burn, freeze, thaw, pause, minter management, role updates, and authority transfer. The program state in `programs/sss-1/src/state.rs` is anchored by a `Stablecoin` PDA and optional `MinterConfig` PDAs.

`programs/sss-2/src/lib.rs` extends the same baseline with blacklist and seizure instructions. Its `Stablecoin` account in `programs/sss-2/src/state.rs` adds `blacklister` and `seizer` roles plus `BlacklistEntry` PDAs.

`programs/sss-transfer-hook/src/lib.rs` is a separate enforcement program. It does not mint or manage roles. Its job is to validate transfers for SSS-2 mints by resolving extra account metas and rejecting blacklisted senders or recipients.

## Architectural Patterns

The main architectural pattern is thin entrypoints over instruction modules. `programs/sss-1/src/lib.rs`, `programs/sss-2/src/lib.rs`, and `programs/sss-transfer-hook/src/lib.rs` mostly forward into handlers under `src/instructions/`. That keeps account validation and business logic close to each instruction rather than in one large program file.

The second pattern is PDA-centric authority. The stablecoin PDA derived from `b"stablecoin"` in `programs/sss-1/src/constants.rs` and `programs/sss-2/src/constants.rs` becomes the signing authority for CPI calls into Token-2022. Minting in `programs/sss-1/src/instructions/mint.rs` and `programs/sss-2/src/instructions/mint.rs`, freezing in `programs/sss-1/src/instructions/freeze_account.rs`, thawing in `programs/sss-1/src/instructions/thaw_account.rs`, and seizure in `programs/sss-2/src/instructions/compliance.rs` all rely on signer seeds for that PDA.

The third pattern is capability-by-preset. `sdk/core/src/presets.ts` models SSS-1 and SSS-2 as configuration presets. That mirrors the program split: a caller chooses the minimal path or the compliance path, rather than composing arbitrary modules at runtime.

## Control Flow

Initialization starts at `programs/sss-1/src/instructions/initialize.rs` or `programs/sss-2/src/instructions/initialize.rs`. The authority signer creates the `Stablecoin` PDA, assigns default operational roles, and records which extensions should be active. Both handlers still contain TODOs for the actual Token-2022 mint creation CPI, so the architectural intent is present but the mint bootstrap path is not yet complete.

Minting flows through `programs/sss-1/src/instructions/mint.rs` or `programs/sss-2/src/instructions/mint.rs`. The instruction loads `Stablecoin` and `MinterConfig`, checks the global `paused` flag, enforces quota if present, then issues a Token-2022 `mint_to` CPI signed by the stablecoin PDA.

Burning, freezing, and thawing follow the same pattern. The instruction verifies an explicit operational role from the `Stablecoin` account, then performs a Token-2022 CPI from the relevant module in `programs/sss-1/src/instructions/` or `programs/sss-2/src/instructions/`.

SSS-2 adds a compliance branch. `programs/sss-2/src/instructions/compliance.rs` creates and closes `BlacklistEntry` PDAs and performs seizure through `transfer_checked`, again using the stablecoin PDA as authority. This path only makes sense when the permanent delegate and transfer hook flags are enabled.

Transfer enforcement is split across programs by design. The SSS-2 initializer is expected to point the mint at `programs/sss-transfer-hook/`. At transfer time, Token-2022 invokes `programs/sss-transfer-hook/src/instructions/transfer_hook.rs`, which checks whether sender or recipient blacklist PDAs exist and rejects the transfer if either does.

## Data Flow

The main state graph is small and explicit:
- `Stablecoin` PDA stores mint address, role assignments, global pause state, and feature flags.
- `MinterConfig` PDA stores quota and minted amount per minter.
- `BlacklistEntry` PDA stores compliance decisions for SSS-2.
- `extra_account_meta_list` in `programs/sss-transfer-hook/src/instructions/initialize.rs` is the lookup table the hook needs at transfer time.

The PDA naming is mirrored in the client layer. `sdk/core/src/pda.ts` derives the same stablecoin, minter, blacklist, and extra-account-meta addresses. That keeps the client and program address model aligned without hardcoding account addresses in callers.

## SDK Boundary

`sdk/core/src/index.ts` is the package entrypoint. `sdk/core/src/stablecoin.ts` is the main façade, `sdk/core/src/compliance.ts` wraps SSS-2-only operations, `sdk/core/src/presets.ts` carries preset defaults, `sdk/core/src/pda.ts` mirrors on-chain address derivation, and `sdk/core/src/types.ts` defines the public config and state types.

The SDK is intentionally shaped like a production client, but today it is only partially wired. `sdk/core/src/stablecoin.ts` still uses `const program = {} as Program`, leaves IDL imports commented out, and throws `Not yet implemented` for most operations. Architecturally, it is a boundary layer over Anchor programs; operationally, it is a scaffold waiting for generated IDLs and transaction assembly.

## Off-Chain Boundary

The service layer exists as workspace scaffolding, not a live implementation. `services/mint-burn/package.json`, `services/compliance/package.json`, `services/indexer/package.json`, and `services/webhook/package.json` define build and dev scripts, but their `src/` directories are empty. The same is true for `modules/sss-compliance/src` and `modules/sss-roles/src`.

That means the current architecture is program-first. Off-chain coordination, indexing, webhook delivery, and modular Rust support packages are planned boundaries, not active ones.

## Verification Boundary

`tests/sss-1.ts` and `tests/sss-2.ts` describe the intended end-to-end flows for each standard. `tests/helpers/index.ts` provides shared Solana utilities such as airdrops and keypair generation. These tests define the expected control flow but are mostly TODO placeholders today.

`trident-tests/fuzz_0/src/bin/fuzz_0.rs` adds a second verification boundary for fuzzing, but it is also a placeholder. The architecture already reserves conventional integration testing and fuzz testing lanes even though both are incomplete.

## Practical Reading Order

For a new engineer, the fastest path through the architecture is:
- `package.json` and `Anchor.toml` to understand build and test entrypoints.
- `programs/sss-1/src/lib.rs` and `programs/sss-2/src/lib.rs` to see the instruction surface.
- `programs/sss-1/src/state.rs` and `programs/sss-2/src/state.rs` to understand the account model.
- `programs/sss-2/src/instructions/compliance.rs` and `programs/sss-transfer-hook/src/instructions/transfer_hook.rs` to understand the compliance-specific control flow.
- `sdk/core/src/stablecoin.ts` and `sdk/core/src/compliance.ts` to see how the TypeScript boundary intends to wrap the programs.

## Bottom Line

The repository is organized around a solid Anchor program core with clear module boundaries and consistent PDA patterns. The architectural center of gravity is already visible in `programs/`, while `sdk/core/`, `services/`, `tests/`, `modules/`, and `trident-tests/` show the planned outer layers that still need implementation depth.
