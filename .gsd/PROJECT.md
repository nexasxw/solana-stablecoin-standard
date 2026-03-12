# Solana Stablecoin Standard (SSS)

## What This Is

Solana Stablecoin Standard is an open-source Solana stablecoin stack built around two presets: SSS-1 for minimal stablecoins and SSS-2 for compliant deployments. It combines Anchor programs, a TypeScript SDK and CLI, backend service scaffolding, and reviewer-facing documentation so teams can issue and operate stablecoins with a consistent contract surface.

## Core Value

Ship a modular stablecoin standard on Solana that gives issuers one clear path from core contract logic to presets, tooling, operations, and reviewer proof.

## Requirements

### Validated

- ✓ Repo foundation exists for Anchor programs, TypeScript packages, docs, and shared tooling — existing
- ✓ Baseline SSS reference docs exist for architecture and preset framing — existing
- ✓ Codebase mapping exists under `.planning/codebase/` to support planning and execution — existing

### Active

- [ ] Deliver the testing/fuzzing, documentation, devnet proof, Docker packaging, and submission slices before bounty deadline
- [ ] Keep cross-service backend contracts and observability stable while extending verification depth

### Out of Scope

- End-user web or mobile wallet UI — the current scope is protocol, operator tooling, and backend integration
- Production fiat rails or banking integrations — the repository focuses on reference stablecoin infrastructure
- Mainnet launch operations — the current milestone targets open-source delivery and devnet proof

## Context

This repository is a brownfield monorepo with existing Anchor, TypeScript, docs, and service scaffolding already in place. The source-of-truth project planning currently lives in Linear under the "Solana Stablecoin Standard (SSS)" project, and the local GSD planning files are being imported from that existing plan so phase workflows can run in-repo. The project is time-bound by the Superteam Brazil bounty deadline on 2026-03-14.

## Constraints

- **Tech stack**: Solana + Anchor + Token-2022 + TypeScript — the repo structure and issue scopes already assume this stack
- **Timeline**: Deliver before 2026-03-14 — the bounty deadline constrains sequencing and scope
- **Compatibility**: Shared core contract must support both SSS-1 and SSS-2 — later presets and SDK layers depend on stable Layer 1 interfaces
- **Documentation**: Program and SDK surfaces must stay aligned with docs and operator tooling — reviewer usability is part of the deliverable
- **Security**: Role controls, quotas, pause behavior, and compliance hooks must be enforced on-chain — stablecoin control surfaces are security-sensitive

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Linear issues as the source for initial roadmap import | The project was already scoped there before local GSD scaffolding existed | ✓ Good |
| Treat the existing monorepo foundation as Phase 1 complete | The repository already contains the workspace, package structure, and baseline docs described by NEX-5 | ✓ Good |
| Plan the remaining work as layered phases from core contract to submission | The Linear issue set is already organized around that dependency chain | ✓ Good |

---
*Last updated: 2026-03-09 after Linear roadmap import*
