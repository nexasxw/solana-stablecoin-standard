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
  type AuditExportJobRecord,
  type ComplianceAuditRecord,
  ComplianceRepository,
} from "../store/compliance-repository";

const IDEMPOTENCY_HEADER = "x-idempotency-key";

interface ListAuditRequest {
  headers: RequestContextHeaders;
  query: {
    tenant_id: string;
    cursor?: string;
    limit?: number;
    event_types?: string[];
    from?: string;
    to?: string;
  };
}

interface CreateAuditExportRequest {
  headers: RequestContextHeaders;
  body: {
    tenant_id: string;
    query: {
      event_types?: string[];
      from?: string;
      to?: string;
      limit?: number;
    };
  };
}

interface ReadAuditExportRequest {
  headers: RequestContextHeaders;
}

interface AuditQueryResponse {
  rows: ComplianceAuditRecord[];
  next_cursor: string | null;
}

interface AuditExportAccepted {
  job_id: string;
  state: AuditExportJobRecord["state"];
  replayed: boolean;
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

export class AuditRouteHandlers {
  constructor(
    private readonly repository: ComplianceRepository,
    private readonly idempotencyStore: DurableIdempotencyStore<AuditExportAccepted>,
    private readonly executorServiceId = "compliance-audit-export-worker"
  ) {}

  private withErrorEnvelope<T>(requestId: string, run: () => T): ApiEnvelope<T> {
    try {
      return createSuccessEnvelope(run(), "COMPLIANCE_AUDIT_OK", {
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

  listAuditRecords(request: ListAuditRequest): ApiEnvelope<AuditQueryResponse> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<AuditQueryResponse>(context.request_id, () => {
      requireTenantScope(context, request.query.tenant_id);

      const rows = this.repository.listAuditRecords(request.query.tenant_id, {
        cursor: request.query.cursor,
        limit: request.query.limit,
        event_types: request.query.event_types,
        from: request.query.from,
        to: request.query.to,
      });

      return rows;
    });
  }

  createAuditExportJob(request: CreateAuditExportRequest): ApiEnvelope<AuditExportAccepted> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<AuditExportAccepted>(context.request_id, () => {
      requireTenantScope(context, request.body.tenant_id);

      const identity = parseServiceIdentity(request.headers);
      requireIssuerAuthorization(identity, request.body.tenant_id);

      const idempotencyKey = parseIdempotencyKey(request.headers);
      const identityChain = buildIssuanceIdentityChain(request.headers, this.executorServiceId);

      const result = executeWithDurableIdempotency({
        tenant_id: request.body.tenant_id,
        request_id: context.request_id,
        idempotency_key: idempotencyKey,
        payload: request.body.query,
        store: this.idempotencyStore,
        execute: () => {
          const created = this.repository.createAuditExportJob({
            tenant_id: request.body.tenant_id,
            request_id: context.request_id,
            idempotency_key: idempotencyKey,
            query: {
              event_types: request.body.query.event_types,
              from: request.body.query.from,
              to: request.body.query.to,
              limit: request.body.query.limit ?? 250,
            },
            identity_chain: {
              requester: identityChain.requester,
              approver: identityChain.approver,
              executor_service: identityChain.executor_service,
              intent_signature: identityChain.intent_signature,
            },
          });

          this.repository.appendAuditRecord(request.body.tenant_id, {
            request_id: context.request_id,
            event_type: "compliance.audit.export.queued",
            event_version: "v1",
            occurred_at: context.received_at,
            actor_requester_id: created.requester_id,
            actor_approver_id: created.approver_id,
            actor_executor_service_id: created.executor_service_id,
            body: {
              job_id: created.id,
              limit: created.query.limit,
            },
          });

          return {
            job_id: created.id,
            state: created.state,
            replayed: false,
          };
        },
      });

      return {
        ...result.response,
        replayed: result.replayed,
      };
    });
  }

  getAuditExportJob(
    request: ReadAuditExportRequest,
    params: { tenant_id: string; job_id: string }
  ): ApiEnvelope<AuditExportJobRecord> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<AuditExportJobRecord>(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      return this.repository.getAuditExportJob(params.tenant_id, params.job_id);
    });
  }

  purgeExpiredAuditExports(
    request: ReadAuditExportRequest,
    params: { tenant_id: string }
  ): ApiEnvelope<{ purged_jobs: number }> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<{ purged_jobs: number }>(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      return this.repository.purgeExpiredAuditExports();
    });
  }
}

export class AuditExportIdempotencyStore implements DurableIdempotencyStore<AuditExportAccepted> {
  private readonly records = new Map<string, DurableIdempotencyRecord<AuditExportAccepted>>();

  find(tenantId: string, idempotencyKey: string): DurableIdempotencyRecord<AuditExportAccepted> | null {
    return this.records.get(`${tenantId}:${idempotencyKey}`) ?? null;
  }

  save(record: DurableIdempotencyRecord<AuditExportAccepted>): void {
    this.records.set(`${record.tenant_id}:${record.idempotency_key}`, record);
  }
}
