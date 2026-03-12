# Requirements

## Active

### FND-01 — Contributors can build and test the monorepo from the repository root

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Contributors can build and test the monorepo from the repository root

### FND-02 — Programs, SDK, CLI, services, tests, and docs live in stable package boundaries

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Programs, SDK, CLI, services, tests, and docs live in stable package boundaries

### FND-03 — Shared repo tooling covers Anchor, TypeScript, linting, formatting, and Trident scaffolding

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Shared repo tooling covers Anchor, TypeScript, linting, formatting, and Trident scaffolding

### TST-01 — The project includes unit and integration coverage for SSS-1 and SSS-2 flows

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The project includes unit and integration coverage for SSS-1 and SSS-2 flows

### TST-02 — The project includes Trident fuzz coverage for high-risk instruction paths

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The project includes Trident fuzz coverage for high-risk instruction paths

### TST-03 — The project includes devnet stress or proof flows for shipped presets

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The project includes devnet stress or proof flows for shipped presets

### DOC-01 — Reviewer-facing documentation explains architecture, presets, SDK usage, operations, compliance, and API surfaces

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Reviewer-facing documentation explains architecture, presets, SDK usage, operations, compliance, and API surfaces

### DOC-02 — Examples in the docs match the actual SDK and program interfaces

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Examples in the docs match the actual SDK and program interfaces

### DOC-03 — Operational documentation explains how to run the local stack and reviewer flows

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Operational documentation explains how to run the local stack and reviewer flows

### DEP-01 — Required programs are deployed to Solana Devnet with recorded program IDs

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Required programs are deployed to Solana Devnet with recorded program IDs

### DEP-02 — Representative SSS-1 and SSS-2 transactions run successfully on Devnet

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Representative SSS-1 and SSS-2 transactions run successfully on Devnet

### DEP-03 — Deployment proof is captured for reviewer verification

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Deployment proof is captured for reviewer verification

### OPS-01 — The backend stack can be started from a top-level Docker entry point

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The backend stack can be started from a top-level Docker entry point

### OPS-02 — Docker packaging covers default and SSS-2-specific service needs

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Docker packaging covers default and SSS-2-specific service needs

### OPS-03 — Docker usage is documented for reviewers

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Docker usage is documented for reviewers

### SUB-01 — The final PR contains code, tests, docs, deployment proof, and Docker setup

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The final PR contains code, tests, docs, deployment proof, and Docker setup

### SUB-02 — A short X walkthrough video exists and matches the shipped repo state

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

A short X walkthrough video exists and matches the shipped repo state

### SUB-03 — Submission artifacts are linked so reviewers can move between PR, proof, and demo quickly

- Status: active
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Submission artifacts are linked so reviewers can move between PR, proof, and demo quickly

## Validated

### CORE-01 — The shared Layer 1 contract defines `StablecoinConfig` and stablecoin state PDAs

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The shared Layer 1 contract defines `StablecoinConfig` and stablecoin state PDAs

### CORE-02 — The shared Layer 1 contract implements initialize, mint, burn, freeze, thaw, pause, unpause, role update, and authority transfer flows

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The shared Layer 1 contract implements initialize, mint, burn, freeze, thaw, pause, unpause, role update, and authority transfer flows

### CORE-03 — Layer 1 enforces authority roles, minter quotas, and global pause behavior with explicit Anchor errors

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Layer 1 enforces authority roles, minter quotas, and global pause behavior with explicit Anchor errors

### COMP-01 — The SSS-2 compliance layer enforces blacklist checks through a transfer-hook program

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The SSS-2 compliance layer enforces blacklist checks through a transfer-hook program

### COMP-02 — The compliance layer supports blacklist PDA management and seizure via Token-2022 permanent delegate behavior

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The compliance layer supports blacklist PDA management and seizure via Token-2022 permanent delegate behavior

### COMP-03 — Compliance-only actions are gated so they only activate when SSS-2 compliance is enabled

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Compliance-only actions are gated so they only activate when SSS-2 compliance is enabled

### PRE-01 — The project ships a minimal SSS-1 preset definition

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The project ships a minimal SSS-1 preset definition

### PRE-02 — The project ships a compliant SSS-2 preset definition

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The project ships a compliant SSS-2 preset definition

### PRE-03 — Teams can supply validated custom TOML or JSON configurations

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teams can supply validated custom TOML or JSON configurations

### SDK-01 — `@stbr/sss-token` exposes typed initialization flows for shipped presets and custom configs

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

`@stbr/sss-token` exposes typed initialization flows for shipped presets and custom configs

### SDK-02 — The SDK exposes stablecoin lifecycle operations consistent with the on-chain programs

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The SDK exposes stablecoin lifecycle operations consistent with the on-chain programs

### SDK-03 — The SDK exposes SSS-2 compliance helpers for blacklist and seizure workflows

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The SDK exposes SSS-2 compliance helpers for blacklist and seizure workflows

### CLI-01 — The `sss-token` CLI can initialize and manage SSS-1, SSS-2, and custom stablecoins

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The `sss-token` CLI can initialize and manage SSS-1, SSS-2, and custom stablecoins

### CLI-02 — The CLI exposes operator commands for mint, burn, freeze, thaw, pause, role management, and supply checks

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The CLI exposes operator commands for mint, burn, freeze, thaw, pause, role management, and supply checks

### CLI-03 — The CLI exposes SSS-2 compliance commands and reads runtime configuration from environment or config files

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The CLI exposes SSS-2 compliance commands and reads runtime configuration from environment or config files

### SRV-01 — The repo includes a mint/burn service for issuance lifecycle requests

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The repo includes a mint/burn service for issuance lifecycle requests

### SRV-02 — The repo includes an indexer that tracks on-chain activity into off-chain state

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The repo includes an indexer that tracks on-chain activity into off-chain state

### SRV-03 — The repo includes a compliance service for blacklist management, screening hooks, and audit export

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The repo includes a compliance service for blacklist management, screening hooks, and audit export

### SRV-04 — The repo includes a webhook service for downstream event delivery

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

The repo includes a webhook service for downstream event delivery

## Deferred

## Out of Scope
