# Coding Conventions

## Scope
- This repo is a mixed Rust and TypeScript monorepo centered on Anchor programs in `programs/`, TS tests in `tests/`, SDK code in `sdk/core/src/`, and service packages under `services/*`.
- The written guidance in `AGENTS.md` matches the observed code: Rust uses default formatting and common Anchor patterns, while TypeScript uses 2-space indentation, semicolons, named exports, and descriptive filenames.

## TypeScript Style
- Workspace formatting is defined in `.prettierrc`: semicolons on, double quotes, trailing commas, `printWidth: 100`, and `tabWidth: 2`.
- Workspace linting is defined in `.eslintrc.json`: `eslint:recommended` plus `plugin:@typescript-eslint/recommended`.
- `@typescript-eslint/no-unused-vars` is enforced, but underscore-prefixed parameters are allowed, which matches placeholder-heavy code.
- `@typescript-eslint/no-explicit-any` is only a warning, so strict typing is preferred but not absolute.
- `tsconfig.json` and `sdk/core/tsconfig.json` both enable `strict`, `esModuleInterop`, `resolveJsonModule`, and declaration output.

## TypeScript Naming And File Patterns
- SDK filenames are short, noun-based, and feature-oriented: `sdk/core/src/stablecoin.ts`, `sdk/core/src/compliance.ts`, `sdk/core/src/pda.ts`, `sdk/core/src/presets.ts`, `sdk/core/src/types.ts`.
- The SDK uses named exports and a barrel in `sdk/core/src/index.ts`.
- Classes use `PascalCase` like `SolanaStablecoin` and `ComplianceModule`; helpers use `camelCase` like `findStablecoinPda` and `getPresetConfig`.
- Constants use `SCREAMING_SNAKE_CASE` when they are true constants, for example `SSS1_PROGRAM_ID` in `sdk/core/src/stablecoin.ts` and `SSS1_CONFIG` in `sdk/core/src/presets.ts`.
- Options and state shapes are modeled as interfaces in `sdk/core/src/types.ts`.

## Rust Style
- There is no repo-level `rustfmt.toml`, so the code relies on standard Rust formatting conventions.
- Program entrypoints live in `programs/*/src/lib.rs` and stay thin: each public instruction forwards directly to a handler in `programs/*/src/instructions/*.rs`.
- Rust modules are consistently split into `constants.rs`, `error.rs`, `events.rs` where present, `instructions/`, `lib.rs`, and `state.rs`.
- Instruction modules are re-exported from `programs/*/src/instructions/mod.rs` with explicit `pub mod` declarations and glob re-exports.
- Names follow normal Rust expectations: modules and functions are `snake_case`, types and account structs are `CamelCase`, and enum variants are `CamelCase`.

## Anchor Module Patterns
- Every instruction file defines a `#[derive(Accounts)]` context plus a free `handler` function or named handler like `add_to_blacklist` in `programs/sss-2/src/instructions/compliance.rs`.
- Account validation is pushed into the account struct via seeds, bumps, `has_one`, `address =`, and `constraint = ... @ StablecoinError::...`.
- PDA seed conventions are centralized in `programs/*/src/constants.rs` and mirrored in SDK helpers such as `sdk/core/src/pda.ts`.
- On-chain state structs define explicit `LEN` constants in `programs/sss-1/src/state.rs` and `programs/sss-2/src/state.rs` instead of deriving account size indirectly.
- The code keeps reserved padding fields like `_reserved` in `programs/sss-1/src/state.rs` for upgrade room.

## Error Handling Patterns
- Program-specific errors are declared with `#[error_code]` enums in `programs/sss-1/src/error.rs`, `programs/sss-2/src/error.rs`, and `programs/sss-transfer-hook/src/error.rs`.
- Human-readable messages are attached with `#[msg(...)]`, and instruction guards rely on `require!` for state validation.
- Arithmetic uses checked math plus explicit domain errors, for example `.checked_add(amount).ok_or(StablecoinError::MathOverflow)?` in `programs/sss-1/src/instructions/mint.rs` and `programs/sss-2/src/instructions/mint.rs`.
- Successful state transitions usually emit events with `emit!`, as seen in `programs/sss-1/src/instructions/admin.rs` and `programs/sss-2/src/instructions/compliance.rs`.
- The SDK currently uses thrown `Error` values for unfinished paths, especially in `sdk/core/src/stablecoin.ts`, rather than custom TS error classes.

## Documentation And Commenting Norms
- Rust files begin with `//!` module-level docs describing the intent of the program or instruction, for example `programs/sss-1/src/lib.rs` and `programs/sss-transfer-hook/src/instructions/transfer_hook.rs`.
- TypeScript files use block comments and JSDoc-style method comments, especially in `sdk/core/src/stablecoin.ts` and `sdk/core/src/compliance.ts`.
- The codebase is comfortable with TODO markers for not-yet-wired CPI and IDL work, including `programs/sss-1/src/instructions/initialize.rs`, `programs/sss-2/src/instructions/initialize.rs`, and `sdk/core/src/stablecoin.ts`.

## Practical Implications For New Work
- Keep new Anchor instructions small and handler-oriented, matching `programs/sss-1/src/instructions/` and `programs/sss-2/src/instructions/`.
- Prefer adding validation to `#[account(...)]` constraints before adding imperative checks inside handlers.
- Mirror any new PDA seed logic in both Rust constants/state code and `sdk/core/src/pda.ts`.
- Preserve the existing TS style envelope from `.prettierrc` and `.eslintrc.json`; this repo does not show appetite for alternative style systems.
- Treat service packages under `services/*` as scaffolds for now: `services/*/src` directories exist but currently have no source files, so conventions there are inherited from workspace config rather than established by implementation.
