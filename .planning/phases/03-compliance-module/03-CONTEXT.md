# Phase 3: Compliance Module - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the SSS-2 compliance layer on top of the completed Layer 1 contract. This phase covers transfer-hook enforcement on SSS-2 transfers, blacklist PDA management, seizure behavior via the permanent delegate, and the authority gating that keeps compliance-only behavior off SSS-1 deployments. Presets, SDK ergonomics beyond matching these flows, CLI commands, backend automation, broader testing strategy, and deployment proof remain in later phases.

</domain>

<decisions>
## Implementation Decisions

### Seizure policy
- `seize` must require the target to be both blacklisted and frozen before the transfer is allowed.
- Phase 3 seizure is full-balance only; operators do not choose a partial amount.
- Seized funds must go to a designated issuer treasury account, not an arbitrary runtime destination.
- Seizure does not clear compliance status. A blacklist entry remains active until an authorized operator removes it explicitly.

### Blacklist policy
- A blacklist entry represents a wallet address, not an individual token account.
- Every blacklist add action must include a short operator-supplied reason.
- Blacklist entries are immutable in practice: if operators need to change the rationale, they should remove the entry and create a fresh one.
- Blacklist removal is a direct authorized operator action; it does not require prior seizure or a zero-balance account.

### Compliance operator model
- On initialization, the authority should hold both compliance roles by default.
- `blacklister` and `seizer` remain distinct roles, but a deployment may assign both to the same key.
- The stablecoin authority retains emergency override access to compliance actions even after delegating dedicated compliance operators.
- The stablecoin authority can rotate compliance roles at any time.

### Claude's Discretion
- Exact account shapes and helper abstractions needed to enforce the chosen seizure preconditions
- How the designated treasury is persisted or validated on-chain as long as it is not an arbitrary runtime destination
- Exact event payload additions or error-code granularity needed to reflect the locked operator workflow
- Test fixture structure and helper composition for the compliance integration suite

</decisions>

<specifics>
## Specific Ideas

- The compliance layer should behave like an issuer-controlled, regulated stablecoin flow rather than a flexible operator toolkit.
- The transfer hook remains "every transfer, no gaps" as already established in the docs and architecture notes.
- Compliance actions should remain auditable and explicit: reasons on blacklist adds, separate unblacklist actions, and no silent state cleanup after seizure.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `programs/sss-2/src/instructions/compliance.rs`: already contains the main `add_to_blacklist`, `remove_from_blacklist`, and `seize` instruction scaffolding plus event emission.
- `programs/sss-2/src/instructions/initialize.rs`: already enables the permanent delegate and transfer-hook extensions during SSS-2 initialization.
- `programs/sss-transfer-hook/src/instructions/transfer_hook.rs`: already models sender and recipient blacklist checks through optional blacklist PDAs.
- `programs/sss-transfer-hook/src/instructions/initialize.rs`: placeholder for the extra-account-meta initialization that will make the hook executable through Token-2022.
- `tests/sss-2.ts`: existing end-to-end flow outline for initialize, blacklist, rejected transfer, seizure, unblacklist, and graceful failure on SSS-1.
- `sdk/core/src/compliance.ts`: existing SDK surface already assumes blacklist add/remove and seize flows that should stay aligned with the on-chain behavior.

### Established Patterns
- Phase 2 already locked mint-derived stablecoin PDAs, immutable compliance extension flags at initialization, and explicit Anchor errors for invalid flows.
- SSS-1 and SSS-2 both model role checks directly in instruction account constraints; Phase 3 should extend that style rather than introduce a separate authorization system.
- Repo conventions expect focused instruction files under `programs/*/src/instructions/` and integration tests under `tests/`.
- Docs in `docs/SSS-2.md` and `docs/ARCHITECTURE.md` already define the intended high-level compliance story, including blacklist PDAs, transfer-hook enforcement, and seizure via permanent delegate.

### Integration Points
- `programs/sss-2` and `programs/sss-transfer-hook` must agree on blacklist PDA derivation and the accounts passed through the transfer-hook interface.
- The transfer-hook setup must connect cleanly to Token-2022 mint initialization so compliant deployments are actually enforced at transfer time.
- The SDK, future CLI, and future compliance service will consume the operator workflow decided here: add with reason, separate remove, and seizure to designated treasury.
- Phase 4 preset work depends on these decisions to define what SSS-2 means concretely versus SSS-1.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-compliance-module*
*Context gathered: 2026-03-09*
