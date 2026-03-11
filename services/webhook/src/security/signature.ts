import { createHmac, timingSafeEqual } from "node:crypto";

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

const DEFAULT_TOLERANCE_SECONDS = 300;

const toSignedPayload = (timestamp: string, payload: string): string => `${timestamp}.${payload}`;

const signDigest = (material: WebhookSignatureMaterial, timestamp: string, payload: string): string => {
  return createHmac("sha256", material.secret)
    .update(toSignedPayload(timestamp, payload), "utf8")
    .digest("hex");
};

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const parseEpochSeconds = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const nowEpochSeconds = (clock: () => Date): number => Math.floor(clock().getTime() / 1000);

const withinTolerance = (eventTimestamp: number, currentTimestamp: number, toleranceSeconds: number): boolean => {
  return Math.abs(currentTimestamp - eventTimestamp) <= toleranceSeconds;
};

export const signWebhookPayload = (
  payload: string,
  material: WebhookSignatureMaterial,
  timestampEpochSeconds: number = Math.floor(Date.now() / 1000)
): WebhookSignatureHeaders => {
  const timestamp = String(timestampEpochSeconds);
  return {
    "x-webhook-timestamp": timestamp,
    "x-webhook-signature": signDigest(material, timestamp, payload),
    "x-webhook-signature-kid": material.key_id,
  };
};

export const verifyWebhookSignature = (
  input: SignatureVerificationInput
): SignatureVerificationResult => {
  const timestampSeconds = parseEpochSeconds(input.timestamp);
  if (timestampSeconds === null) {
    return {
      valid: false,
      key_id: null,
      reason: "invalid_timestamp",
    };
  }

  const clock = input.now ?? (() => new Date());
  const tolerance = input.tolerance_seconds ?? DEFAULT_TOLERANCE_SECONDS;
  const currentTimestamp = nowEpochSeconds(clock);

  if (!withinTolerance(timestampSeconds, currentTimestamp, tolerance)) {
    return {
      valid: false,
      key_id: null,
      reason: "timestamp_out_of_window",
    };
  }

  const primarySignature = signDigest(
    {
      secret: input.primary_secret,
      key_id: "primary",
    },
    input.timestamp,
    input.payload
  );

  if (safeEqual(primarySignature, input.signature)) {
    return {
      valid: true,
      key_id: "primary",
    };
  }

  if (input.secondary_secret && input.secondary_expires_at) {
    const expiryEpoch = Date.parse(input.secondary_expires_at);
    if (!Number.isNaN(expiryEpoch) && clock().getTime() <= expiryEpoch) {
      const secondarySignature = signDigest(
        {
          secret: input.secondary_secret,
          key_id: "secondary",
        },
        input.timestamp,
        input.payload
      );

      if (safeEqual(secondarySignature, input.signature)) {
        return {
          valid: true,
          key_id: "secondary",
        };
      }
    }
  }

  return {
    valid: false,
    key_id: null,
    reason: "invalid_signature",
  };
};

export const rotateWebhookSecrets = (
  currentPrimarySecret: string,
  nextPrimarySecret: string,
  graceSeconds: number,
  now: () => Date = () => new Date()
): SecretRotationResult => {
  const expiresAt = new Date(now().getTime() + graceSeconds * 1000).toISOString();

  return {
    primary_secret: nextPrimarySecret,
    secondary_secret: currentPrimarySecret,
    secondary_expires_at: expiresAt,
  };
};
