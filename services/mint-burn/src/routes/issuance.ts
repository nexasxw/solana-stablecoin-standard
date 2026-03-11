import {
  createErrorEnvelope,
  createSuccessEnvelope,
  type ApiEnvelope,
} from "../../../shared/dist/contracts/envelope";
import { StableServiceError, toStableError } from "../../../shared/dist/contracts/errors";
import {
  buildIssuanceIdentityChain,
  parseServiceIdentity,
  requireIssuerAuthorization,
} from "../../../shared/dist/auth/service-auth";
import {
  executeWithDurableIdempotency,
  type DurableIdempotencyStore,
  type DurableIdempotencyRecord,
} from "../../../shared/dist/middleware/idempotency";
import {
  createRequestContext,
  requireTenantScope,
  type RequestContextHeaders,
} from "../../../shared/dist/middleware/request-context";

import {
  type BurnJobPayload,
  type IssuanceJobListQuery,
  type IssuanceJobRecord,
  IssuanceRepository,
  type MintJobPayload,
} from "../store/issuance-repository";

interface IssuanceCreateBody<TPayload> {
  tenant_id: string;
  payload: TPayload;
}

interface IssuanceCreateRequest<TPayload> {
  headers: RequestContextHeaders;
  body: IssuanceCreateBody<TPayload>;
}

interface IssuanceReadRequest {
  headers: RequestContextHeaders;
}

interface IssuanceListRequest {
  headers: RequestContextHeaders;
  query: IssuanceJobListQuery & { tenant_id: string };
}

type CreateJobResponse = {
  job_id: string;
  state: IssuanceJobRecord["state"];
  replayed: boolean;
};

const IDEMPOTENCY_HEADER = "x-idempotency-key";

const parseIdempotencyKey = (headers: RequestContextHeaders): string => {
  const headerValue = headers[IDEMPOTENCY_HEADER] ?? headers[IDEMPOTENCY_HEADER.toUpperCase()];
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new StableServiceError("INVALID_ARGUMENT", "Missing idempotency key header", {
      required_headers: [IDEMPOTENCY_HEADER],
    });
  }

  return value.trim();
};

export class IssuanceRouteHandlers {
  constructor(
    private readonly repository: IssuanceRepository,
    private readonly idempotencyStore: DurableIdempotencyStore<CreateJobResponse>,
    private readonly executorServiceId: string = "mint-burn-worker"
  ) {}

  private withErrorEnvelope<T>(requestId: string, run: () => T): ApiEnvelope<T> {
    try {
      const data = run();
      return createSuccessEnvelope(data, "ISSUANCE_OK", {
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

  private enqueueJob<TPayload extends MintJobPayload | BurnJobPayload>(
    request: IssuanceCreateRequest<TPayload>,
    jobType: "mint" | "burn"
  ): ApiEnvelope<CreateJobResponse> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<CreateJobResponse>(context.request_id, () => {
      requireTenantScope(context, request.body.tenant_id);

      const serviceIdentity = parseServiceIdentity(request.headers);
      requireIssuerAuthorization(serviceIdentity, request.body.tenant_id);

      const idempotencyKey = parseIdempotencyKey(request.headers);
      const identityChain = buildIssuanceIdentityChain(request.headers, this.executorServiceId);

      const idempotencyResult = executeWithDurableIdempotency({
        tenant_id: request.body.tenant_id,
        request_id: context.request_id,
        idempotency_key: idempotencyKey,
        payload: {
          job_type: jobType,
          payload: request.body.payload,
        },
        store: this.idempotencyStore,
        execute: () => {
          const job = this.repository.createJob({
            tenant_id: request.body.tenant_id,
            request_id: context.request_id,
            idempotency_key: idempotencyKey,
            job_type: jobType,
            payload: request.body.payload,
            identity_chain: identityChain,
          });

          return {
            job_id: job.id,
            state: job.state,
            replayed: false,
          };
        },
      });

      return {
        ...idempotencyResult.response,
        replayed: idempotencyResult.replayed,
      };
    });
  }

  createMintJob(request: IssuanceCreateRequest<MintJobPayload>): ApiEnvelope<CreateJobResponse> {
    const envelope = this.enqueueJob(request, "mint");
    return {
      ...envelope,
      code: envelope.success
        ? envelope.data?.replayed
          ? "ISSUANCE_MINT_JOB_REPLAYED"
          : "ISSUANCE_MINT_JOB_QUEUED"
        : envelope.code,
    };
  }

  createBurnJob(request: IssuanceCreateRequest<BurnJobPayload>): ApiEnvelope<CreateJobResponse> {
    const envelope = this.enqueueJob(request, "burn");
    return {
      ...envelope,
      code: envelope.success
        ? envelope.data?.replayed
          ? "ISSUANCE_BURN_JOB_REPLAYED"
          : "ISSUANCE_BURN_JOB_QUEUED"
        : envelope.code,
    };
  }

  getJob(
    request: IssuanceReadRequest,
    params: { tenant_id: string; job_id: string }
  ): ApiEnvelope<IssuanceJobRecord> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<IssuanceJobRecord>(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      return this.repository.getJob(params.tenant_id, params.job_id);
    });
  }

  listJobs(request: IssuanceListRequest): ApiEnvelope<IssuanceJobRecord[]> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope<IssuanceJobRecord[]>(context.request_id, () => {
      requireTenantScope(context, request.query.tenant_id);
      const { tenant_id: tenantId, ...query } = request.query;
      return this.repository.listJobs(tenantId, query);
    });
  }
}

export class IssuanceIdempotencyStore
  implements DurableIdempotencyStore<CreateJobResponse>
{
  private readonly records = new Map<string, DurableIdempotencyRecord<CreateJobResponse>>();

  find(
    tenantId: string,
    idempotencyKey: string
  ): DurableIdempotencyRecord<CreateJobResponse> | null {
    return this.records.get(`${tenantId}:${idempotencyKey}`) ?? null;
  }

  save(record: DurableIdempotencyRecord<CreateJobResponse>): void {
    this.records.set(`${record.tenant_id}:${record.idempotency_key}`, record);
  }
}
