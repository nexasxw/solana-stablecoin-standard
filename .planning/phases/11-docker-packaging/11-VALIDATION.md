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
| **Quick run command** | `docker compose config >/dev/null && rg -n "mint-burn:|indexer:|webhook:|compliance:|profiles:\\s*\\[\"sss2\"\\]|healthcheck:|3001|3002|3003|3004" docker-compose.yml && rg -n "\"start\"\\s*:" services/mint-burn/package.json services/indexer/package.json services/compliance/package.json services/webhook/package.json` |
| **Full suite command** | `docker compose down -v || true && docker compose --profile sss2 down -v || true && docker compose config >/dev/null && docker compose build --no-cache && docker compose up -d && docker compose ps && curl -fsS http://localhost:3001/health && curl -fsS http://localhost:3002/health && curl -fsS http://localhost:3003/health && docker compose --profile sss2 up -d && docker compose --profile sss2 ps && curl -fsS http://localhost:3004/health` |
| **Estimated runtime** | ~240 seconds |

---

## Sampling Rate

- **After every task commit:** Run `docker compose config >/dev/null && rg -n "mint-burn:|indexer:|webhook:|compliance:|profiles:\\s*\\[\"sss2\"\\]|healthcheck:|3001|3002|3003|3004" docker-compose.yml && rg -n "\"start\"\\s*:" services/mint-burn/package.json services/indexer/package.json services/compliance/package.json services/webhook/package.json`
- **After every plan wave:** Run `docker compose down -v || true && docker compose --profile sss2 down -v || true && docker compose config >/dev/null && docker compose build --no-cache && docker compose up -d && docker compose ps && curl -fsS http://localhost:3001/health && curl -fsS http://localhost:3002/health && curl -fsS http://localhost:3003/health && docker compose --profile sss2 up -d && docker compose --profile sss2 ps && curl -fsS http://localhost:3004/health`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency target (quick sampling):** <=30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-02-01 | 02 | 2 | OPS-01 | smoke-config | `docker compose config >/dev/null && rg -n "mint-burn:|indexer:|webhook:|healthcheck:|3001|3002|3003" docker-compose.yml && rg -n "app\\.get\\('/health'|listen\\(" services/mint-burn/src/index.ts services/indexer/src/index.ts services/webhook/src/index.ts` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | OPS-02 | smoke-config | `docker compose config >/dev/null && rg -n "compliance:|profiles:\\s*\\[\"sss2\"\\]|healthcheck:|3004" docker-compose.yml && rg -n "app\\.get\\('/health'|listen\\(" services/compliance/src/index.ts` | ✅ | ⬜ pending |
| 11-02-03 | 02 | 2 | OPS-01, OPS-02 | smoke-config | `docker compose config >/dev/null && rg -n "\"start\"\\s*:" services/mint-burn/package.json services/indexer/package.json services/compliance/package.json services/webhook/package.json && rg -n "mint-burn:|indexer:|webhook:|compliance:|command:|profiles:\\s*\\[\"sss2\"\\]" docker-compose.yml` | ✅ | ⬜ pending |

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
- [ ] Quick sampling feedback latency <=30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
