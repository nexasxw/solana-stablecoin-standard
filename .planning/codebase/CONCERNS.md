# Codebase Concerns

This document captures visible technical debt, missing pieces, and risk areas from the current repository snapshot.

## Snapshot

- `git status --short` shows active local changes in `.gitignore`, `CLAUDE.md`, and untracked `AGENTS.md`. Treat this map as a moving snapshot, not a clean-tree audit.
- The repo structure advertised in `README.md` is materially ahead of the code that exists under `programs/`, `sdk/`, `services/`, and `tests/`.

## Repo-Level Blockers

- `Cargo.toml` declares `members = ["programs/*", "modules/*"]`, but `modules/sss-compliance/` and `modules/sss-roles/` contain no manifests or source files. A local `cargo check` already fails because `modules/sss-compliance/Cargo.toml` is missing.
- `package.json` uses `yarn workspaces foreach -A run build` and `yarn workspaces foreach -A run test`, but the local toolchain resolves to Yarn 1.22.22, which does not support `workspaces foreach`. The root build command is broken before it reaches package code.
- `.github/workflows/test.yml` depends on `anchor build`, `anchor test`, and the SDK build, so the current workspace/config mismatch is likely to break CI as well.
- `package.json` defines `test:integration` for `tests/integration.ts`, but that file does not exist under `tests/`.

## On-Chain Program Correctness And Security

- `programs/sss-1/src/instructions/initialize.rs` and `programs/sss-2/src/instructions/initialize.rs` only write PDA state and emit events. They do not create or configure the Token-2022 mint, metadata, freeze authority, permanent delegate, or transfer hook. This leaves the core mint path non-functional.
- Both initialize instructions accept `mint` as a plain `Signer` account and persist its key into state without creating or validating a mint account. A caller can initialize a stablecoin record that points at an arbitrary signer pubkey, leaving later CPI flows broken.
- `programs/sss-1/src/instructions/admin.rs` and `programs/sss-2/src/instructions/admin.rs` make `transfer_authority` dangerous. The stablecoin PDA address is seeded by the current authority, but `transfer_authority` mutates `stablecoin.authority` without moving the PDA. After the change, later instructions derive seeds from the new authority and can no longer address the existing PDA. This can brick admin, mint, burn, freeze, thaw, and compliance flows after the first authority transfer.
- `programs/sss-2/src/instructions/compliance.rs` documents `seize` as acting on a frozen or blacklisted account, but the handler does not enforce either condition. Any account holding the mint can be seized if the caller has the seizer role.
- `programs/sss-transfer-hook/src/instructions/initialize.rs` does not create or populate the extra-account-meta list. The handler is still a TODO, so the transfer hook cannot be wired into Token-2022 as described.
- `programs/sss-transfer-hook/src/instructions/transfer_hook.rs` does not constrain `stablecoin` to a PDA owned by the SSS-2 program and does not constrain `destination_owner` to `destination_token.owner`. If the hook were callable with malformed accounts, blacklist checks could be pointed at the wrong owner or wrong stablecoin namespace.
- `programs/sss-transfer-hook/src/lib.rs` imports `spl_transfer_hook_interface::instruction::ExecuteInstruction`, but the program does not show the interface glue that Token-2022 expects. Combined with the empty extra-account-meta initializer, hook integration looks incomplete.
- `programs/sss-1/src/instructions/mint.rs`, `programs/sss-1/src/instructions/freeze_account.rs`, `programs/sss-1/src/instructions/thaw_account.rs`, and the SSS-2 equivalents assume the stablecoin PDA already holds mint and freeze authority. Because initialization never sets those authorities on-chain, these handlers are unlikely to succeed in practice.

## SDK And CLI Gaps

- `sdk/core/src/stablecoin.ts` is mostly scaffold. `create()` returns an object backed by `const program = {} as Program`, and most methods throw "Not yet implemented". The public SDK surface is present, but the implementation is not.
- `sdk/core/src/stablecoin.ts` can fail before its explicit placeholders. For example, `mint()` derives PDAs from `this.program.programId`, but `programId` comes from the empty object cast above.
- `sdk/core/src/compliance.ts` assumes a fully initialized Anchor `Program` with `methods.addToBlacklist`, `methods.removeFromBlacklist`, and `methods.seize`, but `sdk/core/src/stablecoin.ts` never creates that program instance.
- `sdk/core/package.json` exposes a CLI binary at `dist/cli.js`, but there is no `sdk/core/src/cli.ts` or any other CLI source file. The package metadata promises an executable that does not exist.
- `README.md` shows SDK usage that omits required signer arguments for `stable.compliance.blacklistAdd(...)` and `stable.compliance.seize(...)`. The published examples do not match the current TypeScript API in `sdk/core/src/compliance.ts`.

## Services And Operational Gaps

- Every service package under `services/` contains only `package.json`. There are no `src/` files, no `tsconfig.json`, no tests, and no Dockerfiles under `services/mint-burn/`, `services/compliance/`, `services/indexer/`, or `services/webhook/`.
- `docker-compose.yml` builds all four services from those directories, but the required application and container files are absent. The compose stack is not deployable from the current repo state.
- The service package scripts in `services/*/package.json` assume `src/index.ts` exists and can be built or linted. Those commands are placeholders right now, not runnable service workflows.
- Secrets and operational dependencies appear only as environment-variable names in `docker-compose.yml`. There is no checked-in runbook, schema, or bootstrap code for the Postgres- and Redis-backed flows described in `README.md`.

## Testing And Quality Risks

- `tests/sss-1.ts` and `tests/sss-2.ts` are almost entirely TODO comments. The integration test suite does not currently validate quota enforcement, pause behavior, blacklist behavior, transfer-hook rejection, or seizure rules.
- `trident-tests/fuzz_0/src/bin/fuzz_0.rs` is also a placeholder, so fuzz coverage is not present despite the Trident scaffolding.
- `sdk/core/package.json` declares a `test` script for `tests/**/*.ts`, but there is no `sdk/core/tests/` tree. SDK-level verification is missing.
- The root lint and format commands in `package.json` target `services/*/src/**/*.ts`, yet those source trees do not exist. Style tooling will not protect the areas that the repo claims to ship.

## Documentation And Integration Drift

- `README.md` links to `docs/SDK.md`, `docs/OPERATIONS.md`, `docs/COMPLIANCE.md`, and `docs/API.md`, but those files are missing. The documentation set is incomplete relative to the advertised product surface.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/SSS-1.md`, and `docs/SSS-2.md` describe production-ready behavior such as Token-2022 extension setup, transfer-hook enforcement, CLI commands, and backend services. The codebase does not yet implement most of that behavior.
- `Anchor.toml` and the docs use placeholder program IDs for `sss_1`, `sss_2`, and `sss_transfer_hook`. This is fine for scaffolding, but it remains a deployment and integration risk until environments are separated and real IDs are managed.

## Practical Priority Order

- First, fix the workspace/toolchain blockers in `Cargo.toml` and `package.json` so the repo can build in a deterministic way.
- Next, complete the mint and extension initialization paths in `programs/sss-1/`, `programs/sss-2/`, and `programs/sss-transfer-hook/`; without that, the security model in the docs is only aspirational.
- Then, resolve the authority-transfer PDA design in `programs/sss-1/src/instructions/admin.rs` and `programs/sss-2/src/instructions/admin.rs` before any external integration depends on it.
- After the core program paths are real, align `sdk/core/`, `README.md`, `docs/`, and `services/` to the actual shipped surface and add executable tests around the compliance-critical flows.
