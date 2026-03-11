# Requirements: Solana Stablecoin Standard (SSS)

**Defined:** 2026-03-09
**Core Value:** Ship a modular stablecoin standard on Solana that gives issuers one clear path from core contract logic to presets, tooling, operations, and reviewer proof.

## v1 Requirements

### Foundation

- [ ] **FND-01**: Contributors can build and test the monorepo from the repository root
- [ ] **FND-02**: Programs, SDK, CLI, services, tests, and docs live in stable package boundaries
- [ ] **FND-03**: Shared repo tooling covers Anchor, TypeScript, linting, formatting, and Trident scaffolding

### Core Contract

- [x] **CORE-01**: The shared Layer 1 contract defines `StablecoinConfig` and stablecoin state PDAs
- [x] **CORE-02**: The shared Layer 1 contract implements initialize, mint, burn, freeze, thaw, pause, unpause, role update, and authority transfer flows
- [x] **CORE-03**: Layer 1 enforces authority roles, minter quotas, and global pause behavior with explicit Anchor errors

### Compliance

- [x] **COMP-01**: The SSS-2 compliance layer enforces blacklist checks through a transfer-hook program
- [x] **COMP-02**: The compliance layer supports blacklist PDA management and seizure via Token-2022 permanent delegate behavior
- [x] **COMP-03**: Compliance-only actions are gated so they only activate when SSS-2 compliance is enabled

### Presets

- [x] **PRE-01**: The project ships a minimal SSS-1 preset definition
- [x] **PRE-02**: The project ships a compliant SSS-2 preset definition
- [x] **PRE-03**: Teams can supply validated custom TOML or JSON configurations

### SDK

- [x] **SDK-01**: `@stbr/sss-token` exposes typed initialization flows for shipped presets and custom configs
- [x] **SDK-02**: The SDK exposes stablecoin lifecycle operations consistent with the on-chain programs
- [x] **SDK-03**: The SDK exposes SSS-2 compliance helpers for blacklist and seizure workflows

### CLI

- [x] **CLI-01**: The `sss-token` CLI can initialize and manage SSS-1, SSS-2, and custom stablecoins
- [x] **CLI-02**: The CLI exposes operator commands for mint, burn, freeze, thaw, pause, role management, and supply checks
- [x] **CLI-03**: The CLI exposes SSS-2 compliance commands and reads runtime configuration from environment or config files

### Services

- [x] **SRV-01**: The repo includes a mint/burn service for issuance lifecycle requests
- [ ] **SRV-02**: The repo includes an indexer that tracks on-chain activity into off-chain state
- [ ] **SRV-03**: The repo includes a compliance service for blacklist management, screening hooks, and audit export
- [ ] **SRV-04**: The repo includes a webhook service for downstream event delivery

### Verification

- [ ] **TST-01**: The project includes unit and integration coverage for SSS-1 and SSS-2 flows
- [ ] **TST-02**: The project includes Trident fuzz coverage for high-risk instruction paths
- [ ] **TST-03**: The project includes devnet stress or proof flows for shipped presets

### Documentation

- [ ] **DOC-01**: Reviewer-facing documentation explains architecture, presets, SDK usage, operations, compliance, and API surfaces
- [ ] **DOC-02**: Examples in the docs match the actual SDK and program interfaces
- [ ] **DOC-03**: Operational documentation explains how to run the local stack and reviewer flows

### Deployment

- [ ] **DEP-01**: Required programs are deployed to Solana Devnet with recorded program IDs
- [ ] **DEP-02**: Representative SSS-1 and SSS-2 transactions run successfully on Devnet
- [ ] **DEP-03**: Deployment proof is captured for reviewer verification

### Operations

- [ ] **OPS-01**: The backend stack can be started from a top-level Docker entry point
- [ ] **OPS-02**: Docker packaging covers default and SSS-2-specific service needs
- [ ] **OPS-03**: Docker usage is documented for reviewers

### Submission

- [ ] **SUB-01**: The final PR contains code, tests, docs, deployment proof, and Docker setup
- [ ] **SUB-02**: A short X walkthrough video exists and matches the shipped repo state
- [ ] **SUB-03**: Submission artifacts are linked so reviewers can move between PR, proof, and demo quickly

## v2 Requirements

### Ecosystem Expansion

- **V2-01**: Production admin dashboards for non-CLI operators
- **V2-02**: Mainnet rollout and production operations playbooks
- **V2-03**: Fiat banking or custody integrations beyond the reference backend services

## Out of Scope

| Feature | Reason |
|---------|--------|
| Consumer-facing wallet UI | Not required for the standard, operator tooling, or bounty review |
| Mobile application | Would dilute effort from protocol and tooling deliverables |
| Mainnet launch process | Current milestone targets local/devnet proof, not production rollout |
| Fiat onboarding rails | External integrations are beyond the current open-source scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| CORE-01 | Phase 2 | Complete |
| CORE-02 | Phase 2 | Complete |
| CORE-03 | Phase 2 | Complete |
| COMP-01 | Phase 3 | Complete |
| COMP-02 | Phase 3 | Complete |
| COMP-03 | Phase 3 | Complete |
| PRE-01 | Phase 4 | Complete |
| PRE-02 | Phase 4 | Complete |
| PRE-03 | Phase 4 | Complete |
| SDK-01 | Phase 5 | Complete |
| SDK-02 | Phase 5 | Complete |
| SDK-03 | Phase 5 | Complete |
| CLI-01 | Phase 6 | Complete |
| CLI-02 | Phase 6 | Complete |
| CLI-03 | Phase 6 | Complete |
| SRV-01 | Phase 7 | Complete |
| SRV-02 | Phase 7 | Pending |
| SRV-03 | Phase 7 | Pending |
| SRV-04 | Phase 7 | Pending |
| TST-01 | Phase 8 | Pending |
| TST-02 | Phase 8 | Pending |
| TST-03 | Phase 8 | Pending |
| DOC-01 | Phase 9 | Pending |
| DOC-02 | Phase 9 | Pending |
| DOC-03 | Phase 9 | Pending |
| DEP-01 | Phase 10 | Pending |
| DEP-02 | Phase 10 | Pending |
| DEP-03 | Phase 10 | Pending |
| OPS-01 | Phase 11 | Pending |
| OPS-02 | Phase 11 | Pending |
| OPS-03 | Phase 11 | Pending |
| SUB-01 | Phase 12 | Pending |
| SUB-02 | Phase 12 | Pending |
| SUB-03 | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after Linear roadmap import*
