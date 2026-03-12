---
phase: 08
slug: testing-and-fuzzing
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-12
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Anchor integration + Mocha/ts-node + Rust cargo tests (Trident workspace) |
| **Config file** | `Anchor.toml`, workspace `package.json`, `trident-tests/Cargo.toml` |
| **Smoke run command** | `yarn test:sss1 && yarn test:sss2 && cargo check --manifest-path trident-tests/Cargo.toml -p fuzz_0` |
| **Quick run command** | `yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn test:services` |
| **Full suite command** | `yarn lint && yarn build && yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn workspace @stbr/sss-mint-burn test && yarn workspace @stbr/sss-compliance test && yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && cargo test --manifest-path trident-tests/Cargo.toml` |
| **Devnet proof lane command** | `./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run smoke subset `yarn test:sss1 && yarn test:sss2 && cargo check --manifest-path trident-tests/Cargo.toml -p fuzz_0`
- **After every 2-3 task commits or before handoff:** Run quick subset `yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn test:services`
- **After every plan wave:** Run `yarn lint && yarn build && yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn workspace @stbr/sss-mint-burn test && yarn workspace @stbr/sss-compliance test && yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && cargo test --manifest-path trident-tests/Cargo.toml`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 300 seconds (smoke subset)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | TST-01 | integration | `yarn test:sss1 && yarn test:sss2 && yarn test:integration` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 0 | TST-01 | workspace-integration | `yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 1 | TST-01 | integration | `yarn test:sss1 && yarn test:sss2` | ✅ | ⬜ pending |
| 08-02-02 | 02 | 1 | TST-01 | unit/rust | `cargo test --manifest-path programs/sss-1/Cargo.toml && cargo test --manifest-path programs/sss-2/Cargo.toml` | ❌ | ⬜ pending |
| 08-03-01 | 03 | 2 | TST-01 | cross-layer | `yarn test:integration && yarn test:sdk` | ✅ | ⬜ pending |
| 08-04-01 | 04 | 2 | TST-02 | fuzz-smoke | `cargo check --manifest-path trident-tests/Cargo.toml -p fuzz_0 && cargo test --manifest-path trident-tests/Cargo.toml` | ✅ | ⬜ pending |
| 08-05-01 | 05 | 3 | TST-03 | devnet/proof | `./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Baseline (Plan 08-01)

- `08-01` is the explicit Wave 0 prerequisite that locks executable command truth and validation contract before coverage/fuzz expansion.
- Wave 1+ plans (`08-02`..`08-05`) consume this baseline via `depends_on`.
- Wave 0 does not claim implementation completion of unit/fuzz/devnet artifacts; those are delivered in later waves with requirement mapping preserved.

---

## Command Truth Contract

- Canonical lane definitions are versioned in `docs/testing/phase-08-command-truth.md`.
- Any future Phase 8 plan that modifies lane commands must update both this validation file and the command-truth document in the same commit.
- Placeholder commands (`echo ... && exit 0`) are prohibited in Phase 8 verification lanes.

## TST-03 Artifact Contract

- Devnet proof/stress artifact definitions are canonical in `docs/testing/phase-08-devnet-evidence.md`.
- Required proof scripts:
  - `scripts/devnet/phase-08-sss1-proof.sh`
  - `scripts/devnet/phase-08-sss2-proof.sh`
  - `scripts/devnet/phase-08-stress.sh`
- Required fields for signoff:
  - deterministic `RUN_ID` path partitioning
  - command logs (`commands/*.cmd` + `commands/*.json`)
  - transaction signatures (`signatures.csv`)
  - pre/post state snapshots (`status` + `supply`)
  - explicit pass/fail summary (`summary.md`)
- Rerun evidence policy: minimum 2 successful reruns per lane with distinct `RUN_ID`s and retained artifacts.
- Retention policy: keep evidence artifacts for at least 30 days; never overwrite existing `RUN_ID` directories.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Devnet preset proof reproducibility and artifact quality | TST-03 | Requires funded devnet wallet and live RPC stability | Run phase-owned devnet script twice, confirm both runs emit signatures/logs/state snapshots under deterministic artifact paths and pass/fail summaries. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1200s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
