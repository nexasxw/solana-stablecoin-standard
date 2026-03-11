import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { WebhookDeliveryWorker, type WebhookSender } from "../jobs/delivery-worker";
import {
  DEAD_LETTER_RETENTION_DAYS,
  DELIVERY_RETENTION_DAYS,
  WebhookRepository,
} from "../store/webhook-repository";

describe("webhook retry and dead-letter behavior", () => {
  it("retries failed deliveries with bounded exponential backoff and dead-letters terminal failures", async () => {
    const base = new Date("2026-03-11T13:00:00.000Z");
    let nowMs = base.getTime();
    const now = () => new Date(nowMs);

    const repository = new WebhookRepository();
    const subscription = repository.createSubscription(
      {
        tenant_id: "tenant-retry",
        endpoint_url: "https://example.com/retry",
        event_filters: ["mint.executed"],
        primary_secret: "retry-secret",
      },
      now
    );

    const queued = repository.enqueueDelivery(
      {
        tenant_id: "tenant-retry",
        subscription_id: subscription.id,
        event_id: "evt-retry-1",
        event_type: "mint.executed",
        event_version: "1.0",
        request_id: "req-retry-1",
        entity_key: "stablecoin:retry",
        payload: { amount: "99" },
        max_attempts: 3,
      },
      now
    );

    const sender: WebhookSender = {
      send: async () => ({ status: 500 }),
    };

    const worker = new WebhookDeliveryWorker(repository, sender, now);

    const firstRun = await worker.runNext("tenant-retry");
    assert.equal(firstRun.processed, true);
    assert.equal(firstRun.delivery?.state, "retry_scheduled");
    assert.equal(firstRun.delivery?.attempt_count, 1);

    nowMs += 5_000;
    const secondRun = await worker.runNext("tenant-retry");
    assert.equal(secondRun.processed, true);
    assert.equal(secondRun.delivery?.state, "retry_scheduled");
    assert.equal(secondRun.delivery?.attempt_count, 2);

    nowMs += 10_000;
    const thirdRun = await worker.runNext("tenant-retry");
    assert.equal(thirdRun.processed, true);
    assert.equal(thirdRun.delivery?.state, "dead_lettered");
    assert.equal(thirdRun.delivery?.attempt_count, 3);

    const attempts = repository.listDeliveryAttempts("tenant-retry", queued.id);
    assert.equal(attempts.length, 3);
    assert.equal(attempts[0].response_status, 500);
    assert.equal(attempts[1].response_status, 500);
    assert.equal(attempts[2].response_status, 500);

    const deadLetters = repository.listDeadLetters("tenant-retry");
    assert.equal(deadLetters.length, 1);
    assert.equal(deadLetters[0].delivery_id, queued.id);
    assert.equal(deadLetters[0].final_error_code, "DEPENDENCY_FAILURE");

    nowMs += 1_000;
    const noMore = await worker.runNext("tenant-retry");
    assert.equal(noMore.processed, false);
  });

  it("purges terminal delivery records at 90-day delivery and 180-day DLQ windows", () => {
    const base = new Date("2026-03-11T14:00:00.000Z");
    let nowMs = base.getTime();
    const now = () => new Date(nowMs);

    const repository = new WebhookRepository();
    const subscription = repository.createSubscription(
      {
        tenant_id: "tenant-retention",
        endpoint_url: "https://example.com/retention",
        event_filters: ["mint.executed"],
        primary_secret: "retention-secret",
      },
      now
    );

    const succeeded = repository.enqueueDelivery(
      {
        tenant_id: "tenant-retention",
        subscription_id: subscription.id,
        event_id: "evt-success",
        event_type: "mint.executed",
        event_version: "1.0",
        request_id: "req-success",
        entity_key: "stablecoin:retention:success",
        payload: {},
      },
      now
    );

    repository.markDeliveryRunning("tenant-retention", succeeded.id, "primary", now);
    repository.markDeliverySucceeded("tenant-retention", succeeded.id, 200, now);

    const deadLettered = repository.enqueueDelivery(
      {
        tenant_id: "tenant-retention",
        subscription_id: subscription.id,
        event_id: "evt-dlq",
        event_type: "mint.executed",
        event_version: "1.0",
        request_id: "req-dlq",
        entity_key: "stablecoin:retention:dlq",
        payload: {},
        max_attempts: 1,
      },
      now
    );

    repository.markDeliveryRunning("tenant-retention", deadLettered.id, "primary", now);
    repository.markDeliveryFailed(
      "tenant-retention",
      deadLettered.id,
      {
        response_status: 500,
        error_code: "DEPENDENCY_FAILURE",
        error_message: "receiver failed",
      },
      now
    );

    nowMs += (DEAD_LETTER_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000;

    const purge = repository.purgeExpiredRecords(now);
    assert.ok(purge.purged_dead_letters >= 1);
    assert.ok(purge.purged_deliveries >= 2);

    const remainingDeadLetters = repository.listDeadLetters("tenant-retention");
    assert.equal(remainingDeadLetters.length, 0);

    const remainingDeliveries = repository.listDeliveries("tenant-retention", { limit: 50 });
    assert.equal(remainingDeliveries.length, 0);

    const expectedMs = DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    assert.ok(expectedMs < (DEAD_LETTER_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
  });
});
