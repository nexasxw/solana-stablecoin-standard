# Phase 08 Devnet Evidence Contract (TST-03)

This document defines the operator evidence contract for deterministic SSS-1/SSS-2 proof and stress runs in Phase 08.

## Scope

- Requirement: `TST-03`
- Scripts:
  - `scripts/devnet/phase-08-sss1-proof.sh`
  - `scripts/devnet/phase-08-sss2-proof.sh`
  - `scripts/devnet/phase-08-stress.sh`
- Objective: rerunnable devnet proof artifacts with deterministic pathing, command records, signature traces, and pre/post state snapshots.

## Required Artifact Layout

SSS-1 proof:

- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/commands/*.cmd`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/commands/*.json`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/state/pre-status.json`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/state/pre-supply.json`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/state/post-status.json`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/state/post-supply.json`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/signatures.csv`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/run-metadata.env`
- `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/summary.md`

SSS-2 proof:

- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/commands/*.cmd`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/commands/*.json`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/state/pre-status.json`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/state/pre-supply.json`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/state/blacklist-check.json`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/state/post-status.json`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/state/post-supply.json`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/signatures.csv`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/run-metadata.env`
- `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/summary.md`

Stress:

- `artifacts/devnet/phase-08/stress/$RUN_ID/results.csv`
- `artifacts/devnet/phase-08/stress/$RUN_ID/logs/*.log`
- `artifacts/devnet/phase-08/stress/$RUN_ID/summary.md`

## Signature And Snapshot Requirements

- Every mutating CLI operation must emit a signature entry in `signatures.csv`.
- `signatures.csv` format must remain `operation,signature`.
- Each proof run must include both pre and post snapshots (`status` and `supply`).
- SSS-2 runs must also include blacklist state evidence in `state/blacklist-check.json`.

## Rerun Policy

- `RUN_ID` is mandatory and part of the artifact path.
- Scripts must fail fast if `.../$RUN_ID` already exists to prevent silent overwrite.
- Reviewer signoff requires at least two successful reruns with distinct `RUN_ID` values.
- Rerun evidence must preserve both `summary.md` and `signatures.csv` for each run.

## Retention Policy

- Keep all `TST-03` artifacts for a minimum of 30 days from run completion.
- Do not rewrite existing run directories; create a new `RUN_ID` for every execution.
- If storage cleanup is required, keep at least:
  - latest 2 successful SSS-1 runs
  - latest 2 successful SSS-2 runs
  - latest 2 successful stress runs

## Canonical Commands

Help-surface gate:

- `./scripts/sss-token --help`
- `./scripts/sss-token init --help`
- `./scripts/sss-token mint --help`
- `./scripts/sss-token blacklist --help`
- `./scripts/sss-token seize --help`

Proof execution:

- `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss1-proof.sh`
- `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss2-proof.sh`

Stress execution:

- `RUN_ID=<id> ITERATIONS=2 RETRY_LIMIT=1 ... ./scripts/devnet/phase-08-stress.sh`

## Reviewer Command-To-Artifact Table

| Command Lane | Command | Required Artifacts | Required Signature Evidence | Pass Criteria | Fail Criteria |
| --- | --- | --- | --- | --- | --- |
| SSS-1 proof lane | `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss1-proof.sh` | `commands/*.cmd`, `commands/*.json`, `state/pre-*.json`, `state/post-*.json`, `run-metadata.env`, `summary.md` under `artifacts/devnet/phase-08/sss1-proof/$RUN_ID` | `signatures.csv` present; every mutating operation has a non-empty signature value | Script exits `0`, all listed artifacts exist, `summary.md` reports pass | Non-zero exit, missing artifact, missing/empty signature, or overwritten run path |
| SSS-2 proof lane | `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss2-proof.sh` | `commands/*.cmd`, `commands/*.json`, `state/pre-*.json`, `state/post-*.json`, `state/blacklist-check.json`, `run-metadata.env`, `summary.md` under `artifacts/devnet/phase-08/sss2-proof/$RUN_ID` | `signatures.csv` present; seize/freeze-related operations recorded | Script exits `0`, required artifacts exist, `summary.md` reports pass | Non-zero exit, missing blacklist snapshot, missing signature evidence, or overwritten run path |
| Stress lane | `RUN_ID=<id> ITERATIONS=2 RETRY_LIMIT=1 ... ./scripts/devnet/phase-08-stress.sh` | `results.csv`, `logs/*.log`, `summary.md` under `artifacts/devnet/phase-08/stress/$RUN_ID` | Signatures are validated in underlying SSS-1/SSS-2 proof outputs | Script exits `0`, `results.csv` shows lane pass per iteration, `summary.md` reports pass | Any lane fails after retries, missing stress artifacts, or non-zero exit |

## TST-03 Traceability

| Requirement | Evidence Source | Required Fields |
| --- | --- | --- |
| `TST-03`: devnet stress/proof flows for shipped presets | `scripts/devnet/phase-08-sss1-proof.sh` and `scripts/devnet/phase-08-sss2-proof.sh` outputs | deterministic `RUN_ID` path, `signatures.csv`, pre/post snapshots, pass summary |
| `TST-03`: reproducible stress validation | `scripts/devnet/phase-08-stress.sh` outputs | bounded retries, explicit pass/fail summary, per-lane logs, results table |
