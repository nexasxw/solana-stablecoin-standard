---
phase: 5
slug: typescript-sdk
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | mocha + ts-node (Anchor/SDK workspace tests) |
| **Config file** | `package.json` scripts + `tsconfig.json` |
| **Quick run command** | `yarn test:sdk` |
| **Full suite command** | `yarn test` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn test:sdk`
- **After every plan wave:** Run `yarn test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | SDK-01 | integration | `yarn test:sdk` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 1 | SDK-02 | integration | `yarn test:sdk` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | SDK-03 | integration | `yarn test:sdk` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SDK consumer ergonomics (`create/load` return contract + type discoverability) | SDK-01 | Type ergonomics and DX expectations are not fully machine-checkable | Build sample TypeScript usage snippet and verify strict compile + expected autocompletion surface |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
