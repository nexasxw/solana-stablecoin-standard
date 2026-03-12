import { type ApiEnvelope } from "../../../shared/dist/contracts/envelope";
import { type RequestContextHeaders } from "../../../shared/dist/middleware/request-context";
import { type DeadLetterListQuery, type DeliveryListQuery, type WebhookDeadLetterRecord, type WebhookDeliveryAttemptRecord, type WebhookDeliveryRecord, WebhookRepository } from "../store/webhook-repository";
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
export declare class DeliveryRouteHandlers {
    private readonly repository;
    constructor(repository: WebhookRepository);
    private withErrorEnvelope;
    private authorize;
    listDeliveries(request: DeliveryListRequest): ApiEnvelope<WebhookDeliveryRecord[]>;
    getDelivery(request: DeliveryReadRequest, params: {
        tenant_id: string;
        delivery_id: string;
    }): ApiEnvelope<DeliveryInspectionResponse>;
    listAttempts(request: DeliveryReadRequest, params: {
        tenant_id: string;
        delivery_id: string;
    }): ApiEnvelope<WebhookDeliveryAttemptRecord[]>;
    listDeadLetters(request: DeadLetterListRequest): ApiEnvelope<WebhookDeadLetterRecord[]>;
    triggerRetentionPurge(request: DeliveryReadRequest, params: {
        tenant_id: string;
    }): ApiEnvelope<{
        purged_deliveries: number;
        purged_dead_letters: number;
    }>;
    enqueueForTestOnly(request: DeliveryReadRequest, body: {
        tenant_id: string;
        subscription_id: string;
        event_id: string;
        event_type: string;
        event_version: string;
        request_id: string;
        entity_key: string;
        payload: Record<string, unknown>;
        max_attempts?: number;
    }): ApiEnvelope<WebhookDeliveryRecord>;
}
export {};
//# sourceMappingURL=deliveries.d.ts.map