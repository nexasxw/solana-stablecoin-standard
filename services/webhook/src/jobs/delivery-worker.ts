import { StableServiceError, toStableError } from "../../../shared/dist/contracts/errors";

import { signWebhookPayload } from "../security/signature";
import {
  type WebhookDeliveryRecord,
  WebhookRepository,
} from "../store/webhook-repository";

export interface WebhookSenderRequest {
  url: string;
  body: string;
  headers: Record<string, string>;
}

export interface WebhookSenderResponse {
  status: number;
  body?: string;
}

export interface WebhookSender {
  send(request: WebhookSenderRequest): Promise<WebhookSenderResponse>;
}

export interface DeliveryWorkerRunResult {
  processed: boolean;
  delivery: WebhookDeliveryRecord | null;
}

export class WebhookDeliveryWorker {
  constructor(
    private readonly repository: WebhookRepository,
    private readonly sender: WebhookSender,
    private readonly clock: () => Date = () => new Date()
  ) {}

  async runNext(tenantId: string): Promise<DeliveryWorkerRunResult> {
    const selected = this.repository.takeNextDelivery(tenantId, this.clock);
    if (!selected) {
      return {
        processed: false,
        delivery: null,
      };
    }

    const payload = JSON.stringify({
      event_id: selected.delivery.event_id,
      event_type: selected.delivery.event_type,
      event_version: selected.delivery.event_version,
      request_id: selected.delivery.request_id,
      entity_key: selected.delivery.entity_key,
      body: selected.delivery.payload,
    });

    const signatureHeaders = signWebhookPayload(payload, {
      secret: selected.subscription.primary_secret,
      key_id: "primary",
    }, Math.floor(this.clock().getTime() / 1000));

    this.repository.markDeliveryRunning(tenantId, selected.delivery.id, signatureHeaders["x-webhook-signature-kid"], this.clock);

    try {
      const response = await this.sender.send({
        url: selected.subscription.endpoint_url,
        body: payload,
        headers: {
          "content-type": "application/json",
          "x-event-id": selected.delivery.event_id,
          "x-event-type": selected.delivery.event_type,
          "x-event-version": selected.delivery.event_version,
          "x-request-id": selected.delivery.request_id,
          "x-entity-key": selected.delivery.entity_key,
          ...signatureHeaders,
        },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new StableServiceError("DEPENDENCY_FAILURE", "Webhook endpoint returned non-2xx", {
          status: response.status,
        });
      }

      const succeeded = this.repository.markDeliverySucceeded(
        tenantId,
        selected.delivery.id,
        response.status,
        this.clock
      );

      return {
        processed: true,
        delivery: succeeded,
      };
    } catch (error) {
      const stableError = toStableError(error);
      const failed = this.repository.markDeliveryFailed(
        tenantId,
        selected.delivery.id,
        {
          response_status:
            stableError.details && typeof stableError.details.status === "number"
              ? stableError.details.status
              : null,
          error_code: stableError.code,
          error_message: stableError.message,
        },
        this.clock
      );

      return {
        processed: true,
        delivery: failed,
      };
    }
  }
}
