# Testing Patterns

## Current Test Surface
- Root test orchestration is defined in `package.json`: `yarn test` runs `anchor test`, while targeted commands include `yarn test:sss1`, `yarn test:sss2`, `yarn test:integration`, and `yarn test:sdk`.
- `Anchor.toml` wires the Anchor test command to `ts-mocha` over `tests/sss-*.ts` plus `tests/integration.ts`.
- Today, the checked-in TypeScript tests are only `tests/sss-1.ts` and `tests/sss-2.ts`; there is no `tests/integration.ts` file yet.
- `sdk/core/package.json` declares its own Mocha test command over `tests/**/*.ts`, but there is no `sdk/core/tests/` directory in the repo.
- Each service package in `services/*/package.json` reports `"No tests yet"` and exits successfully, so workspace test passes can mask missing coverage.

## Frameworks And Tools
- Anchor integration tests use `@coral-xyz/anchor`, `ts-mocha`, `mocha`, and `chai`, configured from root `package.json` and `tsconfig.json`.
- The helper layer in `tests/helpers/index.ts` provides small async utilities like `airdrop`, `sleep`, and `newKeypair`.
- Fuzzing is planned through Trident: `Trident.toml` is present and `trident-tests/fuzz_0/src/bin/fuzz_0.rs` exists as a scaffold.
- There are no detected Rust unit tests in `programs/*` or `trident-tests/*` using `#[cfg(test)]`, `mod tests`, or `#[test]`.

## Test Layout And Organization
- Test files are feature-level integration specs named after the standard: `tests/sss-1.ts` and `tests/sss-2.ts`.
- Each suite uses a single top-level `describe(...)` and an ordered flow of `it(...)` blocks that mirrors the intended lifecycle of the standard.
- `tests/sss-1.ts` follows the minimal flow: initialize, mint, quota enforcement, freeze, thaw, burn, pause, and unauthorized access.
- `tests/sss-2.ts` adds compliance flow coverage: initialize, blacklist, transfer-hook rejection, seizure, blacklist removal, and graceful failure on SSS-1.
- The setup pattern is shared: construct an Anchor provider with `anchor.AnchorProvider.env()`, call `anchor.setProvider(provider)`, create keypairs up front, and airdrop SOL in `before(...)`.

## Assertion Patterns
- `chai.expect` is the chosen assertion style in `tests/sss-1.ts`, `tests/sss-2.ts`, and `tests/helpers/index.ts`.
- The intended assertion style is behavior-close and domain-specific: verify balances, PDA existence, account freeze state, supply changes, and specific domain errors like `QuotaExceeded`, `Paused`, `Unauthorized`, `ComplianceNotEnabled`, `SenderBlacklisted`, and `RecipientBlacklisted`.
- The tests are written as scenario outlines right now; most `it(...)` blocks are placeholders with comments instead of executable assertions.

## Coverage Signals
- The root repo advertises a broad test matrix, but the real executable coverage is currently low because the main TS suites are TODO stubs and SDK/service tests are absent.
- `tests/sss-1.ts` contains eight scenario placeholders and no live program RPC calls yet.
- `tests/sss-2.ts` contains nine scenario placeholders and no live compliance assertions yet.
- `trident-tests/fuzz_0/src/bin/fuzz_0.rs` is explicitly marked as a placeholder, so fuzz coverage is planned but not active.
- Program code contains substantial TODO markers in initialization paths such as `programs/sss-1/src/instructions/initialize.rs`, `programs/sss-2/src/instructions/initialize.rs`, and `programs/sss-transfer-hook/src/instructions/initialize.rs`, which explains part of the missing executable coverage.
- SDK methods in `sdk/core/src/stablecoin.ts` still throw `"Not yet implemented"` for most write paths, so end-to-end SDK tests cannot be meaningful until IDL-backed wiring lands.

## Practical Commands
- Use `yarn test` or `anchor test` for the full Anchor-driven suite declared in `Anchor.toml`.
- Use `yarn test:sss1` and `yarn test:sss2` when iterating on `programs/sss-1` or `programs/sss-2`.
- Use `yarn test:sdk` only with caution: the workspace command includes packages whose test scripts succeed without exercising code.
- Use `yarn lint` and `yarn format:check` as supporting quality gates for TS work, because they are more meaningful than the current placeholder test scripts in several packages.

## Testing Guidance For Future Contributors
- Add or extend tests in `tests/` whenever instruction behavior, PDA derivation, role checks, compliance behavior, or transfer-hook enforcement changes.
- Prefer turning existing TODO scenarios into live integration tests before adding new placeholder files.
- Keep shared setup in `tests/helpers/index.ts`, but keep assertions close to the feature under test rather than hiding them in helpers.
- When SDK implementation becomes real, add package-local tests under `sdk/core/tests/` to match the command already declared in `sdk/core/package.json`.
- Do not treat green workspace test output as strong evidence today unless the run included `anchor test` and at least one non-placeholder spec actually executed meaningful assertions.
