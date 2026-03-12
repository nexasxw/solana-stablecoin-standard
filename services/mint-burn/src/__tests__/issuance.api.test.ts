import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { IssuanceRouteHandlers, IssuanceIdempotencyStore } from "../routes/issuance";
import { IssuanceRepository, type IssuanceJobRecord } from "../store/issuance-repository";

const tenantId = "tenant-a";

const baseHeaders = () => {
  return {
    "x-request-id": "req-api-1",
    "x-tenant-id": tenantId,
    "x-service-id": "issuer-service",
    "x-service-role": "issuer",
    "x-service-tenant-ids": tenantId,
    "x-requester-id": "operator.requester",
    "x-approver-id": "operator.approver",
    "x-intent-signature": "sig:abc123",
    "x-intent-signature-alg": "ed25519",
    "x-intent-signed-at": "2026-03-11T10:00:00.000Z",
    "x-intent-nonce": "nonce-1",
  } as const;
};

describe("issuance API contracts", () => {
  it("creates separate mint and burn jobs and persists identity chain", () => {
    const repository = new IssuanceRepository();
    const handlers = new IssuanceRouteHandlers(repository, new IssuanceIdempotencyStore());

    const mintResponse = handlers.createMintJob({
      headers: {
        ...baseHeaders(),
        "x-idempotency-key": "idem-mint-1",
      },
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          recipient: "ata-recipient",
          amount: "100",
        },
      },
    });

    const burnResponse = handlers.createBurnJob({
      headers: {
        ...baseHeaders(),
        "x-request-id": "req-api-2",
        "x-idempotency-key": "idem-burn-1",
      },
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          source: "ata-source",
          amount: "30",
          reason: "redeem",
        },
      },
    });

    assert.equal(mintResponse.success, true);
    assert.equal(mintResponse.code, "ISSUANCE_MINT_JOB_QUEUED");
    assert.equal(burnResponse.success, true);
    assert.equal(burnResponse.code, "ISSUANCE_BURN_JOB_QUEUED");

    const listed = handlers.listJobs({
      headers: {
        ...baseHeaders(),
        "x-request-id": "req-api-3",
      },
      query: {
        tenant_id: tenantId,
        limit: 10,
      },
    });

    assert.equal(listed.success, true);
    assert.ok(listed.data);
    assert.equal(listed.data.length, 2);
    const listedJobs = (listed.data ?? []) as IssuanceJobRecord[];
    assert.deepEqual(
      listedJobs.map((job: IssuanceJobRecord) => job.job_type).sort(),
      ["burn", "mint"]
    );

    const mintJob = listedJobs.find((job: IssuanceJobRecord) => job.job_type === "mint");
    assert.ok(mintJob);
    assert.equal(mintJob?.requester_id, "operator.requester");
    assert.equal(mintJob?.approver_id, "operator.approver");
    assert.equal(mintJob?.executor_service_id, "mint-burn-worker");
    assert.equal(mintJob?.intent_signature.signature, "sig:abc123");
  });

  it("replays deterministic idempotent response for same key and payload", () => {
    const repository = new IssuanceRepository();
    const handlers = new IssuanceRouteHandlers(repository, new IssuanceIdempotencyStore());

    const first = handlers.createMintJob({
      headers: {
        ...baseHeaders(),
        "x-idempotency-key": "idem-replay-1",
      },
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          recipient: "ata-recipient",
          amount: "12",
        },
      },
    });

    const replay = handlers.createMintJob({
      headers: {
        ...baseHeaders(),
        "x-request-id": "req-api-4",
        "x-idempotency-key": "idem-replay-1",
      },
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          recipient: "ata-recipient",
          amount: "12",
        },
      },
    });

    assert.equal(first.success, true);
    assert.equal(replay.success, true);
    assert.equal(replay.code, "ISSUANCE_MINT_JOB_REPLAYED");
    assert.equal(replay.request_id, "req-api-4");
    assert.ok(first.data);
    assert.ok(replay.data);
    assert.equal(replay.data.replayed, true);
    assert.equal(replay.data.job_id, first.data.job_id);
  });

  it("returns deterministic conflict on idempotency payload mismatch", () => {
    const repository = new IssuanceRepository();
    const handlers = new IssuanceRouteHandlers(repository, new IssuanceIdempotencyStore());

    handlers.createBurnJob({
      headers: {
        ...baseHeaders(),
        "x-idempotency-key": "idem-conflict-1",
      },
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          source: "holder-a",
          amount: "50",
        },
      },
    });

    const conflict = handlers.createBurnJob({
      headers: {
        ...baseHeaders(),
        "x-request-id": "req-api-5",
        "x-idempotency-key": "idem-conflict-1",
      },
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          source: "holder-a",
          amount: "51",
        },
      },
    });

    assert.equal(conflict.success, false);
    assert.equal(conflict.code, "IDEMPOTENCY_CONFLICT");
    const conflictDetails = (conflict.error as { details?: Record<string, unknown> } | null)?.details;
    assert.equal(conflictDetails?.stable_code, "IDEMPOTENCY_CONFLICT");
  });

  it("enforces issuer-only authorization", () => {
    const repository = new IssuanceRepository();
    const handlers = new IssuanceRouteHandlers(repository, new IssuanceIdempotencyStore());

    const unauthorized = handlers.createMintJob({
      headers: {
        ...baseHeaders(),
        "x-service-role": "indexer",
        "x-idempotency-key": "idem-forbidden-1",
      },
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          recipient: "holder-a",
          amount: "1",
        },
      },
    });

    assert.equal(unauthorized.success, false);
    assert.equal(unauthorized.code, "FORBIDDEN");
    const unauthorizedDetails = (unauthorized.error as { details?: Record<string, unknown> } | null)?.details;
    assert.equal(unauthorizedDetails?.stable_code, "FORBIDDEN");
  });
});
