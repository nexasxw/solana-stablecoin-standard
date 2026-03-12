# T02: 03-compliance-module 02

**Slice:** S03 — **Milestone:** M001

## Description

Lock down the SSS-2 compliance workflow (blacklist + seizure) and align the SDK surface.

Purpose: Ensure the on-chain compliance model cannot be bypassed or spoofed via flexible accounts, and keep the SDK consistent with the finalized instruction accounts.
Output: Hardened `seize` account constraints + matching SDK/test updates.

## Must-Haves

- [ ] Seizure requires: designated treasury configured, target wallet blacklisted, and target token account frozen.
- [ ] Seizure eligibility is validated against the correct blacklist PDA for the target wallet (cannot be spoofed with an unrelated initialized account).
- [ ] SDK helpers pass all required accounts for compliance instructions and match the on-chain account model.

## Files

- `programs/sss-2/src/instructions/compliance.rs`
- `programs/sss-2/src/error.rs`
- `programs/sss-2/src/lib.rs`
- `sdk/core/src/compliance.ts`
- `tests/sss-2.ts`
