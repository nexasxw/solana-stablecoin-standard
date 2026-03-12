# T02: 02-layer-1-core-program 02

**Slice:** S02 — **Milestone:** M001

## Description

Implement real Layer 1 initialization around the finalized Phase 2 schema.

Purpose: Make the shared contract usable by creating a real Token-2022 mint, assigning the right authorities, and persisting stable state that later flows can trust.
Output: Working `initialize` handlers, explicit initialization errors, and parity-safe entrypoint wiring in both programs.

## Must-Haves

- [ ] `initialize` creates and configures a real Token-2022 mint instead of only storing a pubkey.
- [ ] Mint authority and freeze authority are assigned consistently with the stablecoin PDA model chosen in Plan 01.
- [ ] Unsupported or invalid config flags fail through explicit Anchor errors.

## Files

- `programs/sss-1/src/instructions/initialize.rs`
- `programs/sss-1/src/lib.rs`
- `programs/sss-1/src/events.rs`
- `programs/sss-1/src/error.rs`
- `programs/sss-2/src/instructions/initialize.rs`
- `programs/sss-2/src/lib.rs`
- `programs/sss-2/src/events.rs`
- `programs/sss-2/src/error.rs`
