import {
  createErrorEnvelope,
  createSuccessEnvelope,
  type ApiEnvelope,
} from "../../../shared/dist/contracts/envelope";
import {
  buildIssuanceIdentityChain,
  parseServiceIdentity,
  requireIssuerAuthorization,
} from "../../../shared/dist/auth/service-auth";
import { StableServiceError, toStableError } from "../../../shared/dist/contracts/errors";
import {
  executeWithDurableIdempotency,
  type DurableIdempotencyRecord,
  type DurableIdempotencyStore,
} from "../../../shared/dist/middleware/idempotency";
import {
  createRequestContext,
  requireTenantScope,
  type RequestContextHeaders,
} from "../../../shared/dist/middleware/request-context";

import {
  type ComplianceMutationJobPayload,
  type ComplianceMutationJobRecord,
  type ComplianceMutationType,
  ComplianceRepository,
} from "../store/compliance-repository";

const IDEMPOTENCY_HEADER = "x-idempotency-key";
const REVIEWER_HEADER = "x-reviewer-id";

interface CreateMutationJobRequest {
  headers: RequestContextHeaders;
  body: {
    tenant_id: string;
    payload: ComplianceMutationJobPayload;
  };
}

interface ResolveReviewRequest {
  headers: RequestContextHeaders;
  body: {
    tenant_id: string;
    screening_id: string;
    decision: "approved" | "rejected";
  };
}

interface ListMutationJobsRequest {
  headers: RequestContextHeaders;
  query: {
    tenant_id: string;
    state?: ComplianceMutationJobRecord["state"];
    operation?: ComplianceMutationType;
    limit?: number;
  };
}

interface ReadMutationJobRequest {
  headers: RequestContextHeaders;
}

interface MutationJobAccepted {
  job_id: string;
  state: ComplianceMutationJobRecord["state"];
  replayed: boolean;
  screening_id: string;
  screening_reason_code: string;
}

const readSingleHeader = (headers: RequestContextHeaders, key: string): string | null => {
  const value = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
  if (Array.isArray(value)) {
    const first = value.find((entry) => entry.trim().length > 0);
    return first ? first.trim() : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
};

const parseIdempotencyKey = (headers: RequestContextHeaders): string => {
  const value = readSingleHeader(headers, IDEMPOTENCY_HEADER);
  if (!value) {
    throw new StableServiceError("INVALID_ARGUMENT", "Missing idempotency key header", {
      required_headers: [IDEMPOTENCY_HEADER],
    });
  }

  return value;
};

export class ComplianceMutationRouteHandlers {
  constructor(
    private readonly repository: ComplianceRepository,
    private readonly idempotencyStore: DurableIdempotencyStore<MutationJobAccepted>,
    private readonly executorServiceId = "compliance-worker"
  ) {}

  private withErrorEnvelope<T>(requestId: string, run: () => T): ApiEnvelope<T> {
    try {
      return createSuccessEnvelope(run(), "COMPLIANCE_JOBS_OK", {
        requestId,
      });
    } catch (error) {
      const stableError = toStableError(error);
      return createErrorEnvelope(
        {
          message: stableError.message,
          details: {
            ...stableError.details,
            stable_code: stableError.code,
          },
        },
        stableError.code,
        { requestId }
      );
    }
  }

  createMutationJob(request: CreateMutationJobRequest): ApiEnvelope<MutationJobAccepted> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<MutationJobAccepted>(context.request_id, () => {
      requireTenantScope(context, request.body.tenant_id);

      const identity = parseServiceIdentity(request.headers);
      requireIssuerAuthorization(identity, request.body.tenant_id);

      const latestScreening = this.repository.getLatestScreening(
        request.body.tenant_id,
        request.body.payload.stablecoin_id,
        request.body.payload.operation,
        request.body.payload.subject
      );

      if (!latestScreening) {
        throw new StableServiceError("INVALID_STATE", "Mutation blocked until screening exists", {
          tenant_id: request.body.tenant_id,
          stablecoin_id: request.body.payload.stablecoin_id,
          operation: request.body.payload.operation,
          subject: request.body.payload.subject,
        });
      }

      this.repository.ensureMutationAllowed(request.body.tenant_id, latestScreening);
      const idempotencyKey = parseIdempotencyKey(request.headers);
      const identityChain = buildIssuanceIdentityChain(request.headers, this.executorServiceId);

      const result = executeWithDurableIdempotency({
        tenant_id: request.body.tenant_id,
        request_id: context.request_id,
        idempotency_key: idempotencyKey,
        payload: {
          payload: request.body.payload,
          screening_id: latestScreening.id,
        },
        store: this.idempotencyStore,
        execute: () => {
          const created = this.repository.createMutationJob({
            tenant_id: request.body.tenant_id,
            request_id: context.request_id,
            idempotency_key: idempotencyKey,
            payload: request.body.payload,
            screening_id: latestScreening.id,
            screening_reason_code: latestScreening.reason_code,
            identity_chain: {
              requester: identityChain.requester,
              approver: identityChain.approver,
              executor_service: identityChain.executor_service,
              intent_signature: identityChain.intent_signature,
            },
          });

          this.repository.appendAuditRecord(request.body.tenant_id, {
            request_id: context.request_id,
            event_type: "compliance.mutation.queued",
            event_version: "v1",
            occurred_at: context.received_at,
            actor_requester_id: created.requester_id,
            actor_approver_id: created.approver_id,
            actor_executor_service_id: created.executor_service_id,
            body: {
              job_id: created.id,
              operation: created.job_type,
              screening_id: created.screening_id,
              screening_reason_code: created.screening_reason_code,
            },
          });

          return {
            job_id: created.id,
            state: created.state,
            replayed: false,
            screening_id: created.screening_id,
            screening_reason_code: created.screening_reason_code,
          };
        },
      });

      return {
        ...result.response,
        replayed: result.replayed,
      };
    });
  }

  resolveReview(request: ResolveReviewRequest): ApiEnvelope<{ screening_id: string; review_status: "approved" | "rejected" }> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<{ screening_id: string; review_status: "approved" | "rejected" }>(
      context.request_id,
      () => {
        requireTenantScope(context, request.body.tenant_id);

        const identity = parseServiceIdentity(request.headers);
        requireIssuerAuthorization(identity, request.body.tenant_id);

        const reviewerId = readSingleHeader(request.headers, REVIEWER_HEADER);
        if (!reviewerId) {
          throw new StableServiceError("INVALID_ARGUMENT", "Missing reviewer identity header", {
            required_headers: [REVIEWER_HEADER],
          });
        }

        const resolved = this.repository.applyScreeningOverride(
          request.body.tenant_id,
          request.body.screening_id,
          reviewerId,
          request.body.decision
        );

        this.repository.appendAuditRecord(request.body.tenant_id, {
          request_id: context.request_id,
          event_type: "compliance.screening.review_resolved",
          event_version: "v1",
          occurred_at: context.received_at,
          actor_requester_id: reviewerId,
          actor_approver_id: null,
          actor_executor_service_id: this.executorServiceId,
          body: {
            screening_id: resolved.id,
            review_status: resolved.review_status,
          },
        });

        return {
          screening_id: resolved.id,
          review_status: resolved.review_status as "approved" | "rejected",
        };
      }
    );
  }

  getMutationJob(
    request: ReadMutationJobRequest,
    params: { tenant_id: string; job_id: string }
  ): ApiEnvelope<ComplianceMutationJobRecord> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<ComplianceMutationJobRecord>(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      return this.repository.getMutationJob(params.tenant_id, params.job_id);
    });
  }

  listMutationJobs(request: ListMutationJobsRequest): ApiEnvelope<ComplianceMutationJobRecord[]> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<ComplianceMutationJobRecord[]>(context.request_id, () => {
      requireTenantScope(context, request.query.tenant_id);
      const { tenant_id: tenantId, ...query } = request.query;
      return this.repository.listMutationJobs(tenantId, query);
    });
  }
}

export class ComplianceMutationIdempotencyStore
  implements DurableIdempotencyStore<MutationJobAccepted>
{
  private readonly records = new Map<string, DurableIdempotencyRecord<MutationJobAccepted>>();

  find(tenantId: string, idempotencyKey: string): DurableIdempotencyRecord<MutationJobAccepted> | null {
    return this.records.get(`${tenantId}:${idempotencyKey}`) ?? null;
  }

  save(record: DurableIdempotencyRecord<MutationJobAccepted>): void {
    this.records.set(`${record.tenant_id}:${record.idempotency_key}`, record);
  }
}
