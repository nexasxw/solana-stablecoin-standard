import { type ApiEnvelope } from "../../../shared/dist/contracts/envelope";
import { type RequestContextHeaders } from "../../../shared/dist/middleware/request-context";
import { type WebhookSubscriptionRecord, type WebhookSubscriptionStatus, WebhookRepository } from "../store/webhook-repository";
interface SubscriptionCreateRequest {
    headers: RequestContextHeaders;
    body: {
        tenant_id: string;
        endpoint_url: string;
        event_filters: string[];
        status?: WebhookSubscriptionStatus;
        secret?: string;
    };
}
interface SubscriptionUpdateRequest {
    headers: RequestContextHeaders;
    body: {
        tenant_id: string;
        endpoint_url?: string;
        event_filters?: string[];
        status?: WebhookSubscriptionStatus;
    };
}
interface SubscriptionReadRequest {
    headers: RequestContextHeaders;
}
interface SubscriptionListRequest {
    headers: RequestContextHeaders;
    query: {
        tenant_id: string;
        status?: WebhookSubscriptionStatus;
    };
}
interface RotationRequest {
    headers: RequestContextHeaders;
    body: {
        tenant_id: string;
        next_primary_secret: string;
        grace_seconds: number;
    };
}
export interface SubscriptionCreateResponse {
    subscription_id: string;
    status: WebhookSubscriptionStatus;
    secret_preview: string;
}
export interface SubscriptionRotationResponse {
    subscription_id: string;
    secondary_expires_at: string;
}
export declare class SubscriptionRouteHandlers {
    private readonly repository;
    constructor(repository: WebhookRepository);
    private withErrorEnvelope;
    create(request: SubscriptionCreateRequest): ApiEnvelope<SubscriptionCreateResponse>;
    get(request: SubscriptionReadRequest, params: {
        tenant_id: string;
        subscription_id: string;
    }): ApiEnvelope<Omit<WebhookSubscriptionRecord, "primary_secret" | "secondary_secret">>;
    list(request: SubscriptionListRequest): ApiEnvelope<Array<Omit<WebhookSubscriptionRecord, "primary_secret" | "secondary_secret">>>;
    update(request: SubscriptionUpdateRequest, params: {
        tenant_id: string;
        subscription_id: string;
    }): ApiEnvelope<Omit<WebhookSubscriptionRecord, "primary_secret" | "secondary_secret">>;
    rotateSecret(request: RotationRequest, params: {
        tenant_id: string;
        subscription_id: string;
    }): ApiEnvelope<SubscriptionRotationResponse>;
}
export {};
//# sourceMappingURL=subscriptions.d.ts.map