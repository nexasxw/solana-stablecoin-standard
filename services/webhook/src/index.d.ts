import { WebhookDeliveryWorker, type WebhookSender } from "./jobs/delivery-worker";
import { DeliveryRouteHandlers } from "./routes/deliveries";
import { SubscriptionRouteHandlers } from "./routes/subscriptions";
import { WebhookRepository } from "./store/webhook-repository";
export interface WebhookRuntime {
    repository: WebhookRepository;
    subscriptionHandlers: SubscriptionRouteHandlers;
    deliveryHandlers: DeliveryRouteHandlers;
    worker: WebhookDeliveryWorker;
}
export interface CreateWebhookRuntimeOptions {
    repository?: WebhookRepository;
    sender?: WebhookSender;
    clock?: () => Date;
}
export declare const createWebhookRuntime: (options?: CreateWebhookRuntimeOptions) => WebhookRuntime;
//# sourceMappingURL=index.d.ts.map