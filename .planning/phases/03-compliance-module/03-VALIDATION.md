---
phase: 03
slug: compliance-module
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Anchor integration tests via `ts-mocha` |
| **Config file** | `Anchor.toml`, `tsconfig.json`, `tests/helpers/index.ts` |
| **Quick run command** | `yarn test:sss2` |
| **Full suite command** | `yarn test` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn test:sss2`
- **After every plan wave:** Run `yarn test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | COMP-01 | integration | `yarn test:sss2` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | COMP-02, COMP-03 | integration | `yarn test:sss2` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 2 | COMP-01..03 | integration | `yarn test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all Phase 3 requirements.

---

## Manual-Only Verifications

All Phase 3 behaviors should have automated coverage through Anchor integration tests. Manual review should be used only for scope enforcement and doc/code alignment, not as the primary proof of correctness.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

