import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { WebhookDeliveryWorker, type WebhookSender } from "../jobs/delivery-worker";
import { WebhookRepository } from "../store/webhook-repository";

describe("webhook delivery ordering", () => {
  it("preserves per-entity order while allowing other entity keys to progress", async () => {
    const repository = new WebhookRepository();

    const subscription = repository.createSubscription({
      tenant_id: "tenant-ordering",
      endpoint_url: "https://example.com/webhooks",
      event_filters: ["mint.executed", "burn.executed"],
      primary_secret: "secret-primary-ordering",
    });

    const first = repository.enqueueDelivery({
      tenant_id: "tenant-ordering",
      subscription_id: subscription.id,
      event_id: "evt-1",
      event_type: "mint.executed",
      event_version: "1.0",
      request_id: "req-1",
      entity_key: "stablecoin:A",
      payload: { amount: "10" },
    });

    const middleOtherEntity = repository.enqueueDelivery({
      tenant_id: "tenant-ordering",
      subscription_id: subscription.id,
      event_id: "evt-2",
      event_type: "mint.executed",
      event_version: "1.0",
      request_id: "req-2",
      entity_key: "stablecoin:B",
      payload: { amount: "20" },
    });

    const secondSameEntity = repository.enqueueDelivery({
      tenant_id: "tenant-ordering",
      subscription_id: subscription.id,
      event_id: "evt-3",
      event_type: "burn.executed",
      event_version: "1.0",
      request_id: "req-3",
      entity_key: "stablecoin:A",
      payload: { amount: "5" },
    });

    const sentEventIds: string[] = [];
    const sender: WebhookSender = {
      send: async ({ headers }) => {
        sentEventIds.push(headers["x-event-id"]);
        return {
          status: 202,
        };
      },
    };

    const worker = new WebhookDeliveryWorker(repository, sender);

    const run1 = await worker.runNext("tenant-ordering");
    const run2 = await worker.runNext("tenant-ordering");
    const run3 = await worker.runNext("tenant-ordering");

    assert.equal(run1.processed, true);
    assert.equal(run2.processed, true);
    assert.equal(run3.processed, true);

    assert.deepEqual(sentEventIds, [first.event_id, middleOtherEntity.event_id, secondSameEntity.event_id]);

    const attemptsFirst = repository.listDeliveryAttempts("tenant-ordering", first.id);
    const attemptsMiddle = repository.listDeliveryAttempts("tenant-ordering", middleOtherEntity.id);
    const attemptsSecond = repository.listDeliveryAttempts("tenant-ordering", secondSameEntity.id);

    assert.equal(attemptsFirst.length, 1);
    assert.equal(attemptsMiddle.length, 1);
    assert.equal(attemptsSecond.length, 1);

    for (const delivery of repository.listDeliveries("tenant-ordering")) {
      assert.equal(delivery.state, "succeeded");
      assert.equal(delivery.attempt_count, 1);
      assert.equal(delivery.last_signature_kid, "primary");
    }
  });
});
