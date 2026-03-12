# Phase 11: Docker Packaging - Research

**Researched:** 2026-03-13  
**Scope:** Planning inputs for `OPS-01`, `OPS-02`, `OPS-03`  
**Research question:** What do we need to know to plan this phase well?

## What Is Locked Already

From `11-CONTEXT.md`, planning must treat these as fixed contracts:
- Canonical reviewer entrypoint is Docker Compose directly (no wrapper script contract):
  - default: `docker compose up -d`
  - SSS-2: `docker compose --profile sss2 up -d`
- Startup success is gated by both:
  - `docker compose ps` status checks
  - deterministic health endpoint verification
- Health failure is fail-fast with diagnostics before proceeding.
- Default service set is fixed: `mint-burn`, `indexer`, `webhook`, `postgres`, `redis`.
- SSS-2 behavior is profile-based via `sss2` and adds `compliance`.
- Host ports are fixed and must be explicit in docs.
- Packaging favors reproducibility over hot-reload dev UX.
- Canonical env contract is a versioned `.env.example` copied and filled by reviewers.
- Canonical image acquisition is local build from repo source via Compose.
- Volumes persist by default; reset is explicit via `docker compose down -v`.

## Requirement Fit (OPS-01..OPS-03)

- `OPS-01` (top-level Docker entrypoint): feasible with existing root `docker-compose.yml`, but currently not executable end-to-end due to missing image/runtime pieces.
- `OPS-02` (default + SSS-2 coverage): profile structure already exists (`sss2` for `compliance`) and maps cleanly to requirement intent.
- `OPS-03` (reviewer docs): base docs exist in `README.md`, `docs/OPERATIONS.md`, and `docs/API.md`; they need alignment to actual runnable behavior and explicit reviewer flow.

## Current Codebase Reality (Planning-Critical)

### Reusable Assets Already Present
- Root [`docker-compose.yml`](/home/abduh/stable/solana-stablecoin-standard/docker-compose.yml) defines:
  - service graph, `sss2` profile, fixed ports, DB/Redis volumes
  - healthchecks and dependency conditions
- [`docs/OPERATIONS.md`](/home/abduh/stable/solana-stablecoin-standard/docs/OPERATIONS.md) already contains a deterministic compose flow and teardown guidance.
- [`README.md`](/home/abduh/stable/solana-stablecoin-standard/README.md) and [`docs/API.md`](/home/abduh/stable/solana-stablecoin-standard/docs/API.md) already point reviewers to Compose as canonical runtime entry.

### Hard Gaps That Must Be Planned Explicitly
- No service Dockerfiles exist under `services/{mint-burn,indexer,compliance,webhook}` while compose uses `build:` for each.
- No `.env.example` exists at repo root, despite context locking it as canonical reviewer env contract.
- Service runtimes are not currently long-running HTTP processes for `mint-burn` and `indexer`:
  - [`services/mint-burn/src/index.ts`](/home/abduh/stable/solana-stablecoin-standard/services/mint-burn/src/index.ts) is placeholder-only.
  - [`services/indexer/src/index.ts`](/home/abduh/stable/solana-stablecoin-standard/services/indexer/src/index.ts) is placeholder-only.
- Health endpoints referenced by compose/docs (`/health` on ports `3001-3004`) are not implemented in current service source.

## Implications For Phase Planning

The biggest planning risk is assuming Phase 11 is docs-only packaging. It is not. To satisfy locked startup/health contracts, Phase 11 plan must include operational runtime enablement needed for containers to become healthy, even if that runtime is minimal and non-feature-expanding.

In practice, Phase 11 should treat "packaging" as three coupled deliverables:
- buildable images,
- runnable service entrypoints compatible with existing compose health contracts,
- reviewer-facing deterministic docs and validation flow.

## Decisions To Lock During Planning (Before Coding)

1. Minimal runtime contract per service
- Define what each container must do at startup to be considered "up" for OPS (at least process liveness + `/health`).
- Keep this strictly operational; do not expand product API scope in Phase 11.

2. Docker build strategy across monorepo workspaces
- Decide whether to use one reusable multi-stage pattern or per-service Dockerfiles with shared conventions.
- Ensure workspace dependencies (`services/shared`) build deterministically inside container builds.

3. Health verification authority
- Lock exact command contract for pass/fail (compose status + endpoint checks + fail-fast logs output).
- Keep verification deterministic and scriptable for reviewer reproducibility.

4. Documentation authority and drift prevention
- Lock one primary runbook section as source of truth (likely `docs/OPERATIONS.md`) and keep README/API concise references to it.
- Avoid duplicate command variants that drift.

## Recommended Plan Shape

1. Containerization baseline
- Add Dockerfiles (and `.dockerignore` as needed) for all runtime services.
- Confirm compose builds locally from repo source for both default and `sss2` profile.

2. Runtime readiness baseline
- Add minimal runtime entrypoints where missing so compose services can run and satisfy health checks.
- Preserve phase scope by implementing only operational readiness behavior required for stack startup validation.

3. Reviewer env and docs contract
- Add root `.env.example` with required variables and defaults guidance.
- Update `README.md` + `docs/OPERATIONS.md` (+ `docs/API.md` if needed) to express:
  - default vs `sss2` flow,
  - health check and fail-fast diagnostics,
  - teardown and destructive reset behavior.

4. Requirement traceability updates
- Update docs/traceability references so `OPS-01..03` map to executable commands and artifacts.

## Risks And Mitigations

- Risk: Compose builds fail because service Dockerfiles are missing.
  - Mitigation: treat Dockerfile creation as first implementation slice and gate all later work on successful `docker compose config` + build.

- Risk: Services start but never become healthy due to missing `/health` endpoints.
  - Mitigation: lock and implement minimal health-capable runtime contract before docs signoff.

- Risk: Documentation promises behavior not enforced in runtime.
  - Mitigation: generate docs from verified commands and include explicit failure criteria.

- Risk: Profile drift between default and `sss2` paths.
  - Mitigation: verify both paths in CI/manual validation with identical gate structure.

## Skills/Local Rule Check

Checked local skill inventory under `.claude/skills/`. Present skills are Solana/vault oriented and do not add extra Docker-packaging rules that change Phase 11 planning constraints.

## Validation Architecture

Nyquist goal for this phase: each OPS requirement has executable startup/verification evidence with deterministic pass/fail signals.

### Command Baseline

Quick gate (during implementation):
```bash
docker compose config >/dev/null
docker compose build

docker compose up -d
docker compose ps
docker compose logs --tail=80 mint-burn indexer webhook
curl -fsS http://localhost:3001/health
curl -fsS http://localhost:3002/health
curl -fsS http://localhost:3003/health

docker compose --profile sss2 up -d
docker compose --profile sss2 ps
docker compose --profile sss2 logs --tail=80 compliance
curl -fsS http://localhost:3004/health
```

Full gate (phase signoff):
```bash
docker compose down -v || true
docker compose --profile sss2 down -v || true

docker compose config >/dev/null
docker compose build --no-cache

docker compose up -d
docker compose ps
curl -fsS http://localhost:3001/health
curl -fsS http://localhost:3002/health
curl -fsS http://localhost:3003/health

docker compose --profile sss2 up -d
docker compose --profile sss2 ps
curl -fsS http://localhost:3004/health

docker compose logs --tail=120 > /tmp/sss-default.log
docker compose --profile sss2 logs --tail=120 > /tmp/sss-sss2.log

docker compose down
docker compose --profile sss2 down
```

### Requirement-Mapped Verification

`OPS-01` top-level Docker entrypoint:
- Pass when root-level compose commands bring up required default services and health checks succeed.
- Evidence: `docker compose ps`, health curl outputs, startup logs.

`OPS-02` default + SSS-2-specific coverage:
- Pass when default service set is healthy without profile and compliance is healthy with `--profile sss2`.
- Evidence: profile-specific `ps` output and `compliance` health response.

`OPS-03` documented reviewer flow:
- Pass when README + operations docs provide exact validated commands, required env setup, and teardown/reset semantics.
- Evidence: doc sections linking to same command contract with no conflicting variants.

### Signoff Artifacts

- Updated `docker-compose.yml` (if needed for final contract alignment)
- Service Dockerfiles and runtime entrypoints
- Root `.env.example`
- Updated reviewer docs (`README.md`, `docs/OPERATIONS.md`, `docs/API.md` as required)
- Validation record (`11-VALIDATION.md`) with command outputs and pass/fail interpretation

## Research Verdict

Phase 11 is ready to plan, but only if planning explicitly accounts for current runtime gaps (missing Dockerfiles, missing env example, and missing health-capable service entrypoints). The correct plan is packaging plus operational readiness verification, not packaging text alone.

## RESEARCH COMPLETE
