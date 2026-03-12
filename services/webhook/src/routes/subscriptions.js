"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRouteHandlers = void 0;
const node_crypto_1 = require("node:crypto");
const envelope_1 = require("../../../shared/dist/contracts/envelope");
const service_auth_1 = require("../../../shared/dist/auth/service-auth");
const errors_1 = require("../../../shared/dist/contracts/errors");
const request_context_1 = require("../../../shared/dist/middleware/request-context");
const secretPreview = (value) => {
    if (value.length <= 6) {
        return "***";
    }
    return `${value.slice(0, 3)}***${value.slice(-3)}`;
};
const generateSecret = () => {
    return (0, node_crypto_1.randomUUID)().split("-").join("");
};
const toReadModel = (record) => {
    const safe = { ...record };
    delete safe.primary_secret;
    delete safe.secondary_secret;
    return safe;
};
class SubscriptionRouteHandlers {
    constructor(repository) {
        this.repository = repository;
    }
    withErrorEnvelope(requestId, run) {
        try {
            return (0, envelope_1.createSuccessEnvelope)(run(), "WEBHOOK_SUBSCRIPTION_OK", {
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
    create(request) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, request.body.tenant_id);
            const identity = (0, service_auth_1.parseServiceIdentity)(request.headers);
            (0, service_auth_1.requireIssuerAuthorization)(identity, request.body.tenant_id);
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
    get(request, params) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, params.tenant_id);
            return toReadModel(this.repository.getSubscription(params.tenant_id, params.subscription_id));
        });
    }
    list(request) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, request.query.tenant_id);
            const identity = (0, service_auth_1.parseServiceIdentity)(request.headers);
            (0, service_auth_1.requireIssuerAuthorization)(identity, request.query.tenant_id);
            return this.repository
                .listSubscriptions(request.query.tenant_id, request.query.status)
                .map((record) => toReadModel(record));
        });
    }
    update(request, params) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, request.body.tenant_id);
            if (request.body.tenant_id !== params.tenant_id) {
                throw new errors_1.StableServiceError("FORBIDDEN", "Tenant scope mismatch", {
                    expected_tenant_id: params.tenant_id,
                    actual_tenant_id: request.body.tenant_id,
                });
            }
            const identity = (0, service_auth_1.parseServiceIdentity)(request.headers);
            (0, service_auth_1.requireIssuerAuthorization)(identity, request.body.tenant_id);
            const updated = this.repository.updateSubscription(request.body.tenant_id, params.subscription_id, {
                endpoint_url: request.body.endpoint_url,
                event_filters: request.body.event_filters,
                status: request.body.status,
            });
            return toReadModel(updated);
        });
    }
    rotateSecret(request, params) {
        const context = (0, request_context_1.createRequestContext)(request.headers);
        return this.withErrorEnvelope(context.request_id, () => {
            (0, request_context_1.requireTenantScope)(context, request.body.tenant_id);
            if (request.body.tenant_id !== params.tenant_id) {
                throw new errors_1.StableServiceError("FORBIDDEN", "Tenant scope mismatch", {
                    expected_tenant_id: params.tenant_id,
                    actual_tenant_id: request.body.tenant_id,
                });
            }
            const identity = (0, service_auth_1.parseServiceIdentity)(request.headers);
            (0, service_auth_1.requireIssuerAuthorization)(identity, request.body.tenant_id);
            const rotated = this.repository.rotateSubscriptionSecret(request.body.tenant_id, params.subscription_id, {
                next_primary_secret: request.body.next_primary_secret,
                grace_seconds: request.body.grace_seconds,
            });
            return {
                subscription_id: rotated.id,
                secondary_expires_at: rotated.secondary_expires_at,
            };
        });
    }
}
exports.SubscriptionRouteHandlers = SubscriptionRouteHandlers;
