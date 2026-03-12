# Phase 10: Devnet Proof - Research

**Researched:** 2026-03-13  
**Scope:** Planning inputs for `DEP-01`, `DEP-02`, `DEP-03`  
**Research question:** What implementation approach produces reviewer-verifiable devnet deployment proof with deterministic artifacts and minimal drift risk?

## What Is Locked Already

From `10-CONTEXT.md` and current planning state:
- Phase goal is fixed: deploy required programs to Solana Devnet and publish proof of representative SSS-1/SSS-2 flows.
- Requirement contract is fixed: `DEP-01`, `DEP-02`, `DEP-03`.
- Canonical deployment identity must be published in `Anchor.toml` `[programs.devnet]` and reviewer-facing docs.
- Evidence must use new Phase 10 artifact roots under `artifacts/devnet/phase-10/...`.
- Reviewer acceptance requires at least two successful full runs with distinct `RUN_ID` values, fresh mints, and fresh artifacts (within 24 hours of final handoff).
- Stress lane remains optional for this phase.

## Requirement Mapping (DEP-01 / DEP-02 / DEP-03)

`DEP-01` - Required programs deployed to Devnet with recorded IDs:
- Required program set is three-program model: `sss_1`, `sss_2`, `sss_transfer_hook`.
- Canonical source file is `Anchor.toml` `[programs.devnet]`.
- IDs must be propagated to reviewer-facing docs and any runtime surfaces that derive program IDs from IDL or config.
- Authority snapshots must be captured per published program ID.

`DEP-02` - Representative SSS-1 and SSS-2 transactions succeed on Devnet:
- Phase 08 proof lanes provide the baseline flow shape and deterministic artifact model.
- Phase 10 requires representative success-path coverage for both presets plus one deterministic negative-path transaction per lane.
- Runs must remain non-destructive, `RUN_ID`-scoped, and fail on artifact path collisions.

`DEP-03` - Deployment proof captured for reviewer verification:
- Proof package must contain human-readable summary + machine-readable manifest.
- Every transaction signature and program ID must include Solana Explorer links.
- Final publication should include canonical run references, timestamps, and immutable artifact paths.

## Relevant Skill/Rule Inputs Considered

From local repository instructions and `.claude/skills`:
- Source-of-truth-first approach applies: anchor proof guidance to repo-native scripts/docs before introducing new tooling.
- Anchor deployment and authority verification workflows are expected via `anchor` + `solana` CLI command surfaces.
- No local `.agents/skills` directory exists in this repo; `.claude/skills` provides ecosystem guidance but no conflicting constraints.

## Current Reusable Assets

### Existing proof/evidence foundation (Phase 08)
- `scripts/devnet/phase-08-sss1-proof.sh` and `scripts/devnet/phase-08-sss2-proof.sh`:
  - deterministic `RUN_ID` artifact layout
  - command capture (`commands/*.cmd`, `commands/*.json`)
  - `signatures.csv` and pre/post state snapshots
  - `run-metadata.env` + `summary.md`
- `scripts/devnet/phase-08-stress.sh`: bounded retry orchestration (optional evidence lane for Phase 10).
- `scripts/devnet/README.md`: current command-to-artifact contract language ready for extension.
- `docs/testing/phase-08-devnet-evidence.md`: reviewer-facing evidence structure and rerun policy baseline.

### Deployment identity and runtime surfaces
- `Anchor.toml` currently contains placeholder devnet program IDs for all required programs.
- `target/idl/sss_1.json`, `target/idl/sss_2.json`, `target/idl/sss_transfer_hook.json` currently embed placeholder addresses.
- `sdk/core/src/client.ts` derives program IDs from IDL addresses (indirect dependency on regenerated IDLs after canonical ID updates).
- `docs/SSS-1.md` and `docs/SSS-2.md` currently show placeholder devnet IDs.

### CLI/operator surfaces
- `./scripts/sss-token` is canonical operator invocation wrapper.
- Existing command truth docs already define devnet preflight command surfaces.

## Likely File Touchpoints

Must-touch (high confidence):
- `Anchor.toml` (`[programs.devnet]` canonical IDs)
- `scripts/devnet/` (new Phase 10 proof/deployment scripts and/or adapted wrappers)
- `scripts/devnet/README.md` (Phase 10 artifact contract)
- `docs/testing/` (new Phase 10 evidence contract and reviewer verification document)
- `.planning/phases/10-devnet-proof/` (plans, validation, summaries)

Probable-touch (depends on implementation details):
- `docs/SSS-1.md`, `docs/SSS-2.md` (replace placeholder IDs with canonical devnet IDs)
- `target/idl/*.json` (address regeneration after `anchor build` with final IDs)
- `sdk/core/src/client.ts` (only if strategy shifts away from IDL-derived IDs or requires explicit runtime overrides)

Optional-touch:
- `docs/OPERATIONS.md` (cross-link Phase 10 evidence sources)
- dedicated `artifacts/devnet/phase-10/README.md` or manifest schema docs

## Standard Stack

Use existing repository-native stack only:
- Anchor CLI + Solana CLI for deployment and authority verification.
- `./scripts/sss-token` for representative operator transactions.
- Deterministic Bash scripts under `scripts/devnet/` for orchestration.
- Markdown + JSON artifacts under `artifacts/devnet/phase-10/` for human/machine proof.
- Reviewer docs under `docs/testing/` for command-to-artifact verification contracts.

## Architecture Patterns

### 1) Canonical Deployment Identity Pipeline
- Preflight: verify wallet, cluster, and deploy authority context.
- Deploy required programs to devnet (allow iterative redeploys during execution).
- Select one final canonical ID set.
- Publish same canonical IDs across:
  - `Anchor.toml` `[programs.devnet]`
  - reviewer-facing docs table
  - manifest references and explorer links

### 2) Phase-10 Artifact Isolation Pattern
- Never reuse Phase 08 artifact paths.
- Use dedicated roots:
  - `artifacts/devnet/phase-10/deploy/<RUN_ID>/...`
  - `artifacts/devnet/phase-10/sss1-proof/<RUN_ID>/...`
  - `artifacts/devnet/phase-10/sss2-proof/<RUN_ID>/...`
  - optional `artifacts/devnet/phase-10/stress/<RUN_ID>/...`
- Preserve fail-fast behavior on existing run directories.

### 3) Dual-Format Evidence Contract
- Human-readable: concise reviewer summary markdown (what ran, what passed, where to verify).
- Machine-readable: JSON manifest containing:
  - run metadata
  - canonical program IDs
  - deployment signatures
  - representative transaction signatures
  - explorer URLs
  - pass/fail rollup and timestamps

### 4) Representative Lane Contract
- SSS-1 lane: baseline lifecycle actions (init + role/mint/pause-path) plus deterministic negative-path assertion.
- SSS-2 lane: compliance lifecycle actions (init + mint/freeze/blacklist/seize) plus deterministic negative-path assertion.
- Each lane must produce signature capture and state snapshots with stable schema.

### 5) Reviewer Verification Architecture
- Reviewer should be able to verify with only:
  - canonical docs table
  - manifest JSON
  - summary markdown
  - explorer links
- No hidden local state assumptions beyond provided artifacts.

## Recommended Plan Decomposition (5 Plans)

1. `10-01` Deployment Preflight + Canonical Identity Contract (`DEP-01` foundation)
- Define command truth for devnet deployment and identity verification.
- Add manifest schema for program identity and authority snapshots.
- Establish deterministic artifact roots and naming contract.

2. `10-02` Deploy Required Programs And Capture Identity Evidence (`DEP-01`)
- Execute devnet deployments for `sss_1`, `sss_2`, `sss_transfer_hook`.
- Capture deploy signatures, program metadata, authority snapshots.
- Commit final canonical ID set into `Anchor.toml` and reviewer-facing table.

3. `10-03` Implement/Adapt Phase-10 Proof Lanes For SSS-1 + SSS-2 (`DEP-02`)
- Create Phase 10 proof scripts (or wrappers around Phase 08 scripts) targeting phase-10 paths.
- Add one deterministic negative-path operation per lane with explicit expected-failure evidence capture.
- Emit signatures, snapshots, run metadata, and per-lane summaries.

4. `10-04` Execute Required Reruns And Publish Proof Package (`DEP-02`, `DEP-03`)
- Run at least two full successful proof runs with distinct `RUN_ID` and fresh mints.
- Generate final markdown summary + machine JSON manifest with explorer links.
- Ensure artifact freshness policy (within 24h) is satisfied at handoff.

5. `10-05` Final Verification + Requirement Traceability Closeout (`DEP-01`, `DEP-02`, `DEP-03`)
- Validate command-to-artifact contract, schema consistency, and reviewer reproducibility.
- Update requirement/state tracking and phase validation docs.
- Record acceptance checklist and unresolved risks (if any).

## Don’t Hand-Roll

- Do not invent a new CLI surface for proof operations; use `./scripts/sss-token`.
- Do not mix Phase 10 artifacts into Phase 08 directories.
- Do not maintain duplicate canonical ID sources (single source: `Anchor.toml` + generated evidence).
- Do not rely on ad-hoc screenshots as primary evidence when signatures/manifests can be verified cryptographically.

## Common Pitfalls

- Updating `Anchor.toml` without regenerating/validating IDL address consistency.
- Capturing transaction signatures but omitting explorer URLs in final manifest/docs.
- Reusing `RUN_ID` or artifact directories, causing overwrite ambiguity.
- Producing one successful run only; policy requires two full successful runs.
- Allowing stale evidence (>24h before submission handoff).
- Missing authority snapshot proof for one or more canonical program IDs.

## Risks And Mitigations

1. Program ID drift across config/docs/artifacts.
- Mitigation: enforce canonical-ID gate check that compares `Anchor.toml`, manifest, and docs table before signoff.

2. Devnet instability causing flaky runs.
- Mitigation: separate deployment evidence from proof-lane evidence; permit reruns with unique `RUN_ID`; require full-pass runs only.

3. Incomplete reviewer evidence despite successful execution.
- Mitigation: require both markdown summary and JSON manifest, plus explicit explorer links for every critical signature and program ID.

4. Hidden signer/authority mismatch at deploy time.
- Mitigation: capture `solana address`, deploy wallet pubkey, and per-program authority snapshot into artifacts.

5. Freshness non-compliance at handoff.
- Mitigation: encode UTC timestamps in artifacts and add freshness assertion in final verification checklist.

## Validation Architecture

Nyquist goal for Phase 10: each deployment/proof claim must be machine-verifiable from committed artifacts and explorer links, with deterministic command contracts and requirement traceability.

### Command Baseline

Quick gate (before live devnet execution):
```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
anchor --version
solana --version
solana config get
```

Deployment identity gate (`DEP-01`):
```bash
# Example deployment + identity checks (final commands to be locked in 10-01)
anchor build
anchor deploy --provider.cluster devnet --program-name sss_1
anchor deploy --provider.cluster devnet --program-name sss_2
anchor deploy --provider.cluster devnet --program-name sss_transfer_hook
solana program show <SSS1_PROGRAM_ID> --url devnet
solana program show <SSS2_PROGRAM_ID> --url devnet
solana program show <HOOK_PROGRAM_ID> --url devnet
```

Representative proof gate (`DEP-02`):
```bash
RUN_ID=<phase10-run-a> ... ./scripts/devnet/phase-10-sss1-proof.sh
RUN_ID=<phase10-run-a> ... ./scripts/devnet/phase-10-sss2-proof.sh
RUN_ID=<phase10-run-b> ... ./scripts/devnet/phase-10-sss1-proof.sh
RUN_ID=<phase10-run-b> ... ./scripts/devnet/phase-10-sss2-proof.sh
```

Reviewer evidence gate (`DEP-03`):
```bash
# Validate required artifacts and manifest shape for final canonical run set
test -f artifacts/devnet/phase-10/<...>/summary.md
test -f artifacts/devnet/phase-10/<...>/manifest.json
```

### Requirement-Mapped Verification Strategy

`DEP-01`:
- Evidence: deployment manifest entries for all three programs, authority snapshots, canonical ID table in docs, and matching `Anchor.toml` entries.
- Verification: cross-check ID equality across config/docs/manifest + explorer program pages.

`DEP-02`:
- Evidence: two successful full runs, per-lane signatures/state snapshots, deterministic negative-path evidence per lane.
- Verification: run summaries report pass, signatures resolve on explorer, negative paths fail as expected and are captured.

`DEP-03`:
- Evidence: one reviewer-facing markdown summary plus one machine-readable JSON manifest for canonical publication.
- Verification: reviewer can navigate from requirement -> command -> artifact -> explorer proof without missing links.

## Code Examples

### Minimal manifest shape (example)
```json
{
  "phase": "10-devnet-proof",
  "generatedAt": "2026-03-13T00:00:00Z",
  "canonicalPrograms": {
    "sss_1": {
      "programId": "<base58>",
      "explorerUrl": "https://explorer.solana.com/address/<base58>?cluster=devnet"
    },
    "sss_2": {
      "programId": "<base58>",
      "explorerUrl": "https://explorer.solana.com/address/<base58>?cluster=devnet"
    },
    "sss_transfer_hook": {
      "programId": "<base58>",
      "explorerUrl": "https://explorer.solana.com/address/<base58>?cluster=devnet"
    }
  },
  "runs": [
    {
      "runId": "phase10-a",
      "result": "pass",
      "sss1": { "summary": "...", "signaturesCsv": "..." },
      "sss2": { "summary": "...", "signaturesCsv": "..." }
    }
  ]
}
```

### Explorer URL pattern (stable)
```text
Program: https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet
Tx:      https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

## Open Decisions To Resolve During Planning

- Whether Phase 10 scripts should fork Phase 08 scripts or wrap/reuse them with `ARTIFACT_ROOT=artifacts/devnet/phase-10` and extended manifest logic.
- Exact file names for canonical summary and manifest outputs (context intentionally leaves this open).
- Whether to include optional stress-lane evidence in canonical reviewer package.
- Whether to treat IDL address regeneration as part of this phase deliverable or a post-deploy follow-up gate.

## Research Verdict

Phase 10 is ready to plan with high confidence. The critical success factor is not new protocol behavior; it is strict identity consistency plus deterministic, reviewer-verifiable evidence packaging. Planning should prioritize canonical ID publication and artifact contracts first, then representative lane execution and final traceability closeout.

## RESEARCH COMPLETE
