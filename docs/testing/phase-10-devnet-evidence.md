# Phase 10 Devnet Evidence Contract (DEP-01/DEP-02/DEP-03)

This document defines the reviewer-facing evidence contract for Phase 10
devnet deployment and representative proof publication.

## Scope

- Requirements: `DEP-01`, `DEP-02`, `DEP-03`
- Canonical artifact root: `artifacts/devnet/phase-10`
- Required program set: `sss_1`, `sss_2`, `sss_transfer_hook`
- Representative lanes: `sss1-proof`, `sss2-proof` (stress evidence optional)

## Required Evidence Fields

Every accepted Phase 10 publication must include the following fields in both
human-readable summaries and machine-readable manifests:

- Canonical program IDs for `sss_1`, `sss_2`, and `sss_transfer_hook`
- Authority snapshot for each canonical program ID (deploy authority and
  upgrade authority evidence)
- Per-lane transaction signatures for all mutating operations
- At least one deterministic negative-path proof per lane with expected-failure
  evidence
- Explorer links for each canonical program ID and each required signature
- Run timestamps (UTC) used to enforce freshness checks

## Required Artifact Layout

Deployment identity lane:

- `artifacts/devnet/phase-10/deploy/$RUN_ID/summary.md`
- `artifacts/devnet/phase-10/deploy/$RUN_ID/manifest.json`
- `artifacts/devnet/phase-10/deploy/$RUN_ID/program-authorities.json`
- `artifacts/devnet/phase-10/deploy/$RUN_ID/deploy-signatures.csv`

SSS-1 proof lane:

- `artifacts/devnet/phase-10/sss1-proof/$RUN_ID/summary.md`
- `artifacts/devnet/phase-10/sss1-proof/$RUN_ID/manifest.json`
- `artifacts/devnet/phase-10/sss1-proof/$RUN_ID/signatures.csv`
- `artifacts/devnet/phase-10/sss1-proof/$RUN_ID/state/pre-*.json`
- `artifacts/devnet/phase-10/sss1-proof/$RUN_ID/state/post-*.json`
- `artifacts/devnet/phase-10/sss1-proof/$RUN_ID/state/negative-path-*.json`

SSS-2 proof lane:

- `artifacts/devnet/phase-10/sss2-proof/$RUN_ID/summary.md`
- `artifacts/devnet/phase-10/sss2-proof/$RUN_ID/manifest.json`
- `artifacts/devnet/phase-10/sss2-proof/$RUN_ID/signatures.csv`
- `artifacts/devnet/phase-10/sss2-proof/$RUN_ID/state/pre-*.json`
- `artifacts/devnet/phase-10/sss2-proof/$RUN_ID/state/post-*.json`
- `artifacts/devnet/phase-10/sss2-proof/$RUN_ID/state/blacklist-check.json`
- `artifacts/devnet/phase-10/sss2-proof/$RUN_ID/state/negative-path-*.json`

Optional stress evidence:

- `artifacts/devnet/phase-10/stress/$RUN_ID/summary.md`
- `artifacts/devnet/phase-10/stress/$RUN_ID/results.csv`
- `artifacts/devnet/phase-10/stress/$RUN_ID/logs/*.log`

## Acceptance Rules

- Reviewer acceptance requires **two successful full runs** with distinct
  `RUN_ID` values.
- A full run means deploy evidence plus both representative lanes
  (`sss1-proof` and `sss2-proof`) are pass.
- Any failed lane invalidates that full run for acceptance counting.
- Accepted evidence must be fresh: run completion timestamps must be within
  **24 hours** of reviewer handoff.
- Existing artifact directories for a `RUN_ID` are immutable and must never be
  overwritten.

## DEP Traceability Contract

| Requirement | Required Evidence | Acceptance Check |
| --- | --- | --- |
| `DEP-01` canonical identity publication | canonical program IDs, authority snapshot, deploy signatures, explorer links | IDs match `Anchor.toml` `[programs.devnet]` and all three program explorer pages resolve |
| `DEP-02` representative lane proof | `sss1-proof` and `sss2-proof` signatures/snapshots plus negative-path proof | both lanes pass in two full runs and required failure-path evidence exists |
| `DEP-03` reviewer package contract | `summary.md` + `manifest.json` per lane, deterministic paths, freshness metadata | reviewer can trace requirement -> command -> artifact -> explorer proof with no gaps |

## Explorer Link Requirements

Program URL format:

- `https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet`

Transaction URL format:

- `https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet`

Every canonical program ID and required transaction signature listed in
`manifest.json` must include its matching explorer URL.
