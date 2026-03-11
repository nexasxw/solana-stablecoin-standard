import { randomUUID } from "node:crypto";

import { StableServiceError } from "@stbr/sss-shared/dist/contracts/errors";

export type IssuanceJobType = "mint" | "burn";
export type IssuanceJobState = "queued" | "running" | "succeeded" | "failed" | "canceled";

export interface IssuanceIntentSignature {
  signature: string;
  algorithm: string;
  signed_at: string;
  nonce: string;
}

export interface IssuanceIdentityChain {
  requester: string;
  approver: string | null;
  executor_service: string;
  intent_signature: IssuanceIntentSignature;
}

export interface MintJobPayload {
  stablecoin_id: string;
  recipient: string;
  amount: string;
  asset_reference?: string;
}

export interface BurnJobPayload {
  stablecoin_id: string;
  source: string;
  amount: string;
  reason?: string;
}

export type IssuanceJobPayload = MintJobPayload | BurnJobPayload;

export interface IssuanceJobRecord {
  id: string;
  tenant_id: string;
  job_type: IssuanceJobType;
  state: IssuanceJobState;
  request_id: string;
  idempotency_key: string;
  payload: IssuanceJobPayload;
  result: Record<string, unknown> | null;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
  requester_id: string;
  approver_id: string | null;
  executor_service_id: string;
  intent_signature: IssuanceIntentSignature;
  transaction_signature: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface IssuanceInternalEvent {
  id: string;
  tenant_id: string;
  job_id: string;
  event_id: string;
  event_type: string;
  event_version: string;
  request_id: string;
  occurred_at: string;
  body: Record<string, unknown>;
}

export interface IssuanceJobListQuery {
  state?: IssuanceJobState;
  job_type?: IssuanceJobType;
  limit?: number;
}

export interface CreateIssuanceJobInput {
  tenant_id: string;
  request_id: string;
  idempotency_key: string;
  job_type: IssuanceJobType;
  payload: IssuanceJobPayload;
  identity_chain: IssuanceIdentityChain;
}

const cloneJob = (job: IssuanceJobRecord): IssuanceJobRecord => {
  return {
    ...job,
    payload: structuredClone(job.payload),
    result: job.result ? structuredClone(job.result) : null,
    error: job.error ? structuredClone(job.error) : null,
    intent_signature: structuredClone(job.intent_signature),
  };
};

const validateStateTransition = (current: IssuanceJobState, next: IssuanceJobState): void => {
  const allowed: Record<IssuanceJobState, IssuanceJobState[]> = {
    queued: ["running", "canceled"],
    running: ["succeeded", "failed", "canceled"],
    succeeded: [],
    failed: [],
    canceled: [],
  };

  if (!allowed[current].includes(next)) {
    throw new StableServiceError("INVALID_STATE", "Invalid issuance job state transition", {
      from: current,
      to: next,
    });
  }
};

export class IssuanceRepository {
  private readonly jobs = new Map<string, IssuanceJobRecord>();

  private readonly tenantJobs = new Map<string, string[]>();

  private readonly events = new Map<string, IssuanceInternalEvent[]>();

  createJob(input: CreateIssuanceJobInput, now: () => Date = () => new Date()): IssuanceJobRecord {
    const createdAt = now().toISOString();
    const job: IssuanceJobRecord = {
      id: randomUUID(),
      tenant_id: input.tenant_id,
      job_type: input.job_type,
      state: "queued",
      request_id: input.request_id,
      idempotency_key: input.idempotency_key,
      payload: structuredClone(input.payload),
      result: null,
      error: null,
      requester_id: input.identity_chain.requester,
      approver_id: input.identity_chain.approver,
      executor_service_id: input.identity_chain.executor_service,
      intent_signature: structuredClone(input.identity_chain.intent_signature),
      transaction_signature: null,
      created_at: createdAt,
      updated_at: createdAt,
      started_at: null,
      completed_at: null,
    };

    this.jobs.set(job.id, job);
    const tenantQueue = this.tenantJobs.get(job.tenant_id) ?? [];
    tenantQueue.unshift(job.id);
    this.tenantJobs.set(job.tenant_id, tenantQueue);

    return cloneJob(job);
  }

  getJob(tenantId: string, jobId: string): IssuanceJobRecord {
    const found = this.jobs.get(jobId);
    if (!found || found.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Issuance job not found", {
        tenant_id: tenantId,
        job_id: jobId,
      });
    }

    return cloneJob(found);
  }

  listJobs(tenantId: string, query: IssuanceJobListQuery = {}): IssuanceJobRecord[] {
    const tenantJobIds = this.tenantJobs.get(tenantId) ?? [];
    const filtered = tenantJobIds
      .map((jobId) => this.jobs.get(jobId))
      .filter((job): job is IssuanceJobRecord => Boolean(job))
      .filter((job) => (query.state ? job.state === query.state : true))
      .filter((job) => (query.job_type ? job.job_type === query.job_type : true));

    const limit = query.limit ?? 50;
    return filtered.slice(0, limit).map((job) => cloneJob(job));
  }

  updateJobState(
    tenantId: string,
    jobId: string,
    nextState: IssuanceJobState,
    update: {
      result?: Record<string, unknown> | null;
      error?: { code: string; message: string; details?: Record<string, unknown> } | null;
      transaction_signature?: string | null;
    } = {},
    now: () => Date = () => new Date()
  ): IssuanceJobRecord {
    const found = this.getJob(tenantId, jobId);
    validateStateTransition(found.state, nextState);

    const live = this.jobs.get(jobId);
    if (!live) {
      throw new StableServiceError("NOT_FOUND", "Issuance job disappeared before update", {
        tenant_id: tenantId,
        job_id: jobId,
      });
    }

    const updatedAt = now().toISOString();
    const terminal = nextState === "succeeded" || nextState === "failed" || nextState === "canceled";

    live.state = nextState;
    live.updated_at = updatedAt;
    live.started_at = nextState === "running" ? updatedAt : live.started_at;
    live.completed_at = terminal ? updatedAt : live.completed_at;

    if (update.result !== undefined) {
      live.result = update.result;
    }
    if (update.error !== undefined) {
      live.error = update.error;
    }
    if (update.transaction_signature !== undefined) {
      live.transaction_signature = update.transaction_signature;
    }

    return cloneJob(live);
  }

  appendInternalEvent(
    tenantId: string,
    event: Omit<IssuanceInternalEvent, "id" | "tenant_id">,
    now: () => Date = () => new Date()
  ): IssuanceInternalEvent {
    this.getJob(tenantId, event.job_id);

    const stored: IssuanceInternalEvent = {
      id: randomUUID(),
      tenant_id: tenantId,
      job_id: event.job_id,
      event_id: event.event_id,
      event_type: event.event_type,
      event_version: event.event_version,
      request_id: event.request_id,
      occurred_at: event.occurred_at || now().toISOString(),
      body: structuredClone(event.body),
    };

    const tenantEvents = this.events.get(tenantId) ?? [];
    tenantEvents.push(stored);
    this.events.set(tenantId, tenantEvents);

    return structuredClone(stored);
  }

  listInternalEvents(tenantId: string, jobId?: string): IssuanceInternalEvent[] {
    const tenantEvents = this.events.get(tenantId) ?? [];
    return tenantEvents
      .filter((event) => (jobId ? event.job_id === jobId : true))
      .map((event) => structuredClone(event));
  }
}
