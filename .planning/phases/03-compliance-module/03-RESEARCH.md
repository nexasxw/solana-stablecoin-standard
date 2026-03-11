# Phase 3 Research: Compliance Module

## Research Goal

Phase 3 should make SSS-2 “compliance” real and provable:

- every Token-2022 transfer for an SSS-2 mint runs through `sss-transfer-hook` and rejects blacklisted senders/recipients
- the SSS-2 program owns the on-chain compliance workflow: blacklist PDAs + seizure to a designated treasury
- compliance-only behavior is gated so it cannot accidentally “leak” into SSS-1 deployments

The key planning question is not “what primitives exist?” — most of the surface already exists in-program and in tests — but “what must be verified, aligned, and finished so Phase 3 can be declared complete without drift across programs, docs, and SDK surfaces?”

## Current Starting Point (Existing Code)

The repo already contains most of the intended Phase 3 implementation:

- SSS-2 compliance instructions:
  - `programs/sss-2/src/instructions/compliance.rs` implements `add_to_blacklist`, `remove_from_blacklist`, and `seize`
  - authority gating already exists via account constraints (`authority` override, role keys, and `transfer_hook_enabled` / `permanent_delegate_enabled` checks)
  - blacklist entries require a non-empty reason (bounded by `MAX_BLACKLIST_REASON_LEN`) and emit events
  - `seize` enforces **treasury configured**, **target blacklisted**, **target token account frozen**, and seizes **full balance**
- Transfer hook enforcement:
  - `programs/sss-transfer-hook/src/instructions/transfer_hook.rs` checks blacklist PDAs for (a) sender wallet and (b) recipient wallet (derived from destination token account owner)
  - blacklist PDAs are treated as *optional* accounts: “missing account” means “not blacklisted” and should not error
- Hook wiring:
  - `programs/sss-2/src/instructions/initialize.rs` enables Token-2022 `PermanentDelegate` + `TransferHook`, then CPIs into `sss-transfer-hook` to initialize the extra-account-metas PDA
  - `programs/sss-transfer-hook/src/instructions/initialize.rs` creates and writes the `ExtraAccountMetaList` TLV data used by Token-2022 to supply the hook’s extra accounts
- Integration test coverage:
  - `tests/sss-2.ts` already runs a real end-to-end scenario: init, set treasury, blacklist add/remove, transfer-hook rejection/allow, freeze+seize full balance, and SSS-1 gating

This strongly suggests Phase 3 is primarily about **closing remaining correctness gaps**, **aligning docs/SDK assumptions with code**, and **ensuring the enforcement path is airtight**.

## Requirement Mapping (What Must Be True)

### COMP-01: Transfer-hook blacklist enforcement

What “done” looks like:

- Token-2022 transfers on an SSS-2 mint invoke `sss-transfer-hook` every time.
- The hook checks:
  - sender wallet address (owner of `source_token`) against a blacklist PDA
  - recipient wallet address (owner of `destination_token`) against a blacklist PDA
- Either check being blacklisted rejects the transfer with a stable, explicit hook error (e.g. `SenderBlacklisted`, `RecipientBlacklisted`).

Key implementation details to verify:

- The extra-account-metas list must resolve the SSS-2 stablecoin PDA and the two blacklist PDAs deterministically.
- The hook must not “panic” if blacklist accounts are missing — it should treat uninitialized PDAs as “not blacklisted.”
- The accounts order and indices used in `sss-transfer-hook` extra metas must match Token-2022’s transfer-hook interface expectations.

### COMP-02: Blacklist PDAs + seizure via permanent delegate

What “done” looks like:

- Blacklist entries:
  - represent wallet addresses (not token accounts)
  - require operator reason (immutable in practice; to change, remove + re-add)
  - are removable by authorized operators
- Seizure:
  - requires the target wallet be blacklisted AND the target token account be frozen
  - seizes full balance only (no partial seizure in Phase 3)
  - sends seized funds to the stablecoin’s configured treasury token account (not a runtime arbitrary destination)
  - emits a stable event payload for off-chain audit

Important nuance: a direct Token-2022 transfer by the permanent delegate would still trigger the transfer hook (and could be rejected because the owner is blacklisted). The current SSS-2 implementation instead uses a controlled sequence (thaw → burn → mint-to treasury) to preserve supply while bypassing hook enforcement for the seizure operation.

### COMP-03: Feature gating (SSS-2 only)

What “done” looks like:

- SSS-2 compliance instructions fail explicitly when compliance extensions are not enabled in the stablecoin state.
- SSS-1 initialization rejects compliance-only extension flags (transfer hook, permanent delegate).
- The `sss-transfer-hook` program remains safe to be invoked even if a non-SSS-2 mint points at it (it should not brick transfers by requiring an initialized SSS-2 stablecoin state).

## Known Drift / Alignment Risks (Plan Should Address)

- Docs claim the stablecoin PDA is derived from authority (e.g. `["stablecoin", authority]`), while the current programs derive it from the mint (see Phase 2 decisions and SSS-2 constraints). This should be corrected where relevant.
- `docs/ARCHITECTURE.md` describes seize as a Token-2022 `transfer_checked` flow, while the program implements seize as thaw → burn → mint-to treasury to avoid transfer-hook rejection. This mismatch should be resolved (docs updated or code changed with strong justification).

## Likely File Touch Points (If Gaps Exist)

- `programs/sss-transfer-hook/src/instructions/initialize.rs` (extra-account-metas correctness)
- `programs/sss-transfer-hook/src/instructions/transfer_hook.rs` (hook validation, errors, account validation expectations)
- `programs/sss-2/src/instructions/compliance.rs` (seize invariants, blacklist invariants, event payloads)
- `programs/sss-2/src/instructions/admin.rs` (treasury configuration constraints)
- `tests/sss-2.ts` and `tests/helpers/*` (coverage for “every transfer, no gaps” and negative paths)
- `docs/SSS-2.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md` (seed + seize-flow alignment)
- `sdk/core/src/compliance.ts`, `sdk/core/src/pda.ts` (SDK must mirror seeds and instruction interfaces)

## Validation Architecture

Phase 3 correctness is best sampled via Anchor integration tests because:

- Transfer hook enforcement is only provable end-to-end with a real Token-2022 transfer path.
- Seizure behavior involves Token-2022 CPI interactions and extension invariants.

Recommended sampling commands:

- **Quick**: `yarn test:sss2` (focused compliance suite)
- **Full**: `yarn test` (entire Anchor integration suite)
- **Build gate** (whenever Rust touched): `anchor build`

Minimum automated checks a Phase 3 execution plan should maintain:

- hook rejection cases (sender and recipient) stay green
- seizure preconditions stay enforced (no treasury, not frozen, not blacklisted)
- seizure happy path seizes full balance to designated treasury
- SSS-1 gating remains enforced (`UnsupportedExtensionConfig`)

