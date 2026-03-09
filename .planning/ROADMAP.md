# Roadmap: Solana Stablecoin Standard (SSS)

## Overview

This roadmap imports the existing Linear project plan into the local GSD workflow. The sequence follows the dependency chain from the monorepo foundation through the shared contract layer, compliance and presets, developer tooling, services, validation, reviewer proof, and final submission.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Monorepo Foundation** - Establish the Anchor and TypeScript workspace baseline described by NEX-5
- [ ] **Phase 2: Layer 1 Core Program** - Build the shared stablecoin contract that all later layers depend on
- [ ] **Phase 3: Compliance Module** - Add the transfer-hook and blacklist enforcement needed for SSS-2
- [ ] **Phase 4: Preset Configurations** - Ship the SSS-1 and SSS-2 presets plus custom config validation
- [ ] **Phase 5: TypeScript SDK** - Expose developer-facing APIs for initialization and operations
- [ ] **Phase 6: Admin CLI** - Build the operator CLI on top of the SDK
- [ ] **Phase 7: Backend Services** - Build issuance, indexing, compliance, and webhook services
- [ ] **Phase 8: Testing And Fuzzing** - Build the confidence layer for the shipped protocol and tooling
- [ ] **Phase 9: Documentation** - Turn the implementation into reviewer-ready docs and examples
- [ ] **Phase 10: Devnet Proof** - Deploy to devnet and capture representative transaction proof
- [ ] **Phase 11: Docker Packaging** - Package the backend stack behind one reviewer-friendly entry point
- [ ] **Phase 12: Submission** - Assemble the final PR, proof, and walkthrough artifacts

## Phase Details

### Phase 1: Monorepo Foundation
**Goal**: Lock in the repository structure, package boundaries, and shared tooling needed for the rest of the project.
**Depends on**: Nothing (first phase)
**Requirements**: [FND-01, FND-02, FND-03]
**Success Criteria** (what must be TRUE):
  1. Contributors can install dependencies and run the main build and test commands from the root.
  2. Programs, SDK code, service code, tests, and docs live in stable and documented locations.
  3. Shared repo tooling covers Anchor, TypeScript, formatting, and CI expectations.
**Plans**: 1 plan

Plans:
- [x] 01-01: Imported as complete from Linear issue NEX-5 and confirmed by existing repository structure

### Phase 2: Layer 1 Core Program
**Goal**: Deliver the shared Layer 1 Anchor program for stablecoin lifecycle operations, role control, quotas, and pause behavior.
**Depends on**: Phase 1
**Requirements**: [CORE-01, CORE-02, CORE-03]
**Success Criteria** (what must be TRUE):
  1. The Layer 1 contract creates the requested stablecoin configuration and mint state correctly.
  2. Core instructions succeed on the happy path and reject unauthorized or invalid calls.
  3. Role checks, per-minter quotas, and pause state are enforced on-chain.
  4. Later preset, SDK, service, test, and deployment work can build on a stable shared contract.
**Plans**: TBD

Plans:
- [ ] 02-01: Generate executable plans via `$gsd-plan-phase 2`

### Phase 3: Compliance Module
**Goal**: Deliver the SSS-2 compliance layer using a transfer-hook program, blacklist PDAs, and seizure support.
**Depends on**: Phase 2
**Requirements**: [COMP-01, COMP-02, COMP-03]
**Success Criteria** (what must be TRUE):
  1. Blacklist checks run through the compliance hook on every relevant transfer path.
  2. Blacklist management and seizure flows are represented on-chain with the required metadata and authority checks.
  3. Compliance-only behavior stays gated to compliant deployments.
**Plans**: TBD

Plans:
- [ ] 03-01: Generate executable plans via `$gsd-plan-phase 3`

### Phase 4: Preset Configurations
**Goal**: Ship the SSS-1 and SSS-2 presets plus validation for custom config files.
**Depends on**: Phase 3
**Requirements**: [PRE-01, PRE-02, PRE-03]
**Success Criteria** (what must be TRUE):
  1. The project exposes a minimal preset and a compliant preset with clear extension and role expectations.
  2. Custom TOML and JSON configuration files are parsed and validated.
  3. Preset behavior is aligned with the Layer 1 and compliance contract surfaces.
**Plans**: TBD

Plans:
- [ ] 04-01: Generate executable plans via `$gsd-plan-phase 4`

### Phase 5: TypeScript SDK
**Goal**: Deliver the public TypeScript SDK for initialization, lifecycle operations, and compliance helpers.
**Depends on**: Phase 4
**Requirements**: [SDK-01, SDK-02, SDK-03]
**Success Criteria** (what must be TRUE):
  1. Developers can initialize SSS-1, SSS-2, and custom deployments through the SDK.
  2. Lifecycle operations are exposed through typed APIs consistent with the on-chain programs.
  3. Compliance helper APIs cover the SSS-2 operator workflows.
**Plans**: TBD

Plans:
- [ ] 05-01: Generate executable plans via `$gsd-plan-phase 5`

### Phase 6: Admin CLI
**Goal**: Deliver the `sss-token` CLI for operators using the SDK internally.
**Depends on**: Phase 5
**Requirements**: [CLI-01, CLI-02, CLI-03]
**Success Criteria** (what must be TRUE):
  1. Operators can initialize and manage tokens from the CLI for shipped presets and custom configs.
  2. The CLI supports the expected stablecoin lifecycle and compliance command set.
  3. Runtime configuration works cleanly through config files or environment variables.
**Plans**: TBD

Plans:
- [ ] 06-01: Generate executable plans via `$gsd-plan-phase 6`

### Phase 7: Backend Services
**Goal**: Deliver the mint/burn, indexer, compliance, and webhook services that support off-chain workflows.
**Depends on**: Phase 6
**Requirements**: [SRV-01, SRV-02, SRV-03, SRV-04]
**Success Criteria** (what must be TRUE):
  1. Issuance lifecycle requests can flow through the backend service layer.
  2. On-chain activity is indexed into usable off-chain state.
  3. Compliance and webhook services expose the expected downstream integration hooks.
**Plans**: TBD

Plans:
- [ ] 07-01: Generate executable plans via `$gsd-plan-phase 7`

### Phase 8: Testing And Fuzzing
**Goal**: Build the confidence layer for the stablecoin stack across unit, integration, fuzz, and devnet-oriented verification.
**Depends on**: Phase 7
**Requirements**: [TST-01, TST-02, TST-03]
**Success Criteria** (what must be TRUE):
  1. Unit and integration coverage exercises the core SSS-1 and SSS-2 flows.
  2. High-risk instruction paths have Trident fuzz coverage.
  3. Devnet or stress verification exists for the shipped presets.
**Plans**: TBD

Plans:
- [ ] 08-01: Generate executable plans via `$gsd-plan-phase 8`

### Phase 9: Documentation
**Goal**: Turn the shipped implementation into reviewer-facing documentation and examples.
**Depends on**: Phase 8
**Requirements**: [DOC-01, DOC-02, DOC-03]
**Success Criteria** (what must be TRUE):
  1. Reviewers can understand the layered architecture, preset differences, SDK usage, and operations model from the docs.
  2. Examples match the actual interfaces and workflows implemented in the repo.
  3. Operational docs cover local stack setup and reviewer verification flows.
**Plans**: TBD

Plans:
- [ ] 09-01: Generate executable plans via `$gsd-plan-phase 9`

### Phase 10: Devnet Proof
**Goal**: Deploy the required programs to Solana Devnet and capture proof of representative flows.
**Depends on**: Phase 9
**Requirements**: [DEP-01, DEP-02, DEP-03]
**Success Criteria** (what must be TRUE):
  1. Required programs are deployed to Devnet with recorded program IDs.
  2. Representative SSS-1 and SSS-2 transactions run successfully on Devnet.
  3. Reviewers have the evidence needed to verify the deployment and flows.
**Plans**: TBD

Plans:
- [ ] 10-01: Generate executable plans via `$gsd-plan-phase 10`

### Phase 11: Docker Packaging
**Goal**: Package the backend stack into one Docker-based entry point for reviewers.
**Depends on**: Phase 10
**Requirements**: [OPS-01, OPS-02, OPS-03]
**Success Criteria** (what must be TRUE):
  1. Reviewers can start the backend stack from a top-level Docker command.
  2. Packaging covers both the default service set and SSS-2-specific needs.
  3. Docker usage is documented for local and reviewer flows.
**Plans**: TBD

Plans:
- [ ] 11-01: Generate executable plans via `$gsd-plan-phase 11`

### Phase 12: Submission
**Goal**: Package the final repository, proof, and presentation into a valid bounty submission.
**Depends on**: Phase 11
**Requirements**: [SUB-01, SUB-02, SUB-03]
**Success Criteria** (what must be TRUE):
  1. The final PR contains code, tests, docs, deployment proof, and Docker setup.
  2. The walkthrough video reflects the real shipped repository state.
  3. Submission artifacts are linked clearly for reviewer navigation.
**Plans**: TBD

Plans:
- [ ] 12-01: Generate executable plans via `$gsd-plan-phase 12`

## Progress

**Execution Order:**
Phases execute in numeric order: 2 → 2.1 → 2.2 → 3 → 3.1 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Foundation | 1/1 | Complete | 2026-03-09 |
| 2. Layer 1 Core Program | 0/1 | Not started | - |
| 3. Compliance Module | 0/1 | Not started | - |
| 4. Preset Configurations | 0/1 | Not started | - |
| 5. TypeScript SDK | 0/1 | Not started | - |
| 6. Admin CLI | 0/1 | Not started | - |
| 7. Backend Services | 0/1 | Not started | - |
| 8. Testing And Fuzzing | 0/1 | Not started | - |
| 9. Documentation | 0/1 | Not started | - |
| 10. Devnet Proof | 0/1 | Not started | - |
| 11. Docker Packaging | 0/1 | Not started | - |
| 12. Submission | 0/1 | Not started | - |
