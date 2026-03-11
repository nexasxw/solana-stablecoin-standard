import { randomUUID } from "node:crypto";

import { toStableError } from "../../../shared/dist/contracts/errors";

import {
  type ComplianceMutationJobPayload,
  type ComplianceMutationJobRecord,
  ComplianceRepository,
} from "../store/compliance-repository";

export interface ComplianceMutationExecutionResult {
  transaction_signature: string;
  slot?: number;
}

export interface ComplianceMutationExecutor {
  blacklistAdd(payload: ComplianceMutationJobPayload): Promise<ComplianceMutationExecutionResult>;
  blacklistRemove(payload: ComplianceMutationJobPayload): Promise<ComplianceMutationExecutionResult>;
  seize(payload: ComplianceMutationJobPayload): Promise<ComplianceMutationExecutionResult>;
}

export interface ComplianceWorkerRunResult {
  processed: boolean;
  job: ComplianceMutationJobRecord | null;
}

export class ComplianceWorker {
  constructor(
    private readonly repository: ComplianceRepository,
    private readonly executor: ComplianceMutationExecutor,
    private readonly eventVersion = "v1"
  ) {}

  private emitAuditEvent(
    job: ComplianceMutationJobRecord,
    eventType: string,
    body: Record<string, unknown>,
    now: () => Date = () => new Date()
  ): void {
    this.repository.appendAuditRecord(job.tenant_id, {
      request_id: job.request_id,
      event_type: eventType,
      event_version: this.eventVersion,
      occurred_at: now().toISOString(),
      actor_requester_id: job.requester_id,
      actor_approver_id: job.approver_id,
      actor_executor_service_id: job.executor_service_id,
      body: {
        ...body,
        event_id: randomUUID(),
      },
    });
  }

  private async execute(payload: ComplianceMutationJobPayload): Promise<ComplianceMutationExecutionResult> {
    if (payload.operation === "blacklist_add") {
      return this.executor.blacklistAdd(payload);
    }

    if (payload.operation === "blacklist_remove") {
      return this.executor.blacklistRemove(payload);
    }

    return this.executor.seize(payload);
  }

  async runNext(tenantId: string): Promise<ComplianceWorkerRunResult> {
    const queued = this.repository.listMutationJobs(tenantId, { state: "queued", limit: 1 }).at(0);

    if (!queued) {
      return { processed: false, job: null };
    }

    const running = this.repository.updateMutationJobState(tenantId, queued.id, "running", {
      error: null,
      result: null,
    });

    this.emitAuditEvent(running, `compliance.mutation.${running.job_type}.running`, {
      job_id: running.id,
      operation: running.job_type,
    });

    try {
      const execution = await this.execute(running.payload);

      const succeeded = this.repository.updateMutationJobState(tenantId, running.id, "succeeded", {
        error: null,
        result: {
          transaction_signature: execution.transaction_signature,
          slot: execution.slot ?? null,
        },
      });

      this.emitAuditEvent(succeeded, `compliance.mutation.${succeeded.job_type}.succeeded`, {
        job_id: succeeded.id,
        transaction_signature: execution.transaction_signature,
        slot: execution.slot ?? null,
      });

      return {
        processed: true,
        job: succeeded,
      };
    } catch (error) {
      const stableError = toStableError(error);
      const failed = this.repository.updateMutationJobState(tenantId, running.id, "failed", {
        result: null,
        error: {
          code: stableError.code,
          message: stableError.message,
          details: stableError.details,
        },
      });

      this.emitAuditEvent(failed, `compliance.mutation.${failed.job_type}.failed`, {
        job_id: failed.id,
        error_code: stableError.code,
      });

      return {
        processed: true,
        job: failed,
      };
    }
  }

  cancelQueuedJob(tenantId: string, jobId: string): ComplianceMutationJobRecord {
    const canceled = this.repository.updateMutationJobState(tenantId, jobId, "canceled");
    this.emitAuditEvent(canceled, `compliance.mutation.${canceled.job_type}.canceled`, {
      job_id: canceled.id,
      operation: canceled.job_type,
    });
    return canceled;
  }
}
