import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "mocha";

import { createWebhookRuntime } from "../../../webhook/src/index";

import { AuditExportWorker, type AuditExporter } from "../jobs/audit-export-worker";
import { AuditExportIdempotencyStore, AuditRouteHandlers } from "../routes/audit";
import { ComplianceRepository } from "../store/compliance-repository";

const tenantId = "tenant-audit";

const headers = (requestId: string, idempotencyKey?: string): Record<string, string> => {
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

describe("audit export boundary contracts", () => {
  it("keeps queued->running->succeeded lifecycle and deterministic idempotent replay contract", async () => {
    const repository = new ComplianceRepository();
    const handlers = new AuditRouteHandlers(repository, new AuditExportIdempotencyStore());

    repository.appendAuditRecord(tenantId, {
      request_id: "req-audit-source-1",
      event_type: "compliance.mutation.seize.succeeded",
      event_version: "v1",
      occurred_at: "2026-03-11T12:05:00.000Z",
      actor_requester_id: "ops.requester",
      actor_approver_id: "ops.approver",
      actor_executor_service_id: "compliance-worker",
      body: { job_id: "job-1" },
    });

    const created = handlers.createAuditExportJob({
      headers: headers("req-audit-create", "idem-audit-export-1"),
      body: { tenant_id: tenantId, query: { limit: 100 } },
    });

    assert.equal(created.success, true);
    assert.equal(created.request_id, "req-audit-create");
    assert.equal(created.code, "COMPLIANCE_AUDIT_OK");
    assert.equal(created.data?.state, "queued");
    assert.equal(created.data?.replayed, false);

    const exporter: AuditExporter = {
      export: async ({ rows }) => {
        const payload = rows.map((row) => JSON.stringify(row)).join("\n");
        return {
          location: "s3://audit-exports/tenant-audit/export-1.jsonl",
          payload,
          bytes: Buffer.byteLength(payload, "utf8"),
        };
      },
    };

    const worker = new AuditExportWorker(repository, exporter);
    const run = await worker.runNext(tenantId);

    assert.equal(run.processed, true);
    assert.equal(run.job?.state, "succeeded");
    assert.equal(run.job?.request_id, "req-audit-create");
    assert.ok(run.job?.artifact?.generated_at);
    assert.ok(run.job?.artifact?.expires_at);

    const replay = handlers.createAuditExportJob({
      headers: headers("req-audit-replay", "idem-audit-export-1"),
      body: { tenant_id: tenantId, query: { limit: 100 } },
    });

    assert.equal(replay.success, true);
    assert.equal(replay.request_id, "req-audit-replay");
    assert.equal(replay.code, "COMPLIANCE_AUDIT_OK");
    assert.equal(replay.data?.replayed, true);
    assert.equal(replay.data?.job_id, created.data?.job_id);
  });

  it("provides webhook runtime wiring and deterministic retention schema hooks", () => {
    const runtime = createWebhookRuntime();

    assert.ok(runtime.repository);
    assert.ok(runtime.subscriptionHandlers);
    assert.ok(runtime.deliveryHandlers);
    assert.ok(runtime.worker);

    const schemaPath = join(__dirname, "../../../shared/src/db/schema.sql");
    const schema = readFileSync(schemaPath, "utf8");

    assert.ok(
      schema.includes("artifact_expires_at TIMESTAMPTZ"),
      "audit_export_jobs must declare artifact_expires_at retention hook"
    );
    assert.ok(
      schema.includes(
        "CHECK (artifact_expires_at IS NULL OR artifact_expires_at = completed_at + INTERVAL '30 days')"
      ),
      "audit_export_jobs retention must be deterministic at 30 days"
    );
    assert.ok(
      schema.includes("CHECK (expires_at = failed_at + INTERVAL '180 days')"),
      "webhook_dead_letters retention must remain deterministic at 180 days"
    );
  });
});
