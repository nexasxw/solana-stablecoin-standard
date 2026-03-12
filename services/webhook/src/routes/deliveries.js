"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryRouteHandlers = void 0;
const envelope_1 = require("../../../shared/dist/contracts/envelope");
const service_auth_1 = require("../../../shared/dist/auth/service-auth");
const errors_1 = require("../../../shared/dist/contracts/errors");
const request_context_1 = require("../../../shared/dist/middleware/request-context");
const firstDeadLetterForDelivery = (deadLetters, deliveryId) => {
    return deadLetters.find((deadLetter) => deadLetter.delivery_id === deliveryId) ?? null;
};
class DeliveryRouteHandlers {
    constructor(repository) {
        this.repository = repository;
    }
    withErrorEnvelope(requestId, run) {
        try {
            return (0, envelope_1.createSuccessEnvelope)(run(), "WEBHOOK_DELIVERY_OK", {
                requestId,
            });
        }
        catch (error) {
            const stableError = (0, errors_1.toStableError)(error);
            return (0, envelope_1.createErrorEnvelope)({
                message: stableError.message,
                details: {
                    ...stableError.details,
                    stable_code: stableError.code,
                },
            }, stableError.code, { requestId });
        }
    }
    authorize(headers, tenantId) {
        const identity = (0, service_auth_1.parseServiceIdentity)(headers);
        (0, service_auth_1.requireIssuerAuthorization)(identity, tenantId);
    }
    listDeliveries(request) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, request.query.tenant_id);
            this.authorize(request.headers, request.query.tenant_id);
            const { tenant_id: tenantId, ...query } = request.query;
            return this.repository.listDeliveries(tenantId, query);
        });
    }
    getDelivery(request, params) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, params.tenant_id);
            this.authorize(request.headers, params.tenant_id);
            const delivery = this.repository.getDelivery(params.tenant_id, params.delivery_id);
            const attempts = this.repository.listDeliveryAttempts(params.tenant_id, params.delivery_id);
            const deadLetters = this.repository.listDeadLetters(params.tenant_id, {
                subscription_id: delivery.subscription_id,
                limit: 10000,
            });
            return {
                delivery,
                attempts,
                dead_letter: firstDeadLetterForDelivery(deadLetters, delivery.id),
            };
        });
    }
    listAttempts(request, params) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, params.tenant_id);
            this.authorize(request.headers, params.tenant_id);
            return this.repository.listDeliveryAttempts(params.tenant_id, params.delivery_id);
        });
    }
    listDeadLetters(request) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, request.query.tenant_id);
            this.authorize(request.headers, request.query.tenant_id);
            const { tenant_id: tenantId, ...query } = request.query;
            return this.repository.listDeadLetters(tenantId, query);
        });
    }
    triggerRetentionPurge(request, params) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, params.tenant_id);
            this.authorize(request.headers, params.tenant_id);
            return this.repository.purgeExpiredRecords();
        });
    }
    enqueueForTestOnly(request, body) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, body.tenant_id);
            this.authorize(request.headers, body.tenant_id);
            if (!body.entity_key.trim()) {
                throw new errors_1.StableServiceError("INVALID_ARGUMENT", "entity_key is required", {
                    entity_key: body.entity_key,
                });
            }
            return this.repository.enqueueDelivery(body);
        });
    }
}
exports.DeliveryRouteHandlers = DeliveryRouteHandlers;
