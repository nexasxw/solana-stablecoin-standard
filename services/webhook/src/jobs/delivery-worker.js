"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookDeliveryWorker = void 0;
const errors_1 = require("../../../shared/dist/contracts/errors");
const signature_1 = require("../security/signature");
class WebhookDeliveryWorker {
    constructor(repository, sender, clock = () => new Date()) {
        this.repository = repository;
        this.sender = sender;
        this.clock = clock;
    }
    async runNext(tenantId) {
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
        const signatureHeaders = (0, signature_1.signWebhookPayload)(payload, {
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
                throw new errors_1.StableServiceError("DEPENDENCY_FAILURE", "Webhook endpoint returned non-2xx", {
                    status: response.status,
                });
            }
            const succeeded = this.repository.markDeliverySucceeded(tenantId, selected.delivery.id, response.status, this.clock);
            return {
                processed: true,
                delivery: succeeded,
            };
        }
        catch (error) {
            const stableError = (0, errors_1.toStableError)(error);
            const failed = this.repository.markDeliveryFailed(tenantId, selected.delivery.id, {
                response_status: stableError.details && typeof stableError.details.status === "number"
                    ? stableError.details.status
                    : null,
                error_code: stableError.code,
                error_message: stableError.message,
            }, this.clock);
            return {
                processed: true,
                delivery: failed,
            };
        }
    }
}
exports.WebhookDeliveryWorker = WebhookDeliveryWorker;
