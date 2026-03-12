---
phase: 11
slug: docker-packaging
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Docker Compose runtime verification + curl health checks |
| **Config file** | `docker-compose.yml` |
| **Quick run command** | `docker compose config >/dev/null && docker compose build && docker compose up -d && docker compose ps` |
| **Full suite command** | `docker compose down -v || true && docker compose --profile sss2 down -v || true && docker compose config >/dev/null && docker compose build --no-cache && docker compose up -d && docker compose ps && curl -fsS http://localhost:3001/health && curl -fsS http://localhost:3002/health && curl -fsS http://localhost:3003/health && docker compose --profile sss2 up -d && docker compose --profile sss2 ps && curl -fsS http://localhost:3004/health` |
| **Estimated runtime** | ~240 seconds |

---

## Sampling Rate

- **After every task commit:** Run `docker compose config >/dev/null && docker compose build && docker compose up -d && docker compose ps`
- **After every plan wave:** Run `docker compose down -v || true && docker compose --profile sss2 down -v || true && docker compose config >/dev/null && docker compose build --no-cache && docker compose up -d && docker compose ps && curl -fsS http://localhost:3001/health && curl -fsS http://localhost:3002/health && curl -fsS http://localhost:3003/health && docker compose --profile sss2 up -d && docker compose --profile sss2 ps && curl -fsS http://localhost:3004/health`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | OPS-01 | integration | `docker compose config >/dev/null && docker compose build` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | OPS-01, OPS-02 | integration | `docker compose up -d && docker compose ps && curl -fsS http://localhost:3001/health && curl -fsS http://localhost:3002/health && curl -fsS http://localhost:3003/health` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | OPS-02 | integration | `docker compose --profile sss2 up -d && docker compose --profile sss2 ps && curl -fsS http://localhost:3004/health` | ✅ | ⬜ pending |
| 11-01-04 | 01 | 1 | OPS-03 | docs-check | `rg -n "docker compose|--profile sss2|down -v|health" README.md docs/OPERATIONS.md docs/API.md docs/TRACEABILITY.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `services/mint-burn/Dockerfile` — build context for mint-burn runtime
- [ ] `services/indexer/Dockerfile` — build context for indexer runtime
- [ ] `services/compliance/Dockerfile` — build context for compliance runtime
- [ ] `services/webhook/Dockerfile` — build context for webhook runtime
- [ ] `.env.example` — canonical reviewer env contract

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reviewer flow clarity and troubleshooting readability | OPS-03 | Documentation quality and reviewer comprehension cannot be fully judged by automation | Follow `README.md` and `docs/OPERATIONS.md` from a clean shell; confirm commands are unambiguous and deterministic |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
