# T03: 03-compliance-module 03

**Slice:** S03 — **Milestone:** M001

## Description

Eliminate SDK/docs drift around SSS-2 compliance.

Purpose: Phase 3 is only “done” if downstream references (SDK + docs) describe and derive the same PDAs and behavior the programs enforce.
Output: Updated SDK PDA helpers and corrected documentation for seeds and seize mechanics.

## Must-Haves

- [ ] SDK PDA derivations match the on-chain mint-derived stablecoin PDA model used by SSS-2 and tests.
- [ ] Compliance docs describe the real seize mechanics and stablecoin seed model (no “transfer_checked” or authority-seeded drift).
- [ ] Downstream consumers (SDK/docs) do not encode assumptions that would break SSS-2 compliance flows.

## Files

- `sdk/core/src/pda.ts`
- `docs/ARCHITECTURE.md`
- `docs/SSS-2.md`
- `CLAUDE.md`
