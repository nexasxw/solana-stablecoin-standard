---
phase: 02
slug: layer-1-core-program
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Anchor integration tests via `ts-mocha` |
| **Config file** | `Anchor.toml`, `tsconfig.json`, `tests/helpers/index.ts` |
| **Quick run command** | `yarn test:sss1` |
| **Full suite command** | `yarn test` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn test:sss1`
- **After every plan wave:** Run `yarn test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CORE-01 | integration | `yarn test:sss1` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | CORE-01 | integration | `yarn test:sss1` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | CORE-02 | integration | `yarn test:sss1` | ✅ | ⬜ pending |
| 02-03-02 | 03 | 2 | CORE-03 | integration | `yarn test:sss1` | ✅ | ⬜ pending |
| 02-04-01 | 04 | 2 | CORE-02, CORE-03 | integration | `yarn test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/sss-1.ts` - replace TODO scaffolding with runnable assertions for happy-path and negative-path Layer 1 behavior
- [ ] `tests/helpers/index.ts` - confirm helper coverage for PDA derivation, token account setup, and authority fixtures needed by the Phase 2 suite

---

## Manual-Only Verifications

All target Phase 2 behaviors should have automated coverage through Anchor integration tests. Manual review should only be used for code readability and scope enforcement, not as the primary proof of correctness.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
