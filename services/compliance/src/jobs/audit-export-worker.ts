import { createHash } from "node:crypto";

import { toStableError } from "../../../shared/dist/contracts/errors";

import {
  type AuditExportJobRecord,
  ComplianceRepository,
  type ComplianceAuditRecord,
} from "../store/compliance-repository";

export interface AuditExportRunResult {
  processed: boolean;
  job: AuditExportJobRecord | null;
}

export interface AuditExporter {
  export(params: {
    tenant_id: string;
    rows: ComplianceAuditRecord[];
    request_id: string;
    job_id: string;
  }): Promise<{
    location: string;
    bytes: number;
    payload: string;
  }>;
}

export class AuditExportWorker {
  constructor(
    private readonly repository: ComplianceRepository,
    private readonly exporter: AuditExporter,
    private readonly eventVersion = "v1"
  ) {}

  async runNext(tenantId: string): Promise<AuditExportRunResult> {
    const queued = this.repository.listAuditExportJobs(tenantId, "queued", 1).at(0);

    if (!queued) {
      return {
        processed: false,
        job: null,
      };
    }

    const running = this.repository.updateAuditExportJobState(tenantId, queued.id, "running", {
      result: null,
      error: null,
    });

    this.repository.appendAuditRecord(tenantId, {
      request_id: running.request_id,
      event_type: "compliance.audit.export.running",
      event_version: this.eventVersion,
      occurred_at: new Date().toISOString(),
      actor_requester_id: running.requester_id,
      actor_approver_id: running.approver_id,
      actor_executor_service_id: running.executor_service_id,
      body: {
        job_id: running.id,
      },
    });

    try {
      const listed = this.repository.listAuditRecords(tenantId, running.query);
      const rows = listed.rows;
      const payload = rows
        .map((row) => JSON.stringify(row))
        .join("\n");

      const exported = await this.exporter.export({
        tenant_id: tenantId,
        rows,
        request_id: running.request_id,
        job_id: running.id,
      });

      const checksum = createHash("sha256").update(exported.payload || payload).digest("hex");
      const completed = this.repository.completeAuditExportJob(tenantId, running.id, {
        format: "jsonl",
        row_count: rows.length,
        checksum_sha256: checksum,
        location: exported.location,
      });

      this.repository.appendAuditRecord(tenantId, {
        request_id: completed.request_id,
        event_type: "compliance.audit.export.succeeded",
        event_version: this.eventVersion,
        occurred_at: new Date().toISOString(),
        actor_requester_id: completed.requester_id,
        actor_approver_id: completed.approver_id,
        actor_executor_service_id: completed.executor_service_id,
        body: {
          job_id: completed.id,
          row_count: rows.length,
          location: exported.location,
          bytes: exported.bytes,
          checksum_sha256: checksum,
          expires_at: completed.artifact?.expires_at,
        },
      });

      return {
        processed: true,
        job: completed,
      };
    } catch (error) {
      const stableError = toStableError(error);
      const failed = this.repository.updateAuditExportJobState(tenantId, running.id, "failed", {
        error: {
          code: stableError.code,
          message: stableError.message,
          details: stableError.details,
        },
      });

      this.repository.appendAuditRecord(tenantId, {
        request_id: failed.request_id,
        event_type: "compliance.audit.export.failed",
        event_version: this.eventVersion,
        occurred_at: new Date().toISOString(),
        actor_requester_id: failed.requester_id,
        actor_approver_id: failed.approver_id,
        actor_executor_service_id: failed.executor_service_id,
        body: {
          job_id: failed.id,
          error_code: stableError.code,
        },
      });

      return {
        processed: true,
        job: failed,
      };
    }
  }
}
