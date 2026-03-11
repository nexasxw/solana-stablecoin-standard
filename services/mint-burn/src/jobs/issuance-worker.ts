import { randomUUID } from "node:crypto";

import { toStableError } from "../../../shared/dist/contracts/errors";

import {
  type BurnJobPayload,
  type IssuanceJobRecord,
  IssuanceRepository,
  type MintJobPayload,
} from "../store/issuance-repository";

export interface IssuanceExecutionResult {
  transaction_signature: string;
  slot?: number;
}

export interface IssuanceExecutor {
  mint(payload: MintJobPayload): Promise<IssuanceExecutionResult>;
  burn(payload: BurnJobPayload): Promise<IssuanceExecutionResult>;
}

export interface IssuanceWorkerRunResult {
  processed: boolean;
  job: IssuanceJobRecord | null;
}

export class IssuanceWorker {
  constructor(
    private readonly repository: IssuanceRepository,
    private readonly executor: IssuanceExecutor,
    private readonly eventVersion: string = "v1"
  ) {}

  private emitEvent(
    job: IssuanceJobRecord,
    eventType: string,
    body: Record<string, unknown>,
    now: () => Date = () => new Date()
  ): void {
    this.repository.appendInternalEvent(job.tenant_id, {
      job_id: job.id,
      event_id: randomUUID(),
      event_type: eventType,
      event_version: this.eventVersion,
      request_id: job.request_id,
      occurred_at: now().toISOString(),
      body,
    });
  }

  async runNext(tenantId: string): Promise<IssuanceWorkerRunResult> {
    const queued = this.repository
      .listJobs(tenantId, { state: "queued", limit: 1 })
      .at(0);

    if (!queued) {
      return { processed: false, job: null };
    }

    const running = this.repository.updateJobState(tenantId, queued.id, "running");
    this.emitEvent(running, `issuance.${running.job_type}.running`, {
      tenant_id: tenantId,
      job_id: running.id,
      job_type: running.job_type,
    });

    try {
      const execution =
        running.job_type === "mint"
          ? await this.executor.mint(running.payload as MintJobPayload)
          : await this.executor.burn(running.payload as BurnJobPayload);

      const succeeded = this.repository.updateJobState(tenantId, running.id, "succeeded", {
        result: {
          transaction_signature: execution.transaction_signature,
          slot: execution.slot ?? null,
        },
        transaction_signature: execution.transaction_signature,
        error: null,
      });

      this.emitEvent(succeeded, `issuance.${succeeded.job_type}.succeeded`, {
        tenant_id: tenantId,
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
      const failed = this.repository.updateJobState(tenantId, running.id, "failed", {
        result: null,
        transaction_signature: null,
        error: {
          code: stableError.code,
          message: stableError.message,
          details: stableError.details,
        },
      });

      this.emitEvent(failed, `issuance.${failed.job_type}.failed`, {
        tenant_id: tenantId,
        job_id: failed.id,
        error_code: stableError.code,
      });

      return {
        processed: true,
        job: failed,
      };
    }
  }

  cancelQueuedJob(tenantId: string, jobId: string): IssuanceJobRecord {
    const canceled = this.repository.updateJobState(tenantId, jobId, "canceled");
    this.emitEvent(canceled, `issuance.${canceled.job_type}.canceled`, {
      tenant_id: tenantId,
      job_id: canceled.id,
    });
    return canceled;
  }
}
