"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookRepository = exports.DEAD_LETTER_RETENTION_DAYS = exports.DELIVERY_RETENTION_DAYS = void 0;
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../../shared/dist/contracts/errors");
const MAX_ATTEMPTS_DEFAULT = 5;
const MAX_ATTEMPTS_UPPER_BOUND = 10;
const RETRY_BASE_DELAY_SECONDS = 5;
const RETRY_MAX_DELAY_SECONDS = 300;
exports.DELIVERY_RETENTION_DAYS = 90;
exports.DEAD_LETTER_RETENTION_DAYS = 180;
const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const clone = (value) => JSON.parse(JSON.stringify(value));
const ensurePositiveInt = (value, field) => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new errors_1.StableServiceError("INVALID_ARGUMENT", `Invalid ${field}`, { field, value });
    }
    return value;
};
const calculateRetryDelaySeconds = (attemptNumber) => {
    const delay = RETRY_BASE_DELAY_SECONDS * 2 ** Math.max(0, attemptNumber - 1);
    return Math.min(delay, RETRY_MAX_DELAY_SECONDS);
};
const addSeconds = (isoTimestamp, seconds) => {
    return new Date(Date.parse(isoTimestamp) + seconds * MS_PER_SECOND).toISOString();
};
const addDays = (isoTimestamp, days) => {
    return new Date(Date.parse(isoTimestamp) + days * MS_PER_DAY).toISOString();
};
const assertUrl = (value) => {
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            throw new Error("unsupported protocol");
        }
        return parsed.toString();
    }
    catch {
        throw new errors_1.StableServiceError("INVALID_ARGUMENT", "Invalid webhook endpoint URL", {
            endpoint_url: value,
        });
    }
};
const assertStateTransition = (from, to) => {
    const allowed = {
        queued: ["delivering"],
        delivering: ["succeeded", "retry_scheduled", "dead_lettered"],
        retry_scheduled: ["delivering"],
        succeeded: [],
        dead_lettered: [],
    };
    if (!allowed[from].includes(to)) {
        throw new errors_1.StableServiceError("INVALID_STATE", "Invalid webhook delivery state transition", {
            from,
            to,
        });
    }
};
class WebhookRepository {
    constructor() {
        this.subscriptions = new Map();
        this.tenantSubscriptions = new Map();
        this.deliveries = new Map();
        this.tenantDeliveries = new Map();
        this.deliveryAttempts = new Map();
        this.deadLetters = new Map();
        this.tenantDeadLetters = new Map();
        this.deliveryOrder = new Map();
        this.nextDeliveryOrder = 0;
    }
    compareDeliveryOrder(left, right) {
        const timeDelta = Date.parse(left.created_at) - Date.parse(right.created_at);
        if (timeDelta !== 0) {
            return timeDelta;
        }
        const leftOrder = this.deliveryOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = this.deliveryOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
    }
    createSubscription(input, now = () => new Date()) {
        const timestamp = now().toISOString();
        const record = {
            id: (0, node_crypto_1.randomUUID)(),
            tenant_id: input.tenant_id,
            endpoint_url: assertUrl(input.endpoint_url),
            event_filters: [...input.event_filters],
            status: input.status ?? "active",
            primary_secret: input.primary_secret,
            secondary_secret: null,
            secondary_expires_at: null,
            created_at: timestamp,
            updated_at: timestamp,
        };
        this.subscriptions.set(record.id, record);
        const tenantIndex = this.tenantSubscriptions.get(record.tenant_id) ?? [];
        tenantIndex.unshift(record.id);
        this.tenantSubscriptions.set(record.tenant_id, tenantIndex);
        return clone(record);
    }
    listSubscriptions(tenantId, status) {
        const ids = this.tenantSubscriptions.get(tenantId) ?? [];
        return ids
            .map((id) => this.subscriptions.get(id))
            .filter((entry) => Boolean(entry))
            .filter((entry) => (status ? entry.status === status : true))
            .map((entry) => clone(entry));
    }
    getSubscription(tenantId, subscriptionId) {
        const found = this.subscriptions.get(subscriptionId);
        if (!found || found.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook subscription not found", {
                tenant_id: tenantId,
                subscription_id: subscriptionId,
            });
        }
        return clone(found);
    }
    updateSubscription(tenantId, subscriptionId, update, now = () => new Date()) {
        const live = this.subscriptions.get(subscriptionId);
        if (!live || live.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook subscription not found", {
                tenant_id: tenantId,
                subscription_id: subscriptionId,
            });
        }
        if (update.endpoint_url !== undefined) {
            live.endpoint_url = assertUrl(update.endpoint_url);
        }
        if (update.event_filters !== undefined) {
            live.event_filters = [...update.event_filters];
        }
        if (update.status !== undefined) {
            live.status = update.status;
        }
        live.updated_at = now().toISOString();
        return clone(live);
    }
    rotateSubscriptionSecret(tenantId, subscriptionId, input, now = () => new Date()) {
        ensurePositiveInt(input.grace_seconds, "grace_seconds");
        const live = this.subscriptions.get(subscriptionId);
        if (!live || live.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook subscription not found", {
                tenant_id: tenantId,
                subscription_id: subscriptionId,
            });
        }
        const rotatedAt = now().toISOString();
        live.secondary_secret = live.primary_secret;
        live.secondary_expires_at = addSeconds(rotatedAt, input.grace_seconds);
        live.primary_secret = input.next_primary_secret;
        live.updated_at = rotatedAt;
        return clone(live);
    }
    enqueueDelivery(input, now = () => new Date()) {
        this.getSubscription(input.tenant_id, input.subscription_id);
        const attempts = input.max_attempts ?? MAX_ATTEMPTS_DEFAULT;
        if (!Number.isInteger(attempts) || attempts < 1 || attempts > MAX_ATTEMPTS_UPPER_BOUND) {
            throw new errors_1.StableServiceError("INVALID_ARGUMENT", "Invalid max_attempts", {
                max_attempts: input.max_attempts,
            });
        }
        const timestamp = now().toISOString();
        const record = {
            id: (0, node_crypto_1.randomUUID)(),
            tenant_id: input.tenant_id,
            subscription_id: input.subscription_id,
            event_id: input.event_id,
            event_type: input.event_type,
            event_version: input.event_version,
            request_id: input.request_id,
            entity_key: input.entity_key,
            payload: clone(input.payload),
            state: "queued",
            attempt_count: 0,
            max_attempts: attempts,
            next_attempt_at: timestamp,
            last_attempt_at: null,
            last_response_status: null,
            last_error_code: null,
            last_error_message: null,
            last_signature_kid: null,
            created_at: timestamp,
            updated_at: timestamp,
            completed_at: null,
        };
        this.deliveries.set(record.id, record);
        this.deliveryOrder.set(record.id, this.nextDeliveryOrder);
        this.nextDeliveryOrder += 1;
        const tenantIndex = this.tenantDeliveries.get(record.tenant_id) ?? [];
        tenantIndex.push(record.id);
        this.tenantDeliveries.set(record.tenant_id, tenantIndex);
        return clone(record);
    }
    getDelivery(tenantId, deliveryId) {
        const found = this.deliveries.get(deliveryId);
        if (!found || found.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook delivery not found", {
                tenant_id: tenantId,
                delivery_id: deliveryId,
            });
        }
        return clone(found);
    }
    listDeliveries(tenantId, query = {}) {
        const ids = this.tenantDeliveries.get(tenantId) ?? [];
        const limit = query.limit ?? 50;
        const rows = ids
            .map((id) => this.deliveries.get(id))
            .filter((entry) => Boolean(entry))
            .filter((entry) => (query.subscription_id ? entry.subscription_id === query.subscription_id : true))
            .filter((entry) => (query.state ? entry.state === query.state : true))
            .filter((entry) => (query.entity_key ? entry.entity_key === query.entity_key : true));
        return [...rows]
            .sort((left, right) => this.compareDeliveryOrder(left, right))
            .slice(0, limit)
            .map((row) => clone(row));
    }
    listDeliveryAttempts(tenantId, deliveryId) {
        this.getDelivery(tenantId, deliveryId);
        return (this.deliveryAttempts.get(deliveryId) ?? []).map((attempt) => clone(attempt));
    }
    listDeadLetters(tenantId, query = {}) {
        const ids = this.tenantDeadLetters.get(tenantId) ?? [];
        const limit = query.limit ?? 50;
        const rows = ids
            .map((id) => this.deadLetters.get(id))
            .filter((entry) => Boolean(entry))
            .filter((entry) => (query.subscription_id ? entry.subscription_id === query.subscription_id : true));
        return [...rows]
            .sort((left, right) => Date.parse(left.failed_at) - Date.parse(right.failed_at))
            .slice(0, limit)
            .map((entry) => clone(entry));
    }
    takeNextDelivery(tenantId, now = () => new Date()) {
        const dueAt = now().toISOString();
        const candidateRows = this.listDeliveries(tenantId, { limit: 10000 })
            .filter((delivery) => delivery.state === "queued" || delivery.state === "retry_scheduled")
            .filter((delivery) => delivery.next_attempt_at <= dueAt);
        for (const candidate of candidateRows) {
            const subscription = this.getSubscription(tenantId, candidate.subscription_id);
            if (subscription.status !== "active") {
                continue;
            }
            const blocking = this.listDeliveries(tenantId, {
                entity_key: candidate.entity_key,
                limit: 10000,
            }).find((delivery) => {
                if (delivery.id === candidate.id) {
                    return false;
                }
                const isEarlier = this.compareDeliveryOrder(delivery, candidate) < 0;
                const inFlight = delivery.state === "queued" ||
                    delivery.state === "delivering" ||
                    delivery.state === "retry_scheduled";
                return isEarlier && inFlight;
            });
            if (blocking) {
                continue;
            }
            return {
                subscription,
                delivery: candidate,
            };
        }
        return null;
    }
    markDeliveryRunning(tenantId, deliveryId, signatureKid, now = () => new Date()) {
        const live = this.deliveries.get(deliveryId);
        if (!live || live.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook delivery not found", {
                tenant_id: tenantId,
                delivery_id: deliveryId,
            });
        }
        assertStateTransition(live.state, "delivering");
        const timestamp = now().toISOString();
        live.state = "delivering";
        live.attempt_count += 1;
        live.last_attempt_at = timestamp;
        live.last_signature_kid = signatureKid;
        live.updated_at = timestamp;
        return clone(live);
    }
    markDeliverySucceeded(tenantId, deliveryId, responseStatus, now = () => new Date()) {
        const live = this.deliveries.get(deliveryId);
        if (!live || live.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook delivery not found", {
                tenant_id: tenantId,
                delivery_id: deliveryId,
            });
        }
        assertStateTransition(live.state, "succeeded");
        const timestamp = now().toISOString();
        live.state = "succeeded";
        live.last_response_status = responseStatus;
        live.last_error_code = null;
        live.last_error_message = null;
        live.updated_at = timestamp;
        live.completed_at = timestamp;
        this.appendAttempt(tenantId, {
            delivery_id: deliveryId,
            attempt_number: live.attempt_count,
            status: "succeeded",
            response_status: responseStatus,
            error_code: null,
            error_message: null,
            signature_kid: live.last_signature_kid ?? "primary",
            occurred_at: timestamp,
        });
        return clone(live);
    }
    markDeliveryFailed(tenantId, deliveryId, failure, now = () => new Date()) {
        const live = this.deliveries.get(deliveryId);
        if (!live || live.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook delivery not found", {
                tenant_id: tenantId,
                delivery_id: deliveryId,
            });
        }
        if (live.state !== "delivering") {
            throw new errors_1.StableServiceError("INVALID_STATE", "Delivery must be delivering before failure handling", {
                state: live.state,
                delivery_id: live.id,
            });
        }
        const timestamp = now().toISOString();
        this.appendAttempt(tenantId, {
            delivery_id: deliveryId,
            attempt_number: live.attempt_count,
            status: "failed",
            response_status: failure.response_status,
            error_code: failure.error_code,
            error_message: failure.error_message,
            signature_kid: live.last_signature_kid ?? "primary",
            occurred_at: timestamp,
        });
        live.last_response_status = failure.response_status;
        live.last_error_code = failure.error_code;
        live.last_error_message = failure.error_message;
        live.updated_at = timestamp;
        if (live.attempt_count >= live.max_attempts) {
            assertStateTransition(live.state, "dead_lettered");
            live.state = "dead_lettered";
            live.completed_at = timestamp;
            const deadLetter = {
                id: (0, node_crypto_1.randomUUID)(),
                tenant_id: live.tenant_id,
                delivery_id: live.id,
                subscription_id: live.subscription_id,
                event_id: live.event_id,
                event_type: live.event_type,
                entity_key: live.entity_key,
                request_id: live.request_id,
                payload: clone(live.payload),
                final_error_code: failure.error_code,
                final_error_message: failure.error_message,
                failed_at: timestamp,
                expires_at: addDays(timestamp, exports.DEAD_LETTER_RETENTION_DAYS),
            };
            this.deadLetters.set(deadLetter.id, deadLetter);
            const tenantDeadLetterIds = this.tenantDeadLetters.get(live.tenant_id) ?? [];
            tenantDeadLetterIds.push(deadLetter.id);
            this.tenantDeadLetters.set(live.tenant_id, tenantDeadLetterIds);
            return clone(live);
        }
        assertStateTransition(live.state, "retry_scheduled");
        const retryDelay = calculateRetryDelaySeconds(live.attempt_count);
        live.state = "retry_scheduled";
        live.next_attempt_at = addSeconds(timestamp, retryDelay);
        return clone(live);
    }
    purgeExpiredRecords(now = () => new Date()) {
        const nowEpoch = now().getTime();
        const deliveryCutoffEpoch = nowEpoch - exports.DELIVERY_RETENTION_DAYS * MS_PER_DAY;
        const deadLetterCutoffEpoch = nowEpoch - exports.DEAD_LETTER_RETENTION_DAYS * MS_PER_DAY;
        let purgedDeliveries = 0;
        for (const [deliveryId, delivery] of this.deliveries.entries()) {
            const terminal = delivery.state === "succeeded" || delivery.state === "dead_lettered";
            if (!terminal || !delivery.completed_at) {
                continue;
            }
            if (Date.parse(delivery.completed_at) >= deliveryCutoffEpoch) {
                continue;
            }
            this.deliveries.delete(deliveryId);
            this.deliveryAttempts.delete(deliveryId);
            this.deliveryOrder.delete(deliveryId);
            const tenantIndex = this.tenantDeliveries.get(delivery.tenant_id) ?? [];
            this.tenantDeliveries.set(delivery.tenant_id, tenantIndex.filter((id) => id !== deliveryId));
            purgedDeliveries += 1;
        }
        let purgedDeadLetters = 0;
        for (const [deadLetterId, deadLetter] of this.deadLetters.entries()) {
            if (Date.parse(deadLetter.failed_at) >= deadLetterCutoffEpoch) {
                continue;
            }
            this.deadLetters.delete(deadLetterId);
            const tenantIndex = this.tenantDeadLetters.get(deadLetter.tenant_id) ?? [];
            this.tenantDeadLetters.set(deadLetter.tenant_id, tenantIndex.filter((id) => id !== deadLetterId));
            purgedDeadLetters += 1;
        }
        return {
            purged_deliveries: purgedDeliveries,
            purged_dead_letters: purgedDeadLetters,
        };
    }
    appendAttempt(tenantId, input) {
        const delivery = this.deliveries.get(input.delivery_id);
        if (!delivery || delivery.tenant_id !== tenantId) {
            throw new errors_1.StableServiceError("NOT_FOUND", "Webhook delivery not found for attempt", {
                tenant_id: tenantId,
                delivery_id: input.delivery_id,
            });
        }
        const attempt = {
            id: (0, node_crypto_1.randomUUID)(),
            tenant_id: tenantId,
            ...input,
        };
        const attempts = this.deliveryAttempts.get(input.delivery_id) ?? [];
        attempts.push(attempt);
        this.deliveryAttempts.set(input.delivery_id, attempts);
        return clone(attempt);
    }
}
exports.WebhookRepository = WebhookRepository;
