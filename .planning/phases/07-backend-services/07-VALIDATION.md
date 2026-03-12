---
phase: 07
slug: backend-services
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-11
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + Anchor integration harness |
| **Config file** | `sdk/core/package.json` scripts + root `Anchor.toml` |
| **Quick run command** | Requirement-targeted: `yarn workspace @stbr/sss-mint-burn test` OR `yarn workspace @stbr/sss-indexer test` OR `yarn workspace @stbr/sss-compliance test` OR `yarn workspace @stbr/sss-webhook test` (run only what changed) |
| **Full suite command** | `yarn lint && yarn build && yarn workspace @stbr/sss-mint-burn test && yarn workspace @stbr/sss-indexer test && yarn workspace @stbr/sss-compliance test && yarn workspace @stbr/sss-webhook test && yarn test:integration` |
| **Estimated runtime** | ~420 seconds |

---

## Sampling Rate

- **After every task commit:** Run requirement-specific verify command for touched requirement(s) (`SRV-01..04`)
- **After every plan wave:** Run full suite command
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 420 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-04-03 | 04 | 2 | SRV-01 | unit/integration | `yarn workspace @stbr/sss-mint-burn test` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 2 | SRV-02 | unit/integration | `yarn workspace @stbr/sss-indexer test` | ❌ W0 | ⬜ pending |
| 07-03-03 | 03 | 3 | SRV-03 | unit/integration | `yarn workspace @stbr/sss-compliance test` | ❌ W0 | ⬜ pending |
| 07-05-03 | 05 | 3 | SRV-04 | unit/integration | `yarn workspace @stbr/sss-webhook test` | ❌ W0 | ⬜ pending |
| 07-06-02 | 06 | 4 | E2E | integration | `yarn test:integration` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `services/mint-burn/src/__tests__/mint-burn.service.test.ts` — stubs for SRV-01
- [ ] `services/indexer/src/__tests__/indexer.projection.test.ts` — stubs for SRV-02
- [ ] `services/compliance/src/__tests__/compliance.service.test.ts` — stubs for SRV-03
- [ ] `services/webhook/src/__tests__/webhook.delivery.test.ts` — stubs for SRV-04
- [ ] Shared service test utilities for deterministic envelopes and idempotency replay assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Replay-safe idempotency across service restart boundary | SRV-01 | Requires controlled process restart with same idempotency key | Submit duplicate mint request before and after restart; confirm same job/result envelope |
| Webhook receiver interoperability with signature validation | SRV-04 | External endpoint behavior differs by consumer implementation | Register sample endpoint, rotate secrets, verify dual-key grace and retry semantics |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 420s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
