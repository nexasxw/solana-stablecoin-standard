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

const defaultSender: WebhookSender = {
  send: async () => {
    throw new Error("Webhook sender is not configured");
  },
};

export const createWebhookRuntime = (
  options: CreateWebhookRuntimeOptions = {}
): WebhookRuntime => {
  const repository = options.repository ?? new WebhookRepository();
  const sender = options.sender ?? defaultSender;

  return {
    repository,
    subscriptionHandlers: new SubscriptionRouteHandlers(repository),
    deliveryHandlers: new DeliveryRouteHandlers(repository),
    worker: new WebhookDeliveryWorker(repository, sender, options.clock),
  };
};
