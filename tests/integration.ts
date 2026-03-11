import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { IssuanceWorker } from "../services/mint-burn/src/jobs/issuance-worker";
import { IssuanceIdempotencyStore, IssuanceRouteHandlers } from "../services/mint-burn/src/routes/issuance";
import { IssuanceRepository } from "../services/mint-burn/src/store/issuance-repository";
import { FinalizedConsumer } from "../services/indexer/src/ingest/finalized-consumer";
import { createEmptyHolderBalance, reduceHolderBalancesFromEvent } from "../services/indexer/src/projections/holder-balances";
import {
  applyStablecoinProjectionEvent,
  createEmptyStablecoinProjection,
} from "../services/indexer/src/projections/stablecoin-projection";
import { ProjectionRouteHandlers } from "../services/indexer/src/routes/projections";
import { IndexerRepository } from "../services/indexer/src/store/indexer-repository";
import { createWebhookRuntime } from "../services/webhook/src/index";

const tenantId = "tenant-e2e";
const requestId = "req-e2e-trace-1";
const stablecoinId = "mint-e2e-1";

const issuerHeaders = (rid: string, idempotencyKey?: string): Record<string, string> => {
  const base: Record<string, string> = {
    "x-request-id": rid,
    "x-tenant-id": tenantId,
    "x-service-id": "issuer-api",
    "x-service-role": "issuer",
    "x-service-tenant-ids": tenantId,
    "x-requester-id": "ops.requester",
    "x-approver-id": "ops.approver",
    "x-intent-signature": `sig-${rid}`,
    "x-intent-signature-alg": "ed25519",
    "x-intent-signed-at": "2026-03-11T12:00:00.000Z",
    "x-intent-nonce": `nonce-${rid}`,
  };

  if (idempotencyKey) {
    base["x-idempotency-key"] = idempotencyKey;
  }

  return base;
};

describe("Phase 7 backend integration", () => {
  it("proves deterministic end-to-end request_id continuity across issuance, indexer, and webhook delivery evidence", async () => {
    const issuanceRepository = new IssuanceRepository();
    const issuanceHandlers = new IssuanceRouteHandlers(
      issuanceRepository,
      new IssuanceIdempotencyStore()
    );

    const mintAccepted = issuanceHandlers.createMintJob({
      headers: issuerHeaders(requestId, "idem-e2e-mint-1"),
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: stablecoinId,
          recipient: "holder-alice",
          amount: "250",
        },
      },
    });

    assert.equal(mintAccepted.success, true);
    assert.equal(mintAccepted.code, "ISSUANCE_MINT_JOB_QUEUED");
    assert.equal(mintAccepted.request_id, requestId);
    assert.equal(mintAccepted.data?.state, "queued");

    const issuanceWorker = new IssuanceWorker(issuanceRepository, {
      mint: async () => ({ transaction_signature: "tx-e2e-1", slot: 501 }),
      burn: async () => ({ transaction_signature: "tx-burn-unused", slot: 0 }),
    });

    const workerRun = await issuanceWorker.runNext(tenantId);
    assert.equal(workerRun.processed, true);
    assert.equal(workerRun.job?.state, "succeeded");
    assert.equal(workerRun.job?.request_id, requestId);

    const wrongTenantRead = issuanceHandlers.getJob(
      { headers: issuerHeaders("req-wrong-tenant") },
      { tenant_id: "tenant-other", job_id: workerRun.job?.id as string }
    );

    assert.equal(wrongTenantRead.success, false);
    assert.equal(wrongTenantRead.code, "FORBIDDEN");

    const issuanceSucceededEvent = issuanceRepository
      .listInternalEvents(tenantId, workerRun.job?.id)
      .find((event) => event.event_type === "issuance.mint.succeeded");

    assert.ok(issuanceSucceededEvent);
    assert.equal(issuanceSucceededEvent?.request_id, requestId);

    const indexerRepository = new IndexerRepository();
    const consumer = new FinalizedConsumer(indexerRepository);
    const ingest = consumer.ingestBatch({
      tenant_id: tenantId,
      stream_id: "stream-main",
      events: [
        {
          tenant_id: tenantId,
          program_id: "sss-1",
          stablecoin_id: stablecoinId,
          tx_signature: workerRun.job?.transaction_signature as string,
          slot: 501,
          log_index: 0,
          request_id: issuanceSucceededEvent?.request_id as string,
          occurred_at: issuanceSucceededEvent?.occurred_at as string,
          event_type: "mint.executed",
          finalized: true,
          body: {
            to: "holder-alice",
            amount: "250",
          },
        },
      ],
    });

    assert.equal(ingest.accepted, 1);
    assert.equal(ingest.duplicates, 0);
    assert.equal(ingest.normalized_events[0].request_id, requestId);

    let projection = createEmptyStablecoinProjection(tenantId, stablecoinId);
    const holderMap = new Map<string, ReturnType<typeof createEmptyHolderBalance>>();
    for (const event of indexerRepository.listEvents(tenantId)) {
      projection = applyStablecoinProjectionEvent(projection, event);
      const deltas = reduceHolderBalancesFromEvent(event);
      for (const delta of deltas) {
        const current =
          holderMap.get(delta.holder) ??
          createEmptyHolderBalance(tenantId, stablecoinId, delta.holder);
        holderMap.set(delta.holder, {
          ...current,
          balance: current.balance + delta.delta,
          updated_at: event.occurred_at,
        });
      }
    }

    indexerRepository.upsertStablecoinProjection(tenantId, projection);
    for (const holder of holderMap.values()) {
      indexerRepository.upsertHolderBalance(tenantId, holder);
    }

    const projectionHandlers = new ProjectionRouteHandlers(indexerRepository);
    const projectionRead = projectionHandlers.getStablecoinProjection(
      { tenant_id: tenantId, request_id: requestId },
      { tenant_id: tenantId, stablecoin_id: stablecoinId }
    );

    assert.equal(projectionRead.request_id, requestId);
    assert.equal(projectionRead.data?.total_supply, 250n);
    assert.equal(projectionRead.data?.last_event_id, ingest.normalized_events[0].event_id);

    let sentRequestId = "";
    let sentEventId = "";
    const webhookRuntime = createWebhookRuntime({
      sender: {
        send: async (request) => {
          sentRequestId = request.headers["x-request-id"];
          sentEventId = request.headers["x-event-id"];
          return { status: 202 };
        },
      },
    });

    const subscription = webhookRuntime.subscriptionHandlers.create({
      headers: issuerHeaders(requestId),
      body: {
        tenant_id: tenantId,
        endpoint_url: "https://example.com/webhooks/e2e",
        event_filters: ["mint.executed"],
        secret: "primary-secret-e2e",
      },
    });

    assert.equal(subscription.success, true);
    assert.equal(subscription.code, "WEBHOOK_SUBSCRIPTION_OK");
    assert.equal(subscription.request_id, requestId);

    const enqueue = webhookRuntime.deliveryHandlers.enqueueForTestOnly(
      { headers: issuerHeaders(requestId) },
      {
        tenant_id: tenantId,
        subscription_id: subscription.data?.subscription_id as string,
        event_id: ingest.normalized_events[0].event_id,
        event_type: ingest.normalized_events[0].event_type,
        event_version: ingest.normalized_events[0].event_version,
        request_id: ingest.normalized_events[0].request_id,
        entity_key: `stablecoin:${stablecoinId}`,
        payload: ingest.normalized_events[0].body.payload,
      }
    );

    assert.equal(enqueue.success, true);
    assert.equal(enqueue.code, "WEBHOOK_DELIVERY_OK");
    assert.equal(enqueue.request_id, requestId);
    assert.equal(enqueue.data?.state, "queued");

    const deliveryRun = await webhookRuntime.worker.runNext(tenantId);
    assert.equal(deliveryRun.processed, true);
    assert.equal(deliveryRun.delivery?.state, "succeeded");
    assert.equal(deliveryRun.delivery?.request_id, requestId);

    const deliveryEvidence = webhookRuntime.deliveryHandlers.getDelivery(
      { headers: issuerHeaders(requestId) },
      {
        tenant_id: tenantId,
        delivery_id: deliveryRun.delivery?.id as string,
      }
    );

    assert.equal(deliveryEvidence.success, true);
    assert.equal(deliveryEvidence.code, "WEBHOOK_DELIVERY_OK");
    assert.equal(deliveryEvidence.request_id, requestId);
    assert.equal(deliveryEvidence.data.delivery.request_id, requestId);
    assert.equal(deliveryEvidence.data.attempts.length, 1);
    assert.equal(deliveryEvidence.data.attempts[0].status, "succeeded");
    assert.equal(deliveryEvidence.data.dead_letter, null);

    assert.equal(sentRequestId, requestId);
    assert.equal(sentEventId, ingest.normalized_events[0].event_id);
  });
});
