import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { FinalizedConsumer } from "../ingest/finalized-consumer";
import type { FinalizedChainEvent } from "../ingest/event-normalizer";
import { BackfillController } from "../reconciliation/backfill";
import {
  applyHolderBalanceDelta,
  createEmptyHolderBalance,
  reduceHolderBalancesFromEvent,
} from "../projections/holder-balances";
import {
  applyStablecoinProjectionEvent,
  createEmptyStablecoinProjection,
} from "../projections/stablecoin-projection";
import { ProjectionRouteHandlers } from "../routes/projections";
import { IndexerRepository } from "../store/indexer-repository";

const tenantId = "tenant-a";
const streamId = "sss2-mainnet";
const stablecoinId = "mint-1";

const buildEvent = (overrides: Partial<FinalizedChainEvent>): FinalizedChainEvent => {
  return {
    tenant_id: tenantId,
    program_id: "sss-2",
    stablecoin_id: stablecoinId,
    tx_signature: "sig-default",
    slot: 100,
    log_index: 0,
    request_id: "req-1",
    occurred_at: "2026-03-11T08:00:00.000Z",
    event_type: "mint.executed",
    finalized: true,
    body: {},
    ...overrides,
  };
};

describe("indexer SRV-02 integration invariants", () => {
  it("persists only finalized events", () => {
    const repository = new IndexerRepository();
    const consumer = new FinalizedConsumer(repository);
    const result = consumer.ingestBatch({
      tenant_id: tenantId,
      stream_id: streamId,
      events: [
        buildEvent({ tx_signature: "sig-pending", finalized: false }),
        buildEvent({ tx_signature: "sig-final", finalized: true }),
      ],
    });

    assert.equal(result.accepted, 1);
    assert.equal(result.duplicates, 0);
    assert.equal(repository.listEvents(tenantId).length, 1);
    assert.equal(repository.listEvents(tenantId)[0].body.tx_signature, "sig-final");
  });

  it("enforces deterministic dedupe keys and monotonic checkpoints", () => {
    const repository = new IndexerRepository();
    const consumer = new FinalizedConsumer(repository);
    const first = buildEvent({
      tx_signature: "sig-1",
      slot: 101,
      log_index: 3,
      event_type: "transfer.executed",
      body: { from: "alice", to: "bob", amount: "5" },
    });

    const firstBatch = consumer.ingestBatch({
      tenant_id: tenantId,
      stream_id: streamId,
      events: [first],
    });
    const secondBatch = consumer.ingestBatch({
      tenant_id: tenantId,
      stream_id: streamId,
      events: [first],
    });
    const regressionBatch = consumer.ingestBatch({
      tenant_id: tenantId,
      stream_id: streamId,
      events: [buildEvent({ tx_signature: "sig-old", slot: 99 })],
    });

    assert.equal(firstBatch.accepted, 1);
    assert.equal(secondBatch.accepted, 0);
    assert.equal(secondBatch.duplicates, 1);
    assert.equal(regressionBatch.accepted, 0);
    assert.equal(repository.getCheckpoint(tenantId, streamId)?.slot, 101);
  });

  it("produces stablecoin and holder projections and tenant-scoped reads", () => {
    const repository = new IndexerRepository();
    const consumer = new FinalizedConsumer(repository);

    consumer.ingestBatch({
      tenant_id: tenantId,
      stream_id: streamId,
      events: [
        buildEvent({
          tx_signature: "sig-mint",
          slot: 100,
          event_type: "mint.executed",
          body: { to: "alice", amount: "100" },
        }),
        buildEvent({
          tx_signature: "sig-transfer",
          slot: 101,
          event_type: "transfer.executed",
          body: { from: "alice", to: "bob", amount: "40" },
        }),
        buildEvent({
          tx_signature: "sig-burn",
          slot: 102,
          event_type: "burn.executed",
          body: { from: "bob", amount: "10" },
        }),
        buildEvent({
          tx_signature: "sig-role",
          slot: 103,
          event_type: "role.updated",
          body: { role: "authority", address: "auth-1" },
        }),
        buildEvent({
          tx_signature: "sig-quota",
          slot: 104,
          event_type: "quota.updated",
          body: { minter: "mint-op", quota: "500" },
        }),
        buildEvent({
          tx_signature: "sig-pause",
          slot: 105,
          event_type: "pause.updated",
          body: { paused: true },
        }),
        buildEvent({
          tx_signature: "sig-blacklist",
          slot: 106,
          event_type: "blacklist.updated",
          body: { address: "bad-actor", listed: true },
        }),
      ],
    });

    let stablecoinProjection = createEmptyStablecoinProjection(tenantId, stablecoinId);
    const holderStates = new Map<string, ReturnType<typeof createEmptyHolderBalance>>();
    for (const event of repository.listEvents(tenantId)) {
      stablecoinProjection = applyStablecoinProjectionEvent(stablecoinProjection, event);

      const balanceDeltas = reduceHolderBalancesFromEvent(event);
      for (const delta of balanceDeltas) {
        const current =
          holderStates.get(delta.holder) ?? createEmptyHolderBalance(tenantId, stablecoinId, delta.holder);
        holderStates.set(
          delta.holder,
          applyHolderBalanceDelta(current, delta.delta, event.occurred_at)
        );
      }
    }

    repository.upsertStablecoinProjection(tenantId, stablecoinProjection);
    for (const balance of holderStates.values()) {
      repository.upsertHolderBalance(tenantId, balance);
    }

    const handlers = new ProjectionRouteHandlers(repository);
    const stablecoinResponse = handlers.getStablecoinProjection(
      { tenant_id: tenantId, request_id: "req-proj" },
      { tenant_id: tenantId, stablecoin_id: stablecoinId }
    );
    const holderResponse = handlers.getHolderBalances(
      { tenant_id: tenantId, request_id: "req-holders" },
      { tenant_id: tenantId, stablecoin_id: stablecoinId }
    );

    assert.equal(stablecoinResponse.data?.total_supply, 90n);
    assert.equal(stablecoinResponse.data?.paused, true);
    assert.equal(stablecoinResponse.data?.roles.authority, "auth-1");
    assert.equal(stablecoinResponse.data?.minter_quotas["mint-op"], 500n);
    assert.deepEqual(stablecoinResponse.data?.blacklist, ["bad-actor"]);

    const balances = holderResponse.data.reduce<Record<string, bigint>>((acc, row) => {
      acc[row.holder] = row.balance;
      return acc;
    }, {});
    assert.equal(balances.alice, 60n);
    assert.equal(balances.bob, 30n);

    assert.throws(() => {
      handlers.getHolderBalances(
        { tenant_id: "tenant-b", request_id: "req-cross-tenant" },
        { tenant_id: tenantId, stablecoin_id: stablecoinId }
      );
    }, /Tenant scope mismatch/);
  });

  it("runs bounded backfill and surfaces operator-visible status", () => {
    const repository = new IndexerRepository();
    const backfill = new BackfillController(repository, { max_slot_span: 5 });
    const job = backfill.startBackfill(
      {
        job_id: "job-1",
        tenant_id: tenantId,
        stream_id: streamId,
        start_slot: 200,
        end_slot: 202,
      },
      [
        buildEvent({
          tx_signature: "sig-200",
          slot: 200,
          event_type: "mint.executed",
          body: { to: "alice", amount: "25" },
          occurred_at: "2026-03-11T09:00:00.000Z",
        }),
        buildEvent({
          tx_signature: "sig-202",
          slot: 202,
          event_type: "transfer.executed",
          body: { from: "alice", to: "bob", amount: "10" },
          occurred_at: "2026-03-11T09:02:00.000Z",
        }),
      ]
    );

    assert.equal(job.status, "succeeded");
    assert.equal(job.accepted_events, 2);
    assert.equal(job.last_checkpoint, 202);
    assert.equal(backfill.getBackfillStatus("job-1")?.status, "succeeded");

    assert.throws(() => {
      backfill.startBackfill(
        {
          job_id: "job-too-wide",
          tenant_id: tenantId,
          stream_id: streamId,
          start_slot: 10,
          end_slot: 99,
        },
        []
      );
    }, /exceeds max span/);
  });
});
