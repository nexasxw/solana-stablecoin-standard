export type WebhookSubscriptionStatus = "active" | "paused" | "disabled";
export type WebhookDeliveryState = "queued" | "delivering" | "retry_scheduled" | "succeeded" | "dead_lettered";
export interface WebhookSubscriptionRecord {
    id: string;
    tenant_id: string;
    endpoint_url: string;
    event_filters: string[];
    status: WebhookSubscriptionStatus;
    primary_secret: string;
    secondary_secret: string | null;
    secondary_expires_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface WebhookDeliveryRecord {
    id: string;
    tenant_id: string;
    subscription_id: string;
    event_id: string;
    event_type: string;
    event_version: string;
    request_id: string;
    entity_key: string;
    payload: Record<string, unknown>;
    state: WebhookDeliveryState;
    attempt_count: number;
    max_attempts: number;
    next_attempt_at: string;
    last_attempt_at: string | null;
    last_response_status: number | null;
    last_error_code: string | null;
    last_error_message: string | null;
    last_signature_kid: "primary" | "secondary" | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}
export interface WebhookDeliveryAttemptRecord {
    id: string;
    tenant_id: string;
    delivery_id: string;
    attempt_number: number;
    status: "succeeded" | "failed";
    response_status: number | null;
    error_code: string | null;
    error_message: string | null;
    signature_kid: "primary" | "secondary";
    occurred_at: string;
}
export interface WebhookDeadLetterRecord {
    id: string;
    tenant_id: string;
    delivery_id: string;
    subscription_id: string;
    event_id: string;
    event_type: string;
    entity_key: string;
    request_id: string;
    payload: Record<string, unknown>;
    final_error_code: string;
    final_error_message: string;
    failed_at: string;
    expires_at: string;
}
export interface CreateWebhookSubscriptionInput {
    tenant_id: string;
    endpoint_url: string;
    event_filters: string[];
    status?: WebhookSubscriptionStatus;
    primary_secret: string;
}
export interface UpdateWebhookSubscriptionInput {
    endpoint_url?: string;
    event_filters?: string[];
    status?: WebhookSubscriptionStatus;
}
export interface RotateWebhookSecretInput {
    next_primary_secret: string;
    grace_seconds: number;
}
export interface EnqueueDeliveryInput {
    tenant_id: string;
    subscription_id: string;
    event_id: string;
    event_type: string;
    event_version: string;
    request_id: string;
    entity_key: string;
    payload: Record<string, unknown>;
    max_attempts?: number;
}
export interface DeliveryListQuery {
    subscription_id?: string;
    state?: WebhookDeliveryState;
    entity_key?: string;
    limit?: number;
}
export interface DeadLetterListQuery {
    subscription_id?: string;
    limit?: number;
}
export interface DeliveryExecutionSelection {
    subscription: WebhookSubscriptionRecord;
    delivery: WebhookDeliveryRecord;
}
export declare const DELIVERY_RETENTION_DAYS = 90;
export declare const DEAD_LETTER_RETENTION_DAYS = 180;
export declare class WebhookRepository {
    private readonly subscriptions;
    private readonly tenantSubscriptions;
    private readonly deliveries;
    private readonly tenantDeliveries;
    private readonly deliveryAttempts;
    private readonly deadLetters;
    private readonly tenantDeadLetters;
    private readonly deliveryOrder;
    private nextDeliveryOrder;
    private compareDeliveryOrder;
    createSubscription(input: CreateWebhookSubscriptionInput, now?: () => Date): WebhookSubscriptionRecord;
    listSubscriptions(tenantId: string, status?: WebhookSubscriptionStatus): WebhookSubscriptionRecord[];
    getSubscription(tenantId: string, subscriptionId: string): WebhookSubscriptionRecord;
    updateSubscription(tenantId: string, subscriptionId: string, update: UpdateWebhookSubscriptionInput, now?: () => Date): WebhookSubscriptionRecord;
    rotateSubscriptionSecret(tenantId: string, subscriptionId: string, input: RotateWebhookSecretInput, now?: () => Date): WebhookSubscriptionRecord;
    enqueueDelivery(input: EnqueueDeliveryInput, now?: () => Date): WebhookDeliveryRecord;
    getDelivery(tenantId: string, deliveryId: string): WebhookDeliveryRecord;
    listDeliveries(tenantId: string, query?: DeliveryListQuery): WebhookDeliveryRecord[];
    listDeliveryAttempts(tenantId: string, deliveryId: string): WebhookDeliveryAttemptRecord[];
    listDeadLetters(tenantId: string, query?: DeadLetterListQuery): WebhookDeadLetterRecord[];
    takeNextDelivery(tenantId: string, now?: () => Date): DeliveryExecutionSelection | null;
    markDeliveryRunning(tenantId: string, deliveryId: string, signatureKid: "primary" | "secondary", now?: () => Date): WebhookDeliveryRecord;
    markDeliverySucceeded(tenantId: string, deliveryId: string, responseStatus: number, now?: () => Date): WebhookDeliveryRecord;
    markDeliveryFailed(tenantId: string, deliveryId: string, failure: {
        response_status: number | null;
        error_code: string;
        error_message: string;
    }, now?: () => Date): WebhookDeliveryRecord;
    purgeExpiredRecords(now?: () => Date): {
        purged_deliveries: number;
        purged_dead_letters: number;
    };
    private appendAttempt;
}
//# sourceMappingURL=webhook-repository.d.ts.map