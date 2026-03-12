# Phase 9: Documentation - Research

**Researched:** 2026-03-12  
**Scope:** Planning inputs for `DOC-01`, `DOC-02`, `DOC-03`  
**Research question:** What documentation work is required to produce reviewer-facing, executable, and drift-resistant docs without changing protocol behavior?

## What Is Locked Already

From `09-CONTEXT.md`, these phase decisions are fixed:
- This phase documents shipped behavior; it does not add new protocol/SDK/CLI/service features.
- Documentation style is hybrid: concise concepts plus runnable command/code blocks.
- Source of truth is code and validation lanes, not historical prose.
- Coverage must include core, compliance, and operations flows.
- Critical examples must be validation-linked to tested command/script paths.
- Include failure-path examples with expected error shape/code behavior.
- Every major doc must include explicit prerequisites.
- CLI examples must show both human output intent and `--json` machine envelope behavior.
- Operations docs must be step-by-step with deterministic pass/fail and artifact mapping.
- Canonical local verification lane is `docker compose` plus `./scripts/sss-token`.

## Requirement Mapping (DOC-01 / DOC-02 / DOC-03)

`DOC-01` reviewer-facing architecture/presets/SDK/operations/compliance/API documentation:
- Reusable baseline exists in `README.md`, `docs/ARCHITECTURE.md`, `docs/SSS-1.md`, `docs/SSS-2.md`.
- Hard gap: README references `docs/SDK.md`, `docs/OPERATIONS.md`, `docs/COMPLIANCE.md`, `docs/API.md`, but these files are missing.
- Planning implication: Phase 9 must either create these docs or revise doc index links as part of a coherent reviewer IA.

`DOC-02` examples must match actual interfaces:
- Strong source anchors: `scripts/sss-token`, Phase 8 command truth, regression matrix, and devnet evidence contract.
- Drift risk exists where examples use placeholders not validated against current command surfaces.
- Planning implication: examples need direct provenance mapping (example -> command/script/test path).

`DOC-03` operational documentation for local stack and reviewer flows:
- Reusable runtime assets: `docker-compose.yml`, `scripts/sss-token`, `scripts/devnet/phase-08-*.sh`, and `scripts/devnet/README.md`.
- Missing operator runbook doc currently creates a reviewer onboarding gap.
- Planning implication: operations docs should include local stack bring-up, health checks, role/signing prerequisites, and evidence artifact walkthrough.

## Current Reusable Assets

### Canonical documentation and narrative assets
- `README.md`: project entrypoint, high-level architecture, quick-start, CLI and test command surface.
- `docs/ARCHITECTURE.md`: layer model, program roles, PDA seeds, token extension matrix, security model.
- `docs/SSS-1.md`, `docs/SSS-2.md`: standard-specific behavior, roles, instructions, config policy.

### Validation-linked executable assets
- `docs/testing/phase-08-command-truth.md`: quick/full/devnet command lanes with deterministic command contract.
- `docs/testing/phase-08-regression-matrix.md`: cross-layer evidence map from integration/SDK/services to `TST-01`.
- `docs/testing/phase-08-devnet-evidence.md`: artifact contract, rerun policy, signature/snapshot requirements.
- `scripts/sss-token`: canonical wrapper that builds SDK CLI when needed and enforces repo-root deterministic invocation.
- `scripts/devnet/phase-08-sss1-proof.sh`, `phase-08-sss2-proof.sh`, `phase-08-stress.sh`: deterministic reviewer evidence pipeline.
- `docker-compose.yml`: operational service topology, ports, health checks, and `sss2` profile.

## Hard Gaps To Plan Explicitly

1. Broken docs index contract in `README.md` (links to missing docs).
2. No consolidated operations runbook mapped to `docker compose` + CLI verifier flow (`DOC-03` gap).
3. No explicit command-to-artifact mapping tables in reviewer-facing docs (required by phase decisions).
4. Existing docs include placeholder program IDs and static examples that may be mistaken as deploy-proof.
5. Failure-path examples and JSON error-envelope examples are not consistently present across docs.
6. Prerequisite blocks are inconsistent (tool versions, required binaries, cluster assumptions).

## Standard Stack

Use repository-native documentation and validation assets only:
- Markdown docs under `README.md` and `docs/`.
- CLI examples rooted at `./scripts/sss-token` (not global `sss-token`).
- Local stack operations via `docker compose` and optional `--profile sss2`.
- Evidence references rooted in `docs/testing/phase-08-*.md` and `scripts/devnet/*`.
- Requirement traceability anchored to `DOC-01`, `DOC-02`, `DOC-03` and phase context decisions.

## Architecture Patterns

### 1) Reviewer-First Information Architecture
- Keep one clear reviewer path: architecture -> standard selection (SSS-1/SSS-2) -> usage surfaces (SDK/CLI) -> operations and verification evidence.
- Ensure README is a stable index that points only to existing documents.

### 2) Validation-Linked Example Contract
- Every critical command/code example includes provenance metadata:
  - command/script path,
  - expected output type (human or JSON),
  - linked verification lane or artifact contract.
- No example should exist without a source-of-truth reference.

### 3) Deterministic Operations Playbook
- Operations docs should be procedural and checkpointed:
  - prerequisites,
  - startup sequence,
  - health verification,
  - proof/stress evidence collection,
  - pass/fail interpretation.

### 4) Error-Surface Documentation Pattern
- Pair success-path examples with failure-path examples for role/permission/config issues.
- Prefer machine-branchable forms (`--json` output shape and `code` expectations) where available.

### 5) Separation Of Normative vs Evidence Content
- Normative docs describe expected behavior and interfaces.
- Evidence docs define how behavior is verified and what artifacts prove it.
- Cross-link both directions to prevent drift.

## Recommended Plan Decomposition (5 Plans)

1. `09-01` Documentation Inventory, IA, and Link Integrity
- Audit current docs and README index.
- Resolve missing/invalid links and lock target doc set for Phase 9.
- Define ownership and requirement mapping per doc (`DOC-01..03`).

2. `09-02` Architecture + Standard Docs Alignment
- Update `ARCHITECTURE.md`, `SSS-1.md`, `SSS-2.md` for consistency with current presets, extension policy, roles, and security language.
- Add prerequisite blocks and explicit failure-mode notes where required.

3. `09-03` SDK/CLI Usage And Example Contract
- Document SDK and CLI usage surfaces with executable examples tied to real command/test paths.
- Include both human-readable and JSON-envelope-oriented examples.
- Add explicit negative/failure examples for common operator mistakes.

4. `09-04` Operations Runbook + Reviewer Verification Flow
- Produce operational documentation for local stack startup and health checks using `docker compose` and `./scripts/sss-token`.
- Add command-to-artifact evidence tables aligned to Phase 8 devnet contract.

5. `09-05` Cross-Doc Traceability + Final Consistency Gate
- Add a traceability matrix (`DOC-01/02/03` -> doc sections -> executable evidence sources).
- Run link and command-surface verification pass.
- Finalize reviewer journey and eliminate contradictory terminology/examples.

## Don’t Hand-Roll

- Do not invent new command surfaces when canonical wrappers/scripts already exist.
- Do not create synthetic API contracts detached from existing services and tests.
- Do not write examples that cannot be tied back to existing validation lanes.
- Do not document placeholder values as operational truth without explicit placeholder labeling.

## Common Pitfalls

- Mixing `sss-token` global binary examples with `./scripts/sss-token` wrapper examples.
- Referencing `docker-compose` instead of `docker compose` where repo docs standardize the latter.
- Showing only happy-path commands and omitting deterministic failure behavior.
- Letting README docs index drift from actual files.
- Treating Phase 8 evidence docs as optional references instead of documentation source-of-truth anchors.

## Risks And Mitigations

1. Drift between docs and command behavior.
- Mitigation: require source mapping for each critical example to script/test/doc evidence files.

2. Reviewer confusion from missing docs linked in README.
- Mitigation: lock doc inventory first and enforce link integrity before deeper content edits.

3. Ambiguous operational success criteria.
- Mitigation: encode pass/fail checkpoints and required artifacts per command lane.

4. Over-documenting future phases (DEP/OPS/SUB) in Phase 9.
- Mitigation: keep scope constrained to current shipped behavior and explicitly label placeholders/deferred items.

5. Inconsistent terminology between architecture and standards docs.
- Mitigation: create a small glossary/term contract in Phase 9 and reconcile terms during final consistency pass.

## Execution Strategy

Recommended order and dependencies:
1. Lock docs inventory and fix index integrity (`09-01`) before rewriting content.
2. Align architecture and standards docs (`09-02`) to create stable conceptual ground.
3. Add SDK/CLI usage contracts (`09-03`) from validated command surfaces.
4. Add operations and reviewer verification runbook (`09-04`) with evidence mapping.
5. Execute traceability and consistency closeout (`09-05`) as gate for phase signoff.

Execution rules:
- Every plan task must produce a verifiable artifact (updated doc, matrix, or evidence table).
- Every changed example must be traceable to one validation source (`phase-08-command-truth`, regression matrix, devnet evidence contract, or executable scripts).
- No plan completes without requirement-tagged traceability updates for `DOC-01`, `DOC-02`, and/or `DOC-03`.

## Validation Architecture

Nyquist goal for Phase 9: documentation must be test-backed, link-clean, requirement-traceable, and operationally reproducible.

### Command Baseline

Quick gate (during documentation edits):
```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
docker compose config
```

Full gate (phase signoff candidate):
```bash
yarn lint
yarn build
yarn test:sss1
yarn test:sss2
yarn test:integration
yarn test:sdk
yarn test:services
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
docker compose up -d
docker compose ps
docker compose --profile sss2 up -d
docker compose --profile sss2 ps
```

Evidence lane (reviewer-proof contract):
```bash
# Command and artifact contract source docs
cat docs/testing/phase-08-command-truth.md
cat docs/testing/phase-08-regression-matrix.md
cat docs/testing/phase-08-devnet-evidence.md

# Optional live proof execution (environment-dependent)
RUN_ID=<id> ... ./scripts/devnet/phase-08-sss1-proof.sh
RUN_ID=<id> ... ./scripts/devnet/phase-08-sss2-proof.sh
RUN_ID=<id> ITERATIONS=2 RETRY_LIMIT=1 ... ./scripts/devnet/phase-08-stress.sh
```

### Requirement-Mapped Verification Strategy

`DOC-01`:
- Verify docs inventory exists and README links resolve to actual files.
- Verify architecture/presets/compliance/usage content references shipped surfaces and not unimplemented features.
- Evidence: doc index table + traceability matrix mapping each reviewer topic to concrete file sections.

`DOC-02`:
- Verify all critical examples map to executable command/script/test paths.
- Verify CLI examples include human and JSON-output contract coverage.
- Evidence: per-doc example provenance tables and command-surface checks.

`DOC-03`:
- Verify operations docs include step-by-step local stack bring-up and health checkpoints.
- Verify command-to-artifact mapping tables are present for reviewer proof flow.
- Evidence: operations runbook + mapping tables referencing Phase 8 evidence contract and scripts.

### Nyquist Planning Rules

1. Every documentation task must define a verification command and expected artifact before writing changes.
2. README/doc-index modifications require immediate link-integrity verification in the same plan.
3. Critical examples must include provenance references to executable assets.
4. Operations sections must include deterministic pass/fail criteria.
5. No phase signoff without an explicit `DOC-01/02/03` traceability table.

## Open Decisions To Resolve During Planning

- Whether to create missing docs (`SDK.md`, `OPERATIONS.md`, `COMPLIANCE.md`, `API.md`) or replace README doc-index with currently existing files plus testing docs.
- How much Phase 8 testing evidence to inline into primary docs vs link as external reference docs.
- Whether to centralize prerequisites in one shared section or repeat per-doc prerequisite blocks.
- How to label placeholder devnet program IDs so reviewers do not misread them as deployed truth before Phase 10.

## Research Verdict

Phase 9 is ready to plan with high confidence. The core risk is not missing technical capability; it is documentation drift and reviewer path fragmentation. Planning should prioritize doc inventory integrity first, then validation-linked example contracts, then operations/reviewer proof clarity, with explicit `DOC-01/02/03` traceability as the final gate.

## RESEARCH COMPLETE
