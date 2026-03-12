# S03: Compliance Module

**Goal:** Harden and clarify the transfer-hook enforcement path.
**Demo:** Harden and clarify the transfer-hook enforcement path.

## Must-Haves


## Tasks

- [x] **T01: 03-compliance-module 01** `est:35min`
  - Harden and clarify the transfer-hook enforcement path.

Purpose: Ensure “every transfer, no gaps” for SSS-2 without making the hook unsafe for non-SSS-2 mints.
Output: A transfer hook handler that only enforces blacklist rules when an initialized SSS-2 stablecoin state exists, plus docs alignment for the enforcement story.
- [x] **T02: 03-compliance-module 02** `est:40min`
  - Lock down the SSS-2 compliance workflow (blacklist + seizure) and align the SDK surface.

Purpose: Ensure the on-chain compliance model cannot be bypassed or spoofed via flexible accounts, and keep the SDK consistent with the finalized instruction accounts.
Output: Hardened `seize` account constraints + matching SDK/test updates.
- [x] **T03: 03-compliance-module 03** `est:25min`
  - Eliminate SDK/docs drift around SSS-2 compliance.

Purpose: Phase 3 is only “done” if downstream references (SDK + docs) describe and derive the same PDAs and behavior the programs enforce.
Output: Updated SDK PDA helpers and corrected documentation for seeds and seize mechanics.

## Files Likely Touched

- `programs/sss-transfer-hook/src/instructions/transfer_hook.rs`
- `docs/ARCHITECTURE.md`
- `docs/SSS-2.md`
- `programs/sss-2/src/instructions/compliance.rs`
- `programs/sss-2/src/error.rs`
- `programs/sss-2/src/lib.rs`
- `sdk/core/src/compliance.ts`
- `tests/sss-2.ts`
- `sdk/core/src/pda.ts`
- `docs/ARCHITECTURE.md`
- `docs/SSS-2.md`
- `CLAUDE.md`
