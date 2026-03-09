# Technology Stack Map

## Scope
- This repository is a mixed Rust and TypeScript monorepo centered on Solana stablecoin programs, with the primary entry points defined in `Cargo.toml`, `package.json`, `Anchor.toml`, and `docker-compose.yml`.
- The implemented code lives mainly in `programs/`, `sdk/core/src/`, and `tests/`. The `services/*/src/` directories exist, but they are empty in the current tree.

## Languages And Runtimes
| Area | Stack | Evidence | Current state |
| --- | --- | --- | --- |
| On-chain programs | Rust 2021, Anchor, Solana BPF programs | `programs/sss-1/Cargo.toml`, `programs/sss-2/Cargo.toml`, `programs/sss-transfer-hook/Cargo.toml` | Implemented |
| Token integration | Anchor SPL token interface, Token-2022 extensions | `Cargo.toml`, `programs/sss-1/src/instructions/*.rs`, `programs/sss-2/src/instructions/*.rs` | Partly implemented, some init CPI work still TODO |
| SDK | TypeScript 5, CommonJS, ES2020 target | `sdk/core/package.json`, `sdk/core/tsconfig.json` | Implemented skeleton |
| Test harness | TypeScript, Mocha, Chai, ts-mocha, Anchor test runner | `package.json`, `tests/sss-1.ts`, `tests/sss-2.ts` | Present but largely TODO |
| Backend services | Node.js-oriented TypeScript services | `services/*/package.json` | Scaffolded only |
| Fuzzing | Rust, Trident fuzzing | `Trident.toml`, `trident-tests/fuzz_0/Cargo.toml` | Placeholder |

## Workspace And Package Management
- `package.json` uses Yarn workspaces for `sdk/core` and `services/*`.
- There is no committed `yarn.lock`, `package-lock.json`, or `pnpm-lock.yaml` in the repo root, so package-manager intent is Yarn but dependency resolution is not pinned by a lockfile in the current tree.
- `Cargo.toml` defines a Rust workspace over `programs/*` and `modules/*`.
- The `modules/` directory currently has no Rust crates, so the second workspace glob is reserved capacity rather than an active package set.

## On-Chain Framework Stack
- `Cargo.toml` pins `anchor-lang = 0.31.1` and `anchor-spl = 0.31.1` at the workspace level.
- `Cargo.toml` also pulls `spl-token-2022 = 4.0.0`, `spl-transfer-hook-interface = 0.7.0`, and `spl-tlv-account-resolution = 0.7.0`.
- `programs/sss-1/src/lib.rs` and `programs/sss-2/src/lib.rs` expose Anchor programs with PDA-managed stablecoin state, minter quotas, and role-based admin flows.
- `programs/sss-transfer-hook/src/lib.rs` is a separate Anchor program dedicated to Token-2022 transfer-hook enforcement.
- The instruction handlers use `anchor_spl::token_interface` CPIs for `mint_to`, `burn`, `freeze_account`, `thaw_account`, and `transfer_checked` in `programs/sss-1/src/instructions/` and `programs/sss-2/src/instructions/`.

## TypeScript SDK And CLI Stack
- `sdk/core/package.json` defines the package `@stbr/sss-token` and builds it with plain `tsc`.
- `sdk/core/src/index.ts` re-exports the SDK surface from `stablecoin.ts`, `compliance.ts`, `pda.ts`, `presets.ts`, and `types.ts`.
- `sdk/core/src/stablecoin.ts` uses `@coral-xyz/anchor` and `@solana/web3.js` for provider and account interactions.
- `sdk/core/package.json` declares a CLI binary at `dist/cli.js`, but there is no matching CLI source file under `sdk/core/src/` in the current repository snapshot.
- `sdk/core/src/stablecoin.ts` contains TODOs for generated IDLs from `target/idl/*.json`, so the SDK is not fully wired to compiled Anchor artifacts yet.

## Node/TypeScript Tooling
- Root TypeScript defaults are configured in `tsconfig.json` with `target: ES2020`, `module: commonjs`, `strict: true`, and declaration output enabled.
- `sdk/core/tsconfig.json` narrows compilation to `sdk/core/src/**/*.ts` and emits into `sdk/core/dist`.
- `.eslintrc.json` uses `@typescript-eslint/parser` and `plugin:@typescript-eslint/recommended`.
- `.prettierrc` enforces 2-space indentation, semicolons, double quotes, trailing commas, and `printWidth: 100`.
- Root scripts in `package.json` use `yarn workspaces foreach` to run `build`, `test`, and `clean` across workspaces.

## Build And Test Toolchain
- Root builds use `anchor build` for programs and `yarn build` for TypeScript workspaces, as declared in `package.json`.
- Root test entry points are `anchor test`, `yarn test:sss1`, `yarn test:sss2`, and `yarn test:sdk`.
- `tests/sss-1.ts` and `tests/sss-2.ts` use `anchor.AnchorProvider.env()` and helper utilities from `tests/helpers/index.ts`.
- `Trident.toml` and `trident-tests/fuzz_0/src/bin/fuzz_0.rs` show an intended fuzzing path, but the actual fuzz target is still a stub.
- `package.json` declares `test:integration` for `tests/integration.ts`, but that file does not exist in the current tree.

## CI And Version Pinning
- `.github/workflows/test.yml` pins Node.js `20.x` and `22.x` in CI.
- The same workflow installs Rust `1.82`, Solana CLI `v1.18.0`, and Anchor `0.31.1` via `avm`.
- Because there is no `rust-toolchain.toml` or `.nvmrc`, CI is the clearest source of runtime version intent today.

## Infrastructure And Service Stack
- `docker-compose.yml` defines `mint-burn`, `indexer`, `compliance`, and `webhook` application services plus `postgres` and `redis`.
- The app services are expected to build from `services/*`, but no `Dockerfile`, `tsconfig.json`, or implementation files exist under those service directories yet.
- `docker-compose.yml` uses `postgres:16-alpine` and `redis:7-alpine` as the only fully specified runtime containers in the current repo.

## Practical Read On Maturity
- The Rust programs and PDA/state model are the most concrete part of the codebase today.
- The TypeScript SDK is a design skeleton with real types and PDA helpers, but key `Program` wiring is still stubbed in `sdk/core/src/stablecoin.ts`.
- The service layer and several tests are placeholders, so the stack is best understood as "Anchor programs first, surrounding SDK and ops tooling in progress."
