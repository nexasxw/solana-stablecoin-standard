import { randomUUID } from "node:crypto";

import { StableServiceError } from "../../../shared/dist/contracts/errors";

export type ScreeningDecision = "allow" | "deny" | "review_required";
export type ScreeningReviewStatus = "pending" | "approved" | "rejected";
export type ComplianceMutationType = "blacklist_add" | "blacklist_remove" | "seize";
export type ComplianceJobState = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type AuditExportState = "queued" | "running" | "succeeded" | "failed" | "canceled";

export interface ComplianceIntentSignature {
  signature: string;
  algorithm: string;
  signed_at: string;
  nonce: string;
}

export interface ComplianceIdentityChain {
  requester: string;
  approver: string | null;
  executor_service: string;
  intent_signature: ComplianceIntentSignature;
}

export interface ScreeningRecord {
  id: string;
  tenant_id: string;
  request_id: string;
  stablecoin_id: string;
  operation: ComplianceMutationType;
  subject: string;
  amount: string | null;
  onchain_blacklisted: boolean;
  decision: ScreeningDecision;
  reason_code: string;
  reason_details: Record<string, unknown> | null;
  review_status: ScreeningReviewStatus | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceMutationJobPayload {
  stablecoin_id: string;
  operation: ComplianceMutationType;
  subject: string;
  amount?: string;
  reason?: string;
}

export interface ComplianceMutationJobRecord {
  id: string;
  tenant_id: string;
  request_id: string;
  idempotency_key: string;
  job_type: ComplianceMutationType;
  state: ComplianceJobState;
  payload: ComplianceMutationJobPayload;
  screening_id: string;
  screening_reason_code: string;
  result: Record<string, unknown> | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  requester_id: string;
  approver_id: string | null;
  executor_service_id: string;
  intent_signature: ComplianceIntentSignature;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ComplianceAuditRecord {
  id: string;
  tenant_id: string;
  request_id: string;
  event_type: string;
  event_version: string;
  occurred_at: string;
  actor_requester_id: string;
  actor_approver_id: string | null;
  actor_executor_service_id: string;
  body: Record<string, unknown>;
  created_at: string;
}

export interface AuditExportArtifact {
  format: "jsonl";
  row_count: number;
  checksum_sha256: string;
  location: string;
  generated_at: string;
  expires_at: string;
}

export interface AuditExportJobRecord {
  id: string;
  tenant_id: string;
  request_id: string;
  idempotency_key: string;
  state: AuditExportState;
  query: {
    event_types?: string[];
    from?: string;
    to?: string;
    limit: number;
  };
  requester_id: string;
  approver_id: string | null;
  executor_service_id: string;
  intent_signature: ComplianceIntentSignature;
  artifact: AuditExportArtifact | null;
  result: Record<string, unknown> | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ComplianceScreeningInput {
  tenant_id: string;
  request_id: string;
  stablecoin_id: string;
  operation: ComplianceMutationType;
  subject: string;
  amount?: string;
  onchain_blacklisted: boolean;
  reason_details?: Record<string, unknown>;
}

export interface ComplianceMutationCreateInput {
  tenant_id: string;
  request_id: string;
  idempotency_key: string;
  payload: ComplianceMutationJobPayload;
  screening_id: string;
  screening_reason_code: string;
  identity_chain: ComplianceIdentityChain;
}

export interface AuditExportCreateInput {
  tenant_id: string;
  request_id: string;
  idempotency_key: string;
  query: {
    event_types?: string[];
    from?: string;
    to?: string;
    limit: number;
  };
  identity_chain: ComplianceIdentityChain;
}

export interface AuditQuery {
  cursor?: string;
  limit?: number;
  event_types?: string[];
  from?: string;
  to?: string;
}

const MAX_SCREENING_REVIEW_AMOUNT = 1_000_000n;
const MAX_AUDIT_QUERY_LIMIT = 250;
const AUDIT_EXPORT_RETENTION_DAYS = 30;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const validateLifecycleTransition = (
  from: ComplianceJobState | AuditExportState,
  to: ComplianceJobState | AuditExportState,
  entity: string
): void => {
  const allowed: Record<ComplianceJobState, ComplianceJobState[]> = {
    queued: ["running", "canceled"],
    running: ["succeeded", "failed", "canceled"],
    succeeded: [],
    failed: [],
    canceled: [],
  };

  if (!allowed[from as ComplianceJobState].includes(to as ComplianceJobState)) {
    throw new StableServiceError("INVALID_STATE", `Invalid ${entity} transition`, {
      from,
      to,
    });
  }
};

const parseBigAmount = (amount: string | undefined, field: string): bigint | null => {
  if (!amount) {
    return null;
  }

  try {
    const parsed = BigInt(amount);
    if (parsed < 0n) {
      throw new Error("negative");
    }
    return parsed;
  } catch {
    throw new StableServiceError("INVALID_ARGUMENT", `Invalid ${field}`, {
      field,
      value: amount,
    });
  }
};

const isIsoTimestamp = (value: string): boolean => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const screeningKey = (
  tenantId: string,
  stablecoinId: string,
  operation: ComplianceMutationType,
  subject: string
): string => {
  return `${tenantId}:${stablecoinId}:${operation}:${subject}`;
};

export class ComplianceRepository {
  private readonly screenings = new Map<string, ScreeningRecord>();

  private readonly latestScreenings = new Map<string, string>();

  private readonly mutationJobs = new Map<string, ComplianceMutationJobRecord>();

  private readonly tenantMutationJobs = new Map<string, string[]>();

  private readonly auditRecords = new Map<string, ComplianceAuditRecord[]>();

  private readonly auditExportJobs = new Map<string, AuditExportJobRecord>();

  private readonly tenantAuditExportJobs = new Map<string, string[]>();

  evaluateAndStoreScreening(
    input: ComplianceScreeningInput,
    now: () => Date = () => new Date()
  ): ScreeningRecord {
    const createdAt = now().toISOString();
    const amount = parseBigAmount(input.amount, "amount");

    const decision = (() => {
      if (input.operation === "seize" && !input.onchain_blacklisted) {
        return { decision: "deny" as ScreeningDecision, reason_code: "DENY_SEIZE_TARGET_NOT_BLACKLISTED" };
      }

      if (input.operation === "blacklist_add" && input.onchain_blacklisted) {
        return { decision: "deny" as ScreeningDecision, reason_code: "DENY_ALREADY_BLACKLISTED" };
      }

      if (input.operation === "blacklist_remove" && !input.onchain_blacklisted) {
        return { decision: "deny" as ScreeningDecision, reason_code: "DENY_NOT_BLACKLISTED" };
      }

      if (amount !== null && amount >= MAX_SCREENING_REVIEW_AMOUNT) {
        return {
          decision: "review_required" as ScreeningDecision,
          reason_code: "REVIEW_LARGE_AMOUNT",
        };
      }

      if (input.reason_details?.manual_review === true) {
        return {
          decision: "review_required" as ScreeningDecision,
          reason_code: "REVIEW_POLICY_TRIGGER",
        };
      }

      return { decision: "allow" as ScreeningDecision, reason_code: "ALLOW_POLICY_PASS" };
    })();

    const screening: ScreeningRecord = {
      id: randomUUID(),
      tenant_id: input.tenant_id,
      request_id: input.request_id,
      stablecoin_id: input.stablecoin_id,
      operation: input.operation,
      subject: input.subject,
      amount: input.amount ?? null,
      onchain_blacklisted: input.onchain_blacklisted,
      decision: decision.decision,
      reason_code: decision.reason_code,
      reason_details: clone(input.reason_details ?? {}),
      review_status: decision.decision === "review_required" ? "pending" : null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: createdAt,
      updated_at: createdAt,
    };

    this.screenings.set(screening.id, screening);
    this.latestScreenings.set(
      screeningKey(input.tenant_id, input.stablecoin_id, input.operation, input.subject),
      screening.id
    );

    return clone(screening);
  }

  getScreening(tenantId: string, screeningId: string): ScreeningRecord {
    const screening = this.screenings.get(screeningId);
    if (!screening || screening.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Compliance screening not found", {
        tenant_id: tenantId,
        screening_id: screeningId,
      });
    }

    return clone(screening);
  }

  getLatestScreening(
    tenantId: string,
    stablecoinId: string,
    operation: ComplianceMutationType,
    subject: string
  ): ScreeningRecord | null {
    const latestId = this.latestScreenings.get(screeningKey(tenantId, stablecoinId, operation, subject));
    if (!latestId) {
      return null;
    }

    return this.getScreening(tenantId, latestId);
  }

  applyScreeningOverride(
    tenantId: string,
    screeningId: string,
    reviewerId: string,
    decision: "approved" | "rejected",
    now: () => Date = () => new Date()
  ): ScreeningRecord {
    const screening = this.getScreening(tenantId, screeningId);
    if (screening.decision !== "review_required") {
      throw new StableServiceError("INVALID_STATE", "Only review_required screenings can be overridden", {
        screening_id: screeningId,
        decision: screening.decision,
      });
    }

    if (screening.review_status !== "pending") {
      throw new StableServiceError("INVALID_STATE", "Screening review is already resolved", {
        screening_id: screeningId,
        review_status: screening.review_status,
      });
    }

    const live = this.screenings.get(screeningId);
    if (!live) {
      throw new StableServiceError("NOT_FOUND", "Compliance screening disappeared before override", {
        screening_id: screeningId,
      });
    }

    const reviewedAt = now().toISOString();
    live.review_status = decision;
    live.reviewed_by = reviewerId;
    live.reviewed_at = reviewedAt;
    live.updated_at = reviewedAt;

    return clone(live);
  }

  ensureMutationAllowed(tenantId: string, screening: ScreeningRecord): void {
    if (screening.tenant_id !== tenantId) {
      throw new StableServiceError("FORBIDDEN", "Tenant scope mismatch for screening", {
        tenant_id: tenantId,
        screening_tenant_id: screening.tenant_id,
      });
    }

    if (screening.decision === "deny") {
      throw new StableServiceError("FORBIDDEN", "Compliance decision denied mutation", {
        screening_id: screening.id,
        reason_code: screening.reason_code,
      });
    }

    if (screening.decision === "review_required") {
      if (screening.review_status === "approved") {
        return;
      }

      throw new StableServiceError("INVALID_STATE", "Mutation blocked until explicit review decision", {
        screening_id: screening.id,
        reason_code: screening.reason_code,
        review_status: screening.review_status,
      });
    }
  }

  createMutationJob(
    input: ComplianceMutationCreateInput,
    now: () => Date = () => new Date()
  ): ComplianceMutationJobRecord {
    const createdAt = now().toISOString();

    const job: ComplianceMutationJobRecord = {
      id: randomUUID(),
      tenant_id: input.tenant_id,
      request_id: input.request_id,
      idempotency_key: input.idempotency_key,
      job_type: input.payload.operation,
      state: "queued",
      payload: clone(input.payload),
      screening_id: input.screening_id,
      screening_reason_code: input.screening_reason_code,
      result: null,
      error: null,
      requester_id: input.identity_chain.requester,
      approver_id: input.identity_chain.approver,
      executor_service_id: input.identity_chain.executor_service,
      intent_signature: clone(input.identity_chain.intent_signature),
      created_at: createdAt,
      updated_at: createdAt,
      started_at: null,
      completed_at: null,
    };

    this.mutationJobs.set(job.id, job);
    const tenantQueue = this.tenantMutationJobs.get(job.tenant_id) ?? [];
    tenantQueue.unshift(job.id);
    this.tenantMutationJobs.set(job.tenant_id, tenantQueue);

    return clone(job);
  }

  getMutationJob(tenantId: string, jobId: string): ComplianceMutationJobRecord {
    const job = this.mutationJobs.get(jobId);
    if (!job || job.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Compliance mutation job not found", {
        tenant_id: tenantId,
        job_id: jobId,
      });
    }

    return clone(job);
  }

  listMutationJobs(
    tenantId: string,
    query: {
      state?: ComplianceJobState;
      operation?: ComplianceMutationType;
      limit?: number;
    } = {}
  ): ComplianceMutationJobRecord[] {
    const ids = this.tenantMutationJobs.get(tenantId) ?? [];
    const rows = ids
      .map((id) => this.mutationJobs.get(id))
      .filter((row): row is ComplianceMutationJobRecord => Boolean(row))
      .filter((row) => (query.state ? row.state === query.state : true))
      .filter((row) => (query.operation ? row.job_type === query.operation : true));

    return rows.slice(0, query.limit ?? 50).map((row) => clone(row));
  }

  updateMutationJobState(
    tenantId: string,
    jobId: string,
    nextState: ComplianceJobState,
    update: {
      result?: Record<string, unknown> | null;
      error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      } | null;
    } = {},
    now: () => Date = () => new Date()
  ): ComplianceMutationJobRecord {
    const current = this.getMutationJob(tenantId, jobId);
    validateLifecycleTransition(current.state, nextState, "compliance mutation job");

    const live = this.mutationJobs.get(jobId);
    if (!live) {
      throw new StableServiceError("NOT_FOUND", "Compliance mutation job disappeared before update", {
        tenant_id: tenantId,
        job_id: jobId,
      });
    }

    const updatedAt = now().toISOString();
    const isTerminal = nextState === "succeeded" || nextState === "failed" || nextState === "canceled";

    live.state = nextState;
    live.updated_at = updatedAt;
    live.started_at = nextState === "running" ? updatedAt : live.started_at;
    live.completed_at = isTerminal ? updatedAt : live.completed_at;

    if (update.result !== undefined) {
      live.result = update.result;
    }
    if (update.error !== undefined) {
      live.error = update.error;
    }

    return clone(live);
  }

  appendAuditRecord(
    tenantId: string,
    record: {
      request_id: string;
      event_type: string;
      event_version: string;
      occurred_at: string;
      actor_requester_id: string;
      actor_approver_id: string | null;
      actor_executor_service_id: string;
      body: Record<string, unknown>;
    },
    now: () => Date = () => new Date()
  ): ComplianceAuditRecord {
    if (!isIsoTimestamp(record.occurred_at)) {
      throw new StableServiceError("INVALID_ARGUMENT", "Invalid occurred_at in audit record", {
        occurred_at: record.occurred_at,
      });
    }

    const createdAt = now().toISOString();
    const persisted: ComplianceAuditRecord = {
      id: randomUUID(),
      tenant_id: tenantId,
      request_id: record.request_id,
      event_type: record.event_type,
      event_version: record.event_version,
      occurred_at: record.occurred_at,
      actor_requester_id: record.actor_requester_id,
      actor_approver_id: record.actor_approver_id,
      actor_executor_service_id: record.actor_executor_service_id,
      body: clone(record.body),
      created_at: createdAt,
    };

    const tenantRecords = this.auditRecords.get(tenantId) ?? [];
    tenantRecords.push(persisted);
    this.auditRecords.set(tenantId, tenantRecords);

    return clone(persisted);
  }

  listAuditRecords(tenantId: string, query: AuditQuery = {}): { rows: ComplianceAuditRecord[]; next_cursor: string | null } {
    const rows = (this.auditRecords.get(tenantId) ?? []).slice().sort((left, right) => {
      if (left.occurred_at === right.occurred_at) {
        return left.id.localeCompare(right.id);
      }
      return left.occurred_at.localeCompare(right.occurred_at);
    });

    const filtered = rows
      .filter((row) => {
        if (query.event_types && query.event_types.length > 0 && !query.event_types.includes(row.event_type)) {
          return false;
        }

        if (query.from && row.occurred_at < query.from) {
          return false;
        }

        if (query.to && row.occurred_at > query.to) {
          return false;
        }

        return true;
      });

    const limit = Math.min(Math.max(query.limit ?? 50, 1), MAX_AUDIT_QUERY_LIMIT);
    const offset = query.cursor ? Number.parseInt(query.cursor, 10) : 0;
    const safeOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset;

    const pagedRows = filtered.slice(safeOffset, safeOffset + limit).map((row) => clone(row));
    const nextOffset = safeOffset + limit;
    const nextCursor = nextOffset < filtered.length ? String(nextOffset) : null;

    return {
      rows: pagedRows,
      next_cursor: nextCursor,
    };
  }

  createAuditExportJob(
    input: AuditExportCreateInput,
    now: () => Date = () => new Date()
  ): AuditExportJobRecord {
    const createdAt = now().toISOString();
    const job: AuditExportJobRecord = {
      id: randomUUID(),
      tenant_id: input.tenant_id,
      request_id: input.request_id,
      idempotency_key: input.idempotency_key,
      state: "queued",
      query: clone(input.query),
      requester_id: input.identity_chain.requester,
      approver_id: input.identity_chain.approver,
      executor_service_id: input.identity_chain.executor_service,
      intent_signature: clone(input.identity_chain.intent_signature),
      artifact: null,
      result: null,
      error: null,
      created_at: createdAt,
      updated_at: createdAt,
      started_at: null,
      completed_at: null,
    };

    this.auditExportJobs.set(job.id, job);
    const tenantQueue = this.tenantAuditExportJobs.get(job.tenant_id) ?? [];
    tenantQueue.unshift(job.id);
    this.tenantAuditExportJobs.set(job.tenant_id, tenantQueue);

    return clone(job);
  }

  getAuditExportJob(tenantId: string, jobId: string): AuditExportJobRecord {
    const job = this.auditExportJobs.get(jobId);
    if (!job || job.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Audit export job not found", {
        tenant_id: tenantId,
        job_id: jobId,
      });
    }

    return clone(job);
  }

  listAuditExportJobs(tenantId: string, state?: AuditExportState, limit = 50): AuditExportJobRecord[] {
    const ids = this.tenantAuditExportJobs.get(tenantId) ?? [];
    const rows = ids
      .map((id) => this.auditExportJobs.get(id))
      .filter((row): row is AuditExportJobRecord => Boolean(row))
      .filter((row) => (state ? row.state === state : true));

    return rows.slice(0, limit).map((row) => clone(row));
  }

  updateAuditExportJobState(
    tenantId: string,
    jobId: string,
    nextState: AuditExportState,
    update: {
      artifact?: AuditExportArtifact | null;
      result?: Record<string, unknown> | null;
      error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      } | null;
    } = {},
    now: () => Date = () => new Date()
  ): AuditExportJobRecord {
    const current = this.getAuditExportJob(tenantId, jobId);
    validateLifecycleTransition(current.state, nextState, "audit export job");

    const live = this.auditExportJobs.get(jobId);
    if (!live) {
      throw new StableServiceError("NOT_FOUND", "Audit export job disappeared before update", {
        tenant_id: tenantId,
        job_id: jobId,
      });
    }

    const updatedAt = now().toISOString();
    const isTerminal = nextState === "succeeded" || nextState === "failed" || nextState === "canceled";

    live.state = nextState;
    live.updated_at = updatedAt;
    live.started_at = nextState === "running" ? updatedAt : live.started_at;
    live.completed_at = isTerminal ? updatedAt : live.completed_at;

    if (update.artifact !== undefined) {
      live.artifact = update.artifact;
    }
    if (update.result !== undefined) {
      live.result = update.result;
    }
    if (update.error !== undefined) {
      live.error = update.error;
    }

    return clone(live);
  }

  completeAuditExportJob(
    tenantId: string,
    jobId: string,
    artifact: Omit<AuditExportArtifact, "generated_at" | "expires_at">,
    now: () => Date = () => new Date()
  ): AuditExportJobRecord {
    const generatedAtDate = now();
    const expiresAtDate = new Date(generatedAtDate);
    expiresAtDate.setUTCDate(expiresAtDate.getUTCDate() + AUDIT_EXPORT_RETENTION_DAYS);

    return this.updateAuditExportJobState(
      tenantId,
      jobId,
      "succeeded",
      {
        artifact: {
          ...artifact,
          generated_at: generatedAtDate.toISOString(),
          expires_at: expiresAtDate.toISOString(),
        },
        result: {
          format: artifact.format,
          row_count: artifact.row_count,
          location: artifact.location,
        },
        error: null,
      },
      () => generatedAtDate
    );
  }

  purgeExpiredAuditExports(now: () => Date = () => new Date()): { purged_jobs: number } {
    const nowIso = now().toISOString();
    let purged = 0;

    for (const [jobId, job] of this.auditExportJobs.entries()) {
      if (job.state !== "succeeded" || !job.artifact?.expires_at) {
        continue;
      }

      if (job.artifact.expires_at > nowIso) {
        continue;
      }

      this.auditExportJobs.delete(jobId);
      const tenantQueue = this.tenantAuditExportJobs.get(job.tenant_id) ?? [];
      this.tenantAuditExportJobs.set(
        job.tenant_id,
        tenantQueue.filter((id) => id !== jobId)
      );
      purged += 1;
    }

    return { purged_jobs: purged };
  }
}
