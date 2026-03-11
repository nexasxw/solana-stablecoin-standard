import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { AuditExportWorker, type AuditExporter } from "../jobs/audit-export-worker";
import { ComplianceWorker, type ComplianceMutationExecutor } from "../jobs/compliance-worker";
import {
  AuditExportIdempotencyStore,
  AuditRouteHandlers,
} from "../routes/audit";
import {
  ComplianceMutationIdempotencyStore,
  ComplianceMutationRouteHandlers,
} from "../routes/compliance-jobs";
import { ScreeningRouteHandlers } from "../routes/screening";
import { ComplianceRepository } from "../store/compliance-repository";

const tenantId = "tenant-compliance";

const headers = (requestId: string, idempotencyKey?: string) => {
  const base: Record<string, string> = {
    "x-request-id": requestId,
    "x-tenant-id": tenantId,
    "x-service-id": "issuer-service",
    "x-service-role": "issuer",
    "x-service-tenant-ids": tenantId,
    "x-requester-id": "ops.requester",
    "x-approver-id": "ops.approver",
    "x-intent-signature": `sig-${requestId}`,
    "x-intent-signature-alg": "ed25519",
    "x-intent-signed-at": "2026-03-11T12:00:00.000Z",
    "x-intent-nonce": `nonce-${requestId}`,
  };

  if (idempotencyKey) {
    base["x-idempotency-key"] = idempotencyKey;
  }

  return base;
};

describe("compliance SRV-03 integration contracts", () => {
  it("returns stable screening decisions and reason codes", () => {
    const repository = new ComplianceRepository();
    const screening = new ScreeningRouteHandlers(repository);

    const allow = screening.evaluate({
      headers: headers("req-screen-allow"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "blacklist_add",
        subject: "holder-a",
        onchain_blacklisted: false,
      },
    });

    const deny = screening.evaluate({
      headers: headers("req-screen-deny"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "seize",
        subject: "holder-b",
        amount: "100",
        onchain_blacklisted: false,
      },
    });

    const review = screening.evaluate({
      headers: headers("req-screen-review"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "seize",
        subject: "holder-c",
        amount: "1000000",
        onchain_blacklisted: true,
      },
    });

    assert.equal(allow.success, true);
    assert.equal(allow.data?.decision, "allow");
    assert.equal(allow.data?.reason_code, "ALLOW_POLICY_PASS");

    assert.equal(deny.success, true);
    assert.equal(deny.data?.decision, "deny");
    assert.equal(deny.data?.reason_code, "DENY_SEIZE_TARGET_NOT_BLACKLISTED");

    assert.equal(review.success, true);
    assert.equal(review.data?.decision, "review_required");
    assert.equal(review.data?.reason_code, "REVIEW_LARGE_AMOUNT");

    const decisions = new Set([allow.data?.decision, deny.data?.decision, review.data?.decision]);
    assert.deepEqual(decisions, new Set(["allow", "deny", "review_required"]));
  });

  it("blocks review-required mutation until explicit override and preserves identity chain", async () => {
    const repository = new ComplianceRepository();
    const screening = new ScreeningRouteHandlers(repository);
    const handlers = new ComplianceMutationRouteHandlers(
      repository,
      new ComplianceMutationIdempotencyStore()
    );

    const reviewDecision = screening.evaluate({
      headers: headers("req-review-1"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "seize",
        subject: "holder-risk",
        amount: "1000000",
        onchain_blacklisted: true,
      },
    });

    assert.equal(reviewDecision.success, true);

    const blocked = handlers.createMutationJob({
      headers: headers("req-mutation-blocked", "idem-mutation-1"),
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          operation: "seize",
          subject: "holder-risk",
          amount: "1000000",
        },
      },
    });

    assert.equal(blocked.success, false);
    assert.equal(blocked.code, "INVALID_STATE");

    const resolved = handlers.resolveReview({
      headers: {
        ...headers("req-review-resolve"),
        "x-reviewer-id": "compliance.reviewer",
      },
      body: {
        tenant_id: tenantId,
        screening_id: reviewDecision.data?.screening_id as string,
        decision: "approved",
      },
    });

    assert.equal(resolved.success, true);
    assert.equal(resolved.data?.review_status, "approved");

    const queued = handlers.createMutationJob({
      headers: headers("req-mutation-queued", "idem-mutation-1"),
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          operation: "seize",
          subject: "holder-risk",
          amount: "1000000",
        },
      },
    });

    assert.equal(queued.success, true);
    assert.equal(queued.data?.state, "queued");
    assert.equal(queued.data?.screening_reason_code, "REVIEW_LARGE_AMOUNT");

    const replay = handlers.createMutationJob({
      headers: headers("req-mutation-replay", "idem-mutation-1"),
      body: {
        tenant_id: tenantId,
        payload: {
          stablecoin_id: "mint-1",
          operation: "seize",
          subject: "holder-risk",
          amount: "1000000",
        },
      },
    });

    assert.equal(replay.success, true);
    assert.equal(replay.data?.replayed, true);

    const executor: ComplianceMutationExecutor = {
      blacklistAdd: async () => {
        throw new Error("not used");
      },
      blacklistRemove: async () => {
        throw new Error("not used");
      },
      seize: async () => {
        return {
          transaction_signature: "tx-seize-1",
          slot: 222,
        };
      },
    };

    const worker = new ComplianceWorker(repository, executor);
    const result = await worker.runNext(tenantId);

    assert.equal(result.processed, true);
    assert.equal(result.job?.state, "succeeded");
    assert.equal(result.job?.result?.transaction_signature, "tx-seize-1");
    assert.equal(result.job?.requester_id, "ops.requester");
    assert.equal(result.job?.approver_id, "ops.approver");
    assert.equal(result.job?.executor_service_id, "compliance-worker");
    assert.equal(result.job?.intent_signature.signature, "sig-req-mutation-queued");
  });

  it("processes audit export jobs through lifecycle with 30-day retention", async () => {
    const repository = new ComplianceRepository();

    repository.appendAuditRecord(tenantId, {
      request_id: "req-audit-1",
      event_type: "compliance.mutation.seize.succeeded",
      event_version: "v1",
      occurred_at: "2026-03-11T12:05:00.000Z",
      actor_requester_id: "ops.requester",
      actor_approver_id: "ops.approver",
      actor_executor_service_id: "compliance-worker",
      body: {
        job_id: "job-1",
      },
    });

    repository.appendAuditRecord(tenantId, {
      request_id: "req-audit-2",
      event_type: "compliance.screening.review_resolved",
      event_version: "v1",
      occurred_at: "2026-03-11T12:06:00.000Z",
      actor_requester_id: "compliance.reviewer",
      actor_approver_id: null,
      actor_executor_service_id: "compliance-worker",
      body: {
        screening_id: "screening-1",
      },
    });

    const handlers = new AuditRouteHandlers(repository, new AuditExportIdempotencyStore());
    const listed = handlers.listAuditRecords({
      headers: headers("req-audit-list"),
      query: {
        tenant_id: tenantId,
        limit: 1,
      },
    });

    assert.equal(listed.success, true);
    assert.equal(listed.data?.rows.length, 1);
    assert.equal(typeof listed.data?.next_cursor, "string");

    const created = handlers.createAuditExportJob({
      headers: headers("req-audit-export", "idem-export-1"),
      body: {
        tenant_id: tenantId,
        query: {
          limit: 100,
        },
      },
    });

    assert.equal(created.success, true);
    assert.equal(created.data?.state, "queued");

    const exporter: AuditExporter = {
      export: async ({ rows }) => {
        const payload = rows.map((row) => JSON.stringify(row)).join("\n");
        return {
          location: "s3://audit-exports/tenant-compliance/export-1.jsonl",
          payload,
          bytes: Buffer.byteLength(payload, "utf8"),
        };
      },
    };

    const worker = new AuditExportWorker(repository, exporter);
    const run = await worker.runNext(tenantId);

    assert.equal(run.processed, true);
    assert.equal(run.job?.state, "succeeded");
    assert.equal(run.job?.requester_id, "ops.requester");
    assert.equal(run.job?.approver_id, "ops.approver");
    assert.equal(run.job?.executor_service_id, "compliance-audit-export-worker");
    assert.ok(run.job?.artifact?.expires_at);

    const completedAt = new Date(run.job?.artifact?.generated_at ?? "").getTime();
    const expiresAt = new Date(run.job?.artifact?.expires_at ?? "").getTime();
    const msInDay = 24 * 60 * 60 * 1000;
    assert.equal((expiresAt - completedAt) / msInDay, 30);

    const replayed = handlers.createAuditExportJob({
      headers: headers("req-audit-export-replay", "idem-export-1"),
      body: {
        tenant_id: tenantId,
        query: {
          limit: 100,
        },
      },
    });

    assert.equal(replayed.success, true);
    assert.equal(replayed.data?.replayed, true);

    const purgeDate = new Date(run.job?.artifact?.expires_at ?? "");
    purgeDate.setUTCDate(purgeDate.getUTCDate() + 1);

    const purge = repository.purgeExpiredAuditExports(() => purgeDate);
    assert.equal(purge.purged_jobs, 1);

    const postPurge = handlers.getAuditExportJob(
      { headers: headers("req-after-purge") },
      { tenant_id: tenantId, job_id: run.job?.id as string }
    );

    assert.equal(postPurge.success, false);
    assert.equal(postPurge.code, "NOT_FOUND");
  });
});
