---
phase: 10
slug: devnet-proof
status: ready
nyquist_compliant: true
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
| **Quick run command** | `anchor --version && solana --version && solana config get && ./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help` |
| **Full suite command** | `anchor build && anchor deploy --provider.cluster devnet --program-name sss_1 && anchor deploy --provider.cluster devnet --program-name sss_2 && anchor deploy --provider.cluster devnet --program-name sss_transfer_hook && RUN_ID=<run-a> ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<run-a> ./scripts/devnet/phase-10-sss2-proof.sh && RUN_ID=<run-b> ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<run-b> ./scripts/devnet/phase-10-sss2-proof.sh` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command baseline
- **After every plan wave:** Run full suite for affected proof lanes
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds (quick) / 900 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Verification Type | Gate |
|---------|------|------|-------------|-------------------|------|
| 10-01-01 | 10-01 | 0 | DEP-01, DEP-02, DEP-03 | automated | `rg -n "phase-10|RUN_ID|artifacts/devnet/phase-10|sss1-proof|sss2-proof|manifest" scripts/devnet/README.md` |
| 10-01-02 | 10-01 | 0 | DEP-01, DEP-02, DEP-03 | automated | `rg -n "DEP-01|DEP-02|DEP-03|canonical|authority snapshot|explorer|two successful full runs|24 hours" docs/testing/phase-10-devnet-evidence.md` |
| 10-01-03 | 10-01 | 0 | DEP-01, DEP-02, DEP-03 | automated | `rg -n "10-01|10-02|10-03|10-04|10-05|DEP-01|DEP-02|DEP-03|nyquist_compliant" .planning/phases/10-devnet-proof/10-VALIDATION.md` |
| 10-02-01 | 10-02 | 1 | DEP-01 | automated + prerequisite | `anchor --version && solana --version && solana config get` (full deploy chain is plan-level gate) |
| 10-02-02 | 10-02 | 1 | DEP-01, DEP-03 | automated | `rg -n "\\[programs\\.devnet\\]|sss_1|sss_2|sss_transfer_hook" Anchor.toml docs/SSS-1.md docs/SSS-2.md` |
| 10-02-03 | 10-02 | 1 | DEP-01, DEP-03 | automated | `test -f artifacts/devnet/phase-10/deploy/<RUN_ID>/manifest.json && rg -n "\"canonicalPrograms\"|\"authoritySnapshots\"|\"explorerUrl\"|\"idEquality\"" artifacts/devnet/phase-10/deploy/<RUN_ID>/manifest.json` |
| 10-03-01 | 10-03 | 2 | DEP-02 | automated + Wave 0 dependency | `bash -n scripts/devnet/phase-10-sss1-proof.sh && ./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help` |
| 10-03-02 | 10-03 | 2 | DEP-02 | automated + Wave 0 dependency | `bash -n scripts/devnet/phase-10-sss2-proof.sh && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help` |
| 10-03-03 | 10-03 | 2 | DEP-02, DEP-03 | automated | `rg -n "phase-10-sss1-proof|phase-10-sss2-proof|signatures\\.csv|summary\\.md|run-metadata\\.env|negative-path" scripts/devnet/README.md` |
| 10-04-01 | 10-04 | 3 | DEP-02 | automated + Wave 0 dependency | `RUN_ID=<smoke-a> ./scripts/devnet/phase-10-sss1-proof.sh && RUN_ID=<smoke-b> ./scripts/devnet/phase-10-sss2-proof.sh` |
| 10-04-02 | 10-04 | 3 | DEP-03 | automated | `test -f artifacts/devnet/phase-10/publication/phase-10-proof-summary.md && test -f artifacts/devnet/phase-10/publication/phase-10-proof-manifest.json && rg -n "canonicalPrograms|runs|explorerUrl|result|generatedAt" artifacts/devnet/phase-10/publication/phase-10-proof-manifest.json` |
| 10-04-03 | 10-04 | 3 | DEP-01, DEP-02, DEP-03 | automated | `rg -n "RUN_ID|phase-10-proof-summary|phase-10-proof-manifest|DEP-01|DEP-02|DEP-03|explorer" docs/testing/phase-10-devnet-evidence.md` |
| 10-05-01 | 10-05 | 4 | DEP-01, DEP-02, DEP-03 | automated + Wave 0 dependency | `rg -n "DEP-01|DEP-02|DEP-03|phase-10-proof-summary|phase-10-proof-manifest" docs/TRACEABILITY.md` |
| 10-05-02 | 10-05 | 4 | DEP-01, DEP-02, DEP-03 | automated + Wave 0 dependency | `rg -n "DEP-01|DEP-02|DEP-03|accepted runs|freshness|24 hours|status:\\s*(passed|complete)" .planning/phases/10-devnet-proof/10-VERIFICATION.md .planning/phases/10-devnet-proof/10-VALIDATION.md` |
| 10-05-03 | 10-05 | 4 | DEP-01, DEP-02, DEP-03 | automated + Wave 0 dependency | `rg -n "current_phase|current_plan|status|last_activity|devnet proof|Phase 10" .planning/STATE.md` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/devnet/phase-10-sss1-proof.sh` — deterministic SSS-1 Phase-10 lane script (required by 10-03, 10-04, 10-05)
- [ ] `scripts/devnet/phase-10-sss2-proof.sh` — deterministic SSS-2 Phase-10 lane script (required by 10-03, 10-04, 10-05)
- [x] `docs/testing/phase-10-devnet-evidence.md` — reviewer contract for DEP-03 (delivered in 10-01)
- [ ] `artifacts/devnet/phase-10/*/manifest.json` schema + generator contract (required by 10-02 and 10-04 outputs)
- [ ] `artifacts/devnet/phase-10/publication/phase-10-proof-manifest.json` canonical reviewer package (required before 10-05 closeout)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Explorer link resolution for all published program IDs and tx signatures | DEP-03 | External explorer availability | Open each URL from manifest/docs and confirm resource resolves on devnet |
| 24-hour freshness gate for accepted runs | DEP-03 | Time-window acceptance against submission handoff | Compare run timestamps in manifest/summary with final handoff timestamp |

---

## Validation Sign-Off

- [x] All tasks (10-01 through 10-05) have `<automated>` verify or explicit Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 dependencies explicitly referenced where execution prerequisites exist
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s (quick)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
