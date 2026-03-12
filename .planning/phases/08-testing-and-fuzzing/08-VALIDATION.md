---
phase: 08
slug: testing-and-fuzzing
status: draft
nyquist_compliant: true
wave_0_complete: false
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
| **Quick run command** | `yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk` |
| **Full suite command** | `yarn lint && yarn build && yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn workspace @stbr/sss-mint-burn test && yarn workspace @stbr/sss-compliance test && yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && cargo test --manifest-path trident-tests/Cargo.toml` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk`
- **After every plan wave:** Run `yarn lint && yarn build && yarn test:sss1 && yarn test:sss2 && yarn test:integration && yarn test:sdk && yarn workspace @stbr/sss-mint-burn test && yarn workspace @stbr/sss-compliance test && yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && cargo test --manifest-path trident-tests/Cargo.toml`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 900 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | TST-01 | integration | `yarn test:sss1 && yarn test:sss2 && yarn test:integration` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 1 | TST-01 | workspace-integration | `yarn workspace @stbr/sss-indexer run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts' && yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 1 | TST-01 | integration | `yarn test:sss1 && yarn test:sss2` | ✅ | ⬜ pending |
| 08-02-02 | 02 | 1 | TST-01 | unit/rust | `cargo test --manifest-path programs/sss-1/Cargo.toml && cargo test --manifest-path programs/sss-2/Cargo.toml` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | TST-01 | cross-layer | `yarn test:integration && yarn test:sdk` | ✅ | ⬜ pending |
| 08-04-01 | 04 | 2 | TST-02 | fuzz-smoke | `cargo check --manifest-path trident-tests/Cargo.toml -p fuzz_0 && cargo test --manifest-path trident-tests/Cargo.toml` | ✅ | ⬜ pending |
| 08-05-01 | 05 | 3 | TST-03 | devnet/proof | `./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `programs/sss-1/src/lib.rs` / `programs/sss-1/src/**/*.rs` unit test modules (`#[cfg(test)]`) for high-value pure logic
- [ ] `programs/sss-2/src/lib.rs` / `programs/sss-2/src/**/*.rs` unit test modules (`#[cfg(test)]`) for high-value pure logic
- [ ] `trident-tests/fuzz_0/src/bin/fuzz_0.rs` replaced with real instruction corpus + invariants
- [ ] `scripts/devnet/` proof/stress runner scripts and artifact export paths

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
