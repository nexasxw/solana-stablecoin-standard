# Repository Guidelines

## Project Structure & Module Organization
This repository is a monorepo for Solana stablecoin standards. Anchor programs live in `programs/`: `sss-1/`, `sss-2/`, and `sss-transfer-hook/`, with Rust sources under each `src/`. TypeScript integration tests live in `tests/` with shared helpers in `tests/helpers/`. The SDK and CLI are in `sdk/core/src/`. Supporting services live in `services/{mint-burn,compliance,indexer,webhook}/src/`. Reference material belongs in `docs/`, and workspace-level config lives in `Anchor.toml`, `Cargo.toml`, `Trident.toml`, and `package.json`.

## Build, Test, and Development Commands
Install dependencies with `yarn install`, then compile programs with `anchor build`. Use `yarn build` to build all TypeScript workspaces. Run the full Anchor suite with `yarn test` or `anchor test`. Targeted checks:

- `yarn test:sss1`: run `tests/sss-1.ts`
- `yarn test:sss2`: run `tests/sss-2.ts`
- `yarn test:sdk`: run workspace TypeScript tests
- `yarn lint` / `yarn format:check`: verify TS style
- `docker compose up`: start local services

## Coding Style & Naming Conventions
Follow Rust defaults: `rustfmt` formatting, `snake_case` modules/functions, `CamelCase` types, and focused instruction files under `programs/*/src/instructions/`. In TypeScript, match the existing 2-space indentation, semicolons, named exports, and descriptive filenames such as `stablecoin.ts` or `compliance.ts`. Keep test files named after the feature or standard they cover, for example `tests/sss-1.ts`.

## Testing Guidelines
Primary coverage comes from Anchor integration tests and SDK Mocha tests. Add or extend tests whenever program instructions, PDA logic, compliance flows, or CLI behavior change. Keep assertions close to the on-chain behavior under test and reuse helpers from `tests/helpers/`. Before opening a PR, run the narrowest relevant command first, then `yarn test` if shared behavior changed.

## Commit & Pull Request Guidelines
Recent history uses short, imperative commit subjects with Conventional Commit prefixes, for example `feat: initial monorepo setup (NEX-5)`. Prefer `feat:`, `fix:`, `docs:`, or `chore:` and include ticket IDs when available. PRs should explain scope, list affected programs or packages, include test commands run, and link the relevant issue. Add screenshots only when CLI or docs output changes in a way reviewers should verify visually.

## Security & Configuration Tips
Do not commit real keypairs, RPC secrets, or `.env` files. Treat program IDs, authority roles, and compliance controls as security-sensitive; document any changes in `docs/` and update both program and SDK surfaces together when interfaces move.
