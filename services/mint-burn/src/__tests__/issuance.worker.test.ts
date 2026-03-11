import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { IssuanceRouteHandlers, IssuanceIdempotencyStore } from "../routes/issuance";
import { IssuanceWorker, type IssuanceExecutor } from "../jobs/issuance-worker";
import { IssuanceRepository } from "../store/issuance-repository";

const tenantId = "tenant-worker";

const headers = (requestId: string, idempotencyKey: string) => {
  return {
    "x-request-id": requestId,
    "x-idempotency-key": idempotencyKey,
    "x-tenant-id": tenantId,
    "x-service-id": "issuer-service",
    "x-service-role": "issuer",
    "x-service-tenant-ids": tenantId,
    "x-requester-id": "ops.requester",
    "x-approver-id": "ops.approver",
    "x-intent-signature": "sig:worker",
    "x-intent-signature-alg": "ed25519",
    "x-intent-signed-at": "2026-03-11T11:00:00.000Z",
    "x-intent-nonce": `nonce-${idempotencyKey}`,
  };
};

describe("issuance worker orchestration", () => {
  it("processes queued mint jobs through deterministic lifecycle and emits normalized events", async () => {
    const repository = new IssuanceRepository();
    const handlers = new IssuanceRouteHandlers(repository, new IssuanceIdempotencyStore());

    const createResponse = handlers.createMintJob({
      headers: headers("req-worker-1", "idem-worker-1"),
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          recipient: "holder-a",
          amount: "300",
        },
      },
    });

    const executedPayloads: unknown[] = [];
    const executor: IssuanceExecutor = {
      mint: async (payload) => {
        executedPayloads.push(payload);
        return {
          transaction_signature: "tx-mint-1",
          slot: 110,
        };
      },
      burn: async () => {
        throw new Error("not used");
      },
    };

    const worker = new IssuanceWorker(repository, executor);
    const result = await worker.runNext(tenantId);

    assert.equal(result.processed, true);
    assert.equal(result.job?.state, "succeeded");
    assert.equal(result.job?.transaction_signature, "tx-mint-1");
    assert.equal(executedPayloads.length, 1);
    assert.ok(createResponse.data);

    const persisted = repository.getJob(tenantId, createResponse.data.job_id);
    assert.equal(persisted.state, "succeeded");
    assert.equal(persisted.result?.transaction_signature, "tx-mint-1");

    const events = repository.listInternalEvents(tenantId, persisted.id);
    assert.equal(events.length, 2);
    assert.equal(events[0].event_type, "issuance.mint.running");
    assert.equal(events[1].event_type, "issuance.mint.succeeded");

    for (const event of events) {
      assert.ok(event.event_id.length > 0);
      assert.ok(event.event_type.length > 0);
      assert.equal(event.event_version, "v1");
      assert.equal(event.request_id, persisted.request_id);
      assert.ok(event.occurred_at.length > 0);
    }
  });

  it("marks job failed when executor throws and records stable error", async () => {
    const repository = new IssuanceRepository();
    const handlers = new IssuanceRouteHandlers(repository, new IssuanceIdempotencyStore());

    const createResponse = handlers.createBurnJob({
      headers: headers("req-worker-2", "idem-worker-2"),
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          source: "holder-b",
          amount: "42",
        },
      },
    });

    const executor: IssuanceExecutor = {
      mint: async () => {
        throw new Error("not used");
      },
      burn: async () => {
        throw new Error("burn failure");
      },
    };

    const worker = new IssuanceWorker(repository, executor);
    const result = await worker.runNext(tenantId);

    assert.equal(result.processed, true);
    assert.equal(result.job?.state, "failed");
    assert.equal(result.job?.error?.code, "INTERNAL_ERROR");
    assert.ok(createResponse.data);

    const persisted = repository.getJob(tenantId, createResponse.data.job_id);
    assert.equal(persisted.state, "failed");
    assert.equal(persisted.error?.message, "burn failure");

    const events = repository.listInternalEvents(tenantId, persisted.id);
    assert.equal(events.length, 2);
    assert.equal(events[1].event_type, "issuance.burn.failed");
  });
});
