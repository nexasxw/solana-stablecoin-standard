# Integration Map

## Solana Network And Anchor Integration
- `Anchor.toml` binds the codebase to Solana via `localnet` and `devnet` program sections for `sss_1`, `sss_2`, and `sss_transfer_hook`.
- `Anchor.toml` sets the default provider to `cluster = "localnet"` and `wallet = "~/.config/solana/id.json"`, so local Solana CLI state is part of the expected developer environment.
- `Anchor.toml` also points the Anchor registry to `https://api.apr.dev`, which is the only explicit external SaaS endpoint in the core on-chain toolchain.
- `.github/workflows/test.yml` installs Solana CLI `v1.18.0`, so CI is aligned with the local Anchor workflow rather than mocking chain access.

## Program-To-Program And SPL Integrations
| Source | Integration | How it is used |
| --- | --- | --- |
| `programs/sss-1/src/instructions/mint.rs` | SPL Token interface CPI | Calls `anchor_spl::token_interface::mint_to` with the stablecoin PDA as signer |
| `programs/sss-1/src/instructions/burn.rs` | SPL Token interface CPI | Calls `burn` against the configured mint |
| `programs/sss-1/src/instructions/freeze_account.rs` | SPL Token interface CPI | Calls `freeze_account` with the stablecoin PDA as freeze authority |
| `programs/sss-1/src/instructions/thaw_account.rs` | SPL Token interface CPI | Calls `thaw_account` for previously frozen accounts |
| `programs/sss-2/src/instructions/compliance.rs` | SPL Token interface CPI | Calls `transfer_checked` to seize funds via permanent delegate |
| `programs/sss-transfer-hook/src/lib.rs` | `spl-transfer-hook-interface` | Exposes the transfer-hook entrypoint for Token-2022 execution |
| `programs/sss-transfer-hook/src/instructions/initialize.rs` | `spl-tlv-account-resolution` | Intended for extra account meta list creation, but still TODO |

## Token-2022 Extension Wiring
- Workspace dependencies in `Cargo.toml` show that Token-2022 is the central token runtime for the repo.
- `programs/sss-1/src/instructions/initialize.rs` documents planned mint setup for `MintCloseAuthority`, `MetadataPointer`, `TokenMetadata`, and a PDA-based freeze authority, but the actual CPI implementation is still marked TODO.
- `programs/sss-2/src/instructions/initialize.rs` extends that design with `PermanentDelegate` and `TransferHook`, again as documented TODOs rather than completed init code.
- `docs/ARCHITECTURE.md`, `docs/SSS-1.md`, and `docs/SSS-2.md` describe the intended Token-2022 extension matrix, and the Rust state/config structs in `programs/sss-1/src/state.rs` and `programs/sss-2/src/state.rs` already model those flags.

## Transfer Hook Compliance Flow
- `programs/sss-2/src/instructions/compliance.rs` creates blacklist PDAs using `BLACKLIST_SEED` and the `stablecoin + address` seed tuple.
- `programs/sss-transfer-hook/src/instructions/transfer_hook.rs` reads optional `sender_blacklist_entry` and `recipient_blacklist_entry` accounts and rejects transfers with `HookError::SenderBlacklisted` or `HookError::RecipientBlacklisted`.
- `programs/sss-transfer-hook/src/state.rs` duplicates the `BlacklistEntry` layout so the hook can read the same PDA format that `sss-2` writes.
- `sdk/core/src/pda.ts` mirrors the same seed strategy in TypeScript for `findBlacklistEntryPda()` and `findExtraAccountMetasPda()`.

## SDK-To-Program Integration
- `sdk/core/src/stablecoin.ts` hardcodes `SSS111...` and `SSS222...` program IDs, matching the IDs in `Anchor.toml`.
- The SDK uses `AnchorProvider`, `Program`, and `Wallet` from `@coral-xyz/anchor`, plus `Connection`, `PublicKey`, and `Keypair` from `@solana/web3.js`.
- `sdk/core/src/compliance.ts` is the clearest live SDK integration surface today: it builds Anchor method calls for `addToBlacklist`, `removeFromBlacklist`, and `seize`.
- `sdk/core/src/stablecoin.ts` still stubs `const program = {} as Program;` and comments out imports from `target/idl/sss_1.json` and `target/idl/sss_2.json`, so compiled IDL integration is planned but not active.
- `sdk/core/src/presets.ts` maps the SSS-1 and SSS-2 presets into extension flags that align with the on-chain config structs.

## Test And Developer Workflow Integration
- `tests/sss-1.ts` and `tests/sss-2.ts` bootstrap the runtime with `anchor.AnchorProvider.env()`, which ties tests to Anchor's environment variables and validator setup.
- `tests/helpers/index.ts` uses `Connection.requestAirdrop`, so local validator funding is part of the expected integration story.
- `package.json` routes `yarn test` to `anchor test`, keeping the TypeScript integration tests attached to the Anchor runner rather than a separate simulator.
- `Trident.toml` and `trident-tests/fuzz_0/Cargo.toml` integrate Ackee's Trident fuzzing crate through `trident-fuzz = "0.8"`, but the only fuzz target is still a placeholder binary.

## Off-Chain Service And Data Integrations
- `docker-compose.yml` is the authoritative map of off-chain integrations in the current repo.
- `mint-burn` expects `RPC_URL`, `AUTHORITY_KEYPAIR`, `SSS1_PROGRAM_ID`, `SSS2_PROGRAM_ID`, and `DATABASE_URL`, exposing port `3001`.
- `indexer` expects `RPC_URL`, `WS_URL`, both program IDs, `DATABASE_URL`, and `WEBHOOK_URL`, indicating planned Solana log subscriptions plus outbound webhook fan-out.
- `compliance` is gated behind the `sss2` Compose profile and expects `RPC_URL`, `SSS2_PROGRAM_ID`, and `DATABASE_URL`, exposing port `3004`.
- `webhook` expects `DATABASE_URL` and `REDIS_URL`, exposing port `3003`.
- `postgres` and `redis` are the only fully materialized service dependencies, using `postgres:16-alpine` and `redis:7-alpine`.

## Gaps Between Declared And Active Integrations
- `services/compliance/src`, `services/indexer/src`, `services/mint-burn/src`, and `services/webhook/src` exist but contain no implementation files, so the service integrations are declared operational intent rather than runnable app code.
- The Compose file references build contexts for each service, but there are no service `Dockerfile` files in the repository.
- `sdk/core/package.json` declares a CLI binary, but there is no CLI source in `sdk/core/src/`, so CLI integration is not currently realizable from source.
- `package.json` includes `test:integration` for `tests/integration.ts`, but that integration test file is absent.
- The most reliable live integrations today are the Anchor/SPL program dependencies, PDA conventions shared between Rust and TypeScript, and the CI bootstrap path in `.github/workflows/test.yml`.
