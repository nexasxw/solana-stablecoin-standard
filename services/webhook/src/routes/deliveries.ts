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
  type DeadLetterListQuery,
  type DeliveryListQuery,
  type WebhookDeadLetterRecord,
  type WebhookDeliveryAttemptRecord,
  type WebhookDeliveryRecord,
  WebhookRepository,
} from "../store/webhook-repository";

interface DeliveryListRequest {
  headers: RequestContextHeaders;
  query: DeliveryListQuery & {
    tenant_id: string;
  };
}

interface DeadLetterListRequest {
  headers: RequestContextHeaders;
  query: DeadLetterListQuery & {
    tenant_id: string;
  };
}

interface DeliveryReadRequest {
  headers: RequestContextHeaders;
}

export interface DeliveryInspectionResponse {
  delivery: WebhookDeliveryRecord;
  attempts: WebhookDeliveryAttemptRecord[];
  dead_letter: WebhookDeadLetterRecord | null;
}

const firstDeadLetterForDelivery = (
  deadLetters: WebhookDeadLetterRecord[],
  deliveryId: string
): WebhookDeadLetterRecord | null => {
  return deadLetters.find((deadLetter) => deadLetter.delivery_id === deliveryId) ?? null;
};

export class DeliveryRouteHandlers {
  constructor(private readonly repository: WebhookRepository) {}

  private withErrorEnvelope<T>(requestId: string, run: () => T): ApiEnvelope<T> {
    try {
      return createSuccessEnvelope(run(), "WEBHOOK_DELIVERY_OK", {
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

  private authorize(headers: RequestContextHeaders, tenantId: string): void {
    const identity = parseServiceIdentity(headers);
    requireIssuerAuthorization(identity, tenantId);
  }

  listDeliveries(request: DeliveryListRequest): ApiEnvelope<WebhookDeliveryRecord[]> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, request.query.tenant_id);
      this.authorize(request.headers, request.query.tenant_id);

      const { tenant_id: tenantId, ...query } = request.query;
      return this.repository.listDeliveries(tenantId, query);
    });
  }

  getDelivery(
    request: DeliveryReadRequest,
    params: { tenant_id: string; delivery_id: string }
  ): ApiEnvelope<DeliveryInspectionResponse> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      this.authorize(request.headers, params.tenant_id);

      const delivery = this.repository.getDelivery(params.tenant_id, params.delivery_id);
      const attempts = this.repository.listDeliveryAttempts(params.tenant_id, params.delivery_id);
      const deadLetters = this.repository.listDeadLetters(params.tenant_id, {
        subscription_id: delivery.subscription_id,
        limit: 10_000,
      });

      return {
        delivery,
        attempts,
        dead_letter: firstDeadLetterForDelivery(deadLetters, delivery.id),
      };
    });
  }

  listAttempts(
    request: DeliveryReadRequest,
    params: { tenant_id: string; delivery_id: string }
  ): ApiEnvelope<WebhookDeliveryAttemptRecord[]> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      this.authorize(request.headers, params.tenant_id);

      return this.repository.listDeliveryAttempts(params.tenant_id, params.delivery_id);
    });
  }

  listDeadLetters(request: DeadLetterListRequest): ApiEnvelope<WebhookDeadLetterRecord[]> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, request.query.tenant_id);
      this.authorize(request.headers, request.query.tenant_id);

      const { tenant_id: tenantId, ...query } = request.query;
      return this.repository.listDeadLetters(tenantId, query);
    });
  }

  triggerRetentionPurge(
    request: DeliveryReadRequest,
    params: { tenant_id: string }
  ): ApiEnvelope<{ purged_deliveries: number; purged_dead_letters: number }> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, params.tenant_id);
      this.authorize(request.headers, params.tenant_id);

      return this.repository.purgeExpiredRecords();
    });
  }

  enqueueForTestOnly(
    request: DeliveryReadRequest,
    body: {
      tenant_id: string;
      subscription_id: string;
      event_id: string;
      event_type: string;
      event_version: string;
      request_id: string;
      entity_key: string;
      payload: Record<string, unknown>;
      max_attempts?: number;
    }
  ): ApiEnvelope<WebhookDeliveryRecord> {
    const context = createRequestContext(request.headers);

    return this.withErrorEnvelope(context.request_id, () => {
      requireTenantScope(context, body.tenant_id);
      this.authorize(request.headers, body.tenant_id);

      if (!body.entity_key.trim()) {
        throw new StableServiceError("INVALID_ARGUMENT", "entity_key is required", {
          entity_key: body.entity_key,
        });
      }

      return this.repository.enqueueDelivery(body);
    });
  }
}
