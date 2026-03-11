import { randomUUID } from "node:crypto";

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  type ApiEnvelope,
} from "../../../shared/dist/contracts/envelope";
import {
  parseServiceIdentity,
  requireIssuerAuthorization,
} from "../../../shared/dist/auth/service-auth";
import { StableServiceError, toStableError } from "../../../shared/dist/contracts/errors";
import {
  createRequestContext,
  requireTenantScope,
  type RequestContextHeaders,
} from "../../../shared/dist/middleware/request-context";

import {
  type WebhookSubscriptionRecord,
  type WebhookSubscriptionStatus,
  WebhookRepository,
} from "../store/webhook-repository";

interface SubscriptionCreateRequest {
  headers: RequestContextHeaders;
  body: {
    tenant_id: string;
    endpoint_url: string;
    event_filters: string[];
    status?: WebhookSubscriptionStatus;
    secret?: string;
  };
}

interface SubscriptionUpdateRequest {
  headers: RequestContextHeaders;
  body: {
    tenant_id: string;
    endpoint_url?: string;
    event_filters?: string[];
    status?: WebhookSubscriptionStatus;
  };
}

interface SubscriptionReadRequest {
  headers: RequestContextHeaders;
}

interface SubscriptionListRequest {
  headers: RequestContextHeaders;
  query: {
    tenant_id: string;
    status?: WebhookSubscriptionStatus;
  };
}

interface RotationRequest {
  headers: RequestContextHeaders;
  body: {
    tenant_id: string;
    next_primary_secret: string;
    grace_seconds: number;
  };
}

export interface SubscriptionCreateResponse {
  subscription_id: string;
  status: WebhookSubscriptionStatus;
  secret_preview: string;
}

export interface SubscriptionRotationResponse {
  subscription_id: string;
  secondary_expires_at: string;
}

const secretPreview = (value: string): string => {
  if (value.length <= 6) {
    return "***";
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`;
};

const generateSecret = (): string => {
  return randomUUID().split("-").join("");
};

const toReadModel = (
  record: WebhookSubscriptionRecord
): Omit<WebhookSubscriptionRecord, "primary_secret" | "secondary_secret"> => {
  const safe = { ...record };
  delete (safe as Partial<WebhookSubscriptionRecord>).primary_secret;
  delete (safe as Partial<WebhookSubscriptionRecord>).secondary_secret;
  return safe;
};

export class SubscriptionRouteHandlers {
  constructor(private readonly repository: WebhookRepository) {}

  private withErrorEnvelope<T>(requestId: string, run: () => T): ApiEnvelope<T> {
    try {
      return createSuccessEnvelope(run(), "WEBHOOK_SUBSCRIPTION_OK", {
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

  create(request: SubscriptionCreateRequest): ApiEnvelope<SubscriptionCreateResponse> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, request.body.tenant_id);
      const identity = parseServiceIdentity(request.headers);
      requireIssuerAuthorization(identity, request.body.tenant_id);

      const secret = request.body.secret ?? generateSecret();
      const created = this.repository.createSubscription({
        tenant_id: request.body.tenant_id,
        endpoint_url: request.body.endpoint_url,
        event_filters: request.body.event_filters,
        status: request.body.status,
        primary_secret: secret,
      });

      return {
        subscription_id: created.id,
        status: created.status,
        secret_preview: secretPreview(secret),
      };
    });
  }

  get(
    request: SubscriptionReadRequest,
    params: { tenant_id: string; subscription_id: string }
  ): ApiEnvelope<Omit<WebhookSubscriptionRecord, "primary_secret" | "secondary_secret">> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      return toReadModel(this.repository.getSubscription(params.tenant_id, params.subscription_id));
    });
  }

  list(
    request: SubscriptionListRequest
  ): ApiEnvelope<Array<Omit<WebhookSubscriptionRecord, "primary_secret" | "secondary_secret">>> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, request.query.tenant_id);
      const identity = parseServiceIdentity(request.headers);
      requireIssuerAuthorization(identity, request.query.tenant_id);

      return this.repository
        .listSubscriptions(request.query.tenant_id, request.query.status)
        .map((record) => toReadModel(record));
    });
  }

  update(
    request: SubscriptionUpdateRequest,
    params: { tenant_id: string; subscription_id: string }
  ): ApiEnvelope<Omit<WebhookSubscriptionRecord, "primary_secret" | "secondary_secret">> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, request.body.tenant_id);
      if (request.body.tenant_id !== params.tenant_id) {
        throw new StableServiceError("FORBIDDEN", "Tenant scope mismatch", {
          expected_tenant_id: params.tenant_id,
          actual_tenant_id: request.body.tenant_id,
        });
      }

      const identity = parseServiceIdentity(request.headers);
      requireIssuerAuthorization(identity, request.body.tenant_id);

      const updated = this.repository.updateSubscription(request.body.tenant_id, params.subscription_id, {
        endpoint_url: request.body.endpoint_url,
        event_filters: request.body.event_filters,
        status: request.body.status,
      });

      return toReadModel(updated);
    });
  }

  rotateSecret(
    request: RotationRequest,
    params: { tenant_id: string; subscription_id: string }
  ): ApiEnvelope<SubscriptionRotationResponse> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, request.body.tenant_id);
      if (request.body.tenant_id !== params.tenant_id) {
        throw new StableServiceError("FORBIDDEN", "Tenant scope mismatch", {
          expected_tenant_id: params.tenant_id,
          actual_tenant_id: request.body.tenant_id,
        });
      }

      const identity = parseServiceIdentity(request.headers);
      requireIssuerAuthorization(identity, request.body.tenant_id);

      const rotated = this.repository.rotateSubscriptionSecret(request.body.tenant_id, params.subscription_id, {
        next_primary_secret: request.body.next_primary_secret,
        grace_seconds: request.body.grace_seconds,
      });

      return {
        subscription_id: rotated.id,
        secondary_expires_at: rotated.secondary_expires_at as string,
      };
    });
  }
}
