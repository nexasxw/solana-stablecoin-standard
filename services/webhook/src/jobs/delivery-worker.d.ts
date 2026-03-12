import { type WebhookDeliveryRecord, WebhookRepository } from "../store/webhook-repository";
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
export declare class WebhookDeliveryWorker {
    private readonly repository;
    private readonly sender;
    private readonly clock;
    constructor(repository: WebhookRepository, sender: WebhookSender, clock?: () => Date);
    runNext(tenantId: string): Promise<DeliveryWorkerRunResult>;
}
//# sourceMappingURL=delivery-worker.d.ts.map