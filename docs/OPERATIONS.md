# Operations Runbook

## Prerequisites

- Docker Desktop or Docker Engine with `docker compose`
- Node.js 20+ and Yarn
- Anchor CLI 0.31+ (for local program workflows)
- Solana CLI (for command-lane verification and account checks)
- Repository dependencies installed from repo root: `yarn install`

## Scope

This runbook defines the baseline local operator flow and verification references for current shipped behavior.
Phase 9 is documentation-only and this file intentionally documents shipped behavior while deferring future-phase operational capabilities.

## Deterministic Command Contract

```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token blacklist --help
./scripts/sss-token seize --help
docker compose config >/dev/null
```

Expected result:
- Each CLI help command exits `0` and prints usage.
- `docker compose config >/dev/null` exits `0`.

## Step 1: Validate Compose Configuration

```bash
docker compose config >/dev/null
```

If this fails, do not continue. Resolve invalid compose configuration first.

## Step 2: Start Local Services (Default Profile)

```bash
docker compose up -d
docker compose ps
```

Expected result:
- `postgres`, `redis`, `mint-burn`, `indexer`, and `webhook` show `Up` status.

## Step 3: Start Local Services With SSS-2 Profile

The `sss2` profile adds the compliance service:

```bash
docker compose --profile sss2 up -d
docker compose --profile sss2 ps
```

Expected result:
- The default services are `Up`.
- `compliance` is present and `Up`.

## Step 4: Health Verification

```bash
docker compose ps
docker compose logs --tail=50 mint-burn indexer webhook
docker compose --profile sss2 logs --tail=50 compliance
```

Health endpoints from `docker-compose.yml`:
- `mint-burn`: `http://localhost:3001/health`
- `indexer`: `http://localhost:3002/health`
- `webhook`: `http://localhost:3003/health`
- `compliance` (profile `sss2`): `http://localhost:3004/health`

## Step 5: Teardown

Default profile teardown:

```bash
docker compose down
```

SSS-2 profile teardown:

```bash
docker compose --profile sss2 down
```

With volume cleanup (destructive to local Postgres/Redis state):

```bash
docker compose down -v
docker compose --profile sss2 down -v
```

## Verification References

- `docs/testing/phase-08-command-truth.md`
- `docs/testing/phase-08-devnet-evidence.md`
- `docs/testing/phase-08-regression-matrix.md`
- `.planning/phases/09-documentation/09-VALIDATION.md`

## Validation Lane Authority

Phase 08 command lanes are authoritative in `docs/testing/phase-08-command-truth.md`:
- `Quick`
- `Full`
- `Devnet proof`

This runbook intentionally references those lane definitions instead of redefining their full command strings, so operational guidance stays aligned with the command-truth source.

## Reviewer Command-To-Artifact Mapping

Use a unique `RUN_ID` for every devnet proof/stress run. Reusing an existing run directory is an automatic fail.

| Lane | Command | Artifact Paths | Signature Evidence | Pass Checkpoint | Fail Checkpoint |
| --- | --- | --- | --- | --- | --- |
| Local command-surface gate | `./scripts/sss-token --help && ./scripts/sss-token init --help && ./scripts/sss-token mint --help && ./scripts/sss-token blacklist --help && ./scripts/sss-token seize --help` | none (stdout-only gate) | none | All commands exit `0` and print usage | Any command exits non-zero or missing command |
| Compose contract gate | `docker compose config >/dev/null` | none (config validation gate) | none | Exit code `0` | Non-zero exit |
| SSS-1 proof | `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss1-proof.sh` | `artifacts/devnet/phase-08/sss1-proof/$RUN_ID/...` | `signatures.csv` entries in `operation,signature` format | `summary.md` reports pass and required state snapshots/signatures exist | Missing required artifacts, invalid signature rows, or non-zero exit |
| SSS-2 proof | `RUN_ID=<id> ... ./scripts/devnet/phase-08-sss2-proof.sh` | `artifacts/devnet/phase-08/sss2-proof/$RUN_ID/...` | `signatures.csv` entries in `operation,signature` format | `summary.md` reports pass and includes `state/blacklist-check.json` | Missing blacklist evidence, missing required artifacts, or non-zero exit |
| Stress | `RUN_ID=<id> ITERATIONS=2 RETRY_LIMIT=1 ... ./scripts/devnet/phase-08-stress.sh` | `artifacts/devnet/phase-08/stress/$RUN_ID/...` | Lane proof signatures remain in nested proof outputs | `summary.md` is pass and all lanes pass in `results.csv` | Any lane exhausts retries or overall summary is fail |

## Deferred Content

Service-specific incident and escalation playbooks are documented in later phase plans.
