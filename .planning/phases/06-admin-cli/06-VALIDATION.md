---
phase: 6
slug: admin-cli
status: finalized
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-10
updated: 2026-03-11
---

# Phase 6 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Mocha (SDK workspace) + Anchor integration tests |
| **Config file** | `package.json` scripts, `Anchor.toml`, `tsconfig.json` |
| **Quick run command** | `yarn test:sdk` |
| **Full suite command** | `yarn workspace @stbr/sss-token build && yarn test:sdk && yarn test:sss1 && yarn test:sss2` |
| **Estimated runtime** | ~6 minutes |

## Sampling Rate

- **After every task commit:** Run `yarn test:sdk` (or narrower targeted command when task-scoped)
- **After every plan wave:** Run the full Phase 6 suite chain
- **Before verification closeout:** Full suite chain must be green in a healthy local validator environment
- **Max feedback latency target:** < 6 minutes for full-chain feedback

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | CLI-01, CLI-03 | unit/integration | `yarn workspace @stbr/sss-token build && yarn test:sdk` | ✅ | ✅ green |
| 06-02-01 | 02 | 2 | CLI-01, CLI-02 | integration | `yarn workspace @stbr/sss-token build && yarn test:sdk` | ✅ | ✅ green |
| 06-03-01 | 03 | 3 | CLI-02, CLI-03 | integration/e2e | `yarn workspace @stbr/sss-token build && yarn test:sdk && yarn test:sss1 && yarn test:sss2` | ✅ | ✅ green |
| 06-04-01 | 04 | 4 | CLI-01, CLI-02, CLI-03 | regression | `yarn test:sss2` + full-chain rerun | ✅ | ✅ green |

## Wave 0 Requirements

- Existing repository infrastructure already covered phase validation needs.
- No Wave 0 test scaffolding additions were required.

## Manual-Only Verifications

All Phase 6 behaviors are covered by automated checks in SDK and Anchor test surfaces.

## Validation Sign-Off

- [x] All tasks have automated verification coverage
- [x] Sampling continuity maintained (no 3-task blind spot)
- [x] Wave 0 dependency gaps resolved (none required)
- [x] No watch-mode flags used in verification chain
- [x] Feedback latency target is explicit and tracked
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-11
