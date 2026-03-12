export interface WebhookSignatureMaterial {
    secret: string;
    key_id: "primary" | "secondary";
}
export interface WebhookSignatureHeaders {
    "x-webhook-timestamp": string;
    "x-webhook-signature": string;
    "x-webhook-signature-kid": "primary" | "secondary";
}
export interface SignatureVerificationInput {
    payload: string;
    timestamp: string;
    signature: string;
    primary_secret: string;
    secondary_secret?: string | null;
    secondary_expires_at?: string | null;
    now?: () => Date;
    tolerance_seconds?: number;
}
export interface SignatureVerificationResult {
    valid: boolean;
    key_id: "primary" | "secondary" | null;
    reason?: "invalid_timestamp" | "timestamp_out_of_window" | "invalid_signature";
}
export interface SecretRotationResult {
    primary_secret: string;
    secondary_secret: string;
    secondary_expires_at: string;
}
export declare const signWebhookPayload: (payload: string, material: WebhookSignatureMaterial, timestampEpochSeconds?: number) => WebhookSignatureHeaders;
export declare const verifyWebhookSignature: (input: SignatureVerificationInput) => SignatureVerificationResult;
export declare const rotateWebhookSecrets: (currentPrimarySecret: string, nextPrimarySecret: string, graceSeconds: number, now?: () => Date) => SecretRotationResult;
//# sourceMappingURL=signature.d.ts.map