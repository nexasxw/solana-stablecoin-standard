# T01: 03-compliance-module 01

**Slice:** S03 — **Milestone:** M001

## Description

Harden and clarify the transfer-hook enforcement path.

Purpose: Ensure “every transfer, no gaps” for SSS-2 without making the hook unsafe for non-SSS-2 mints.
Output: A transfer hook handler that only enforces blacklist rules when an initialized SSS-2 stablecoin state exists, plus docs alignment for the enforcement story.

## Must-Haves

- [ ] Token-2022 transfers for SSS-2 mints always run the transfer hook and reject blacklisted sender/recipient wallets.
- [ ] The transfer hook only enforces blacklist behavior when the referenced SSS-2 stablecoin PDA is initialized (prevents external mints being griefed by spoofed blacklist PDAs).
- [ ] Hook behavior remains stable and explicit via deterministic errors and safe “missing PDA means not blacklisted” handling.

## Files

- `programs/sss-transfer-hook/src/instructions/transfer_hook.rs`
- `docs/ARCHITECTURE.md`
- `docs/SSS-2.md`
