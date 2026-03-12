"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookRuntime = void 0;
const delivery_worker_1 = require("./jobs/delivery-worker");
const deliveries_1 = require("./routes/deliveries");
const subscriptions_1 = require("./routes/subscriptions");
const webhook_repository_1 = require("./store/webhook-repository");
const defaultSender = {
    send: async () => {
        throw new Error("Webhook sender is not configured");
    },
};
const createWebhookRuntime = (options = {}) => {
    const repository = options.repository ?? new webhook_repository_1.WebhookRepository();
    const sender = options.sender ?? defaultSender;
    return {
        repository,
        subscriptionHandlers: new subscriptions_1.SubscriptionRouteHandlers(repository),
        deliveryHandlers: new deliveries_1.DeliveryRouteHandlers(repository),
        worker: new delivery_worker_1.WebhookDeliveryWorker(repository, sender, options.clock),
    };
};
exports.createWebhookRuntime = createWebhookRuntime;
