---
phase: 10
slug: devnet-proof
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bash + Anchor/Solana CLI command contracts |
| **Config file** | none — command-driven verification |
| **Quick run command** | `./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help && anchor --version && solana --version && solana config get` |
| **Full suite command** | `RUN_ID=<run-a> ... ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<run-a> ... ./scripts/devnet/phase-10-sss2-proof.sh && RUN_ID=<run-b> ... ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<run-b> ... ./scripts/devnet/phase-10-sss2-proof.sh` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command baseline
- **After every plan wave:** Run full suite for affected proof lanes
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds (quick) / 900 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DEP-01 | command-contract | `anchor --version && solana --version && solana config get` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | DEP-01 | deployment-proof | `anchor build && anchor deploy --provider.cluster devnet --program-name sss_1 && anchor deploy --provider.cluster devnet --program-name sss_2 && anchor deploy --provider.cluster devnet --program-name sss_transfer_hook` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | DEP-02 | integration-proof | `RUN_ID=<id> ... ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<id> ... ./scripts/devnet/phase-10-sss2-proof.sh` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 2 | DEP-02, DEP-03 | rerun-proof | `RUN_ID=<a> ... ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<a> ... ./scripts/devnet/phase-10-sss2-proof.sh && RUN_ID=<b> ... ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<b> ... ./scripts/devnet/phase-10-sss2-proof.sh` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 | 3 | DEP-01, DEP-02, DEP-03 | artifact-validation | `test -f artifacts/devnet/phase-10/<...>/summary.md && test -f artifacts/devnet/phase-10/<...>/manifest.json` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/devnet/phase-10-sss1-proof.sh` — deterministic SSS-1 Phase-10 lane script
- [ ] `scripts/devnet/phase-10-sss2-proof.sh` — deterministic SSS-2 Phase-10 lane script
- [ ] `docs/testing/phase-10-devnet-evidence.md` — reviewer contract for DEP-03
- [ ] `artifacts/devnet/phase-10/*/manifest.json` schema + generator contract

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Explorer link resolution for all published program IDs and tx signatures | DEP-03 | External explorer availability | Open each URL from manifest/docs and confirm resource resolves on devnet |
| 24-hour freshness gate for accepted runs | DEP-03 | Time-window acceptance against submission handoff | Compare run timestamps in manifest/summary with final handoff timestamp |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s (quick)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
