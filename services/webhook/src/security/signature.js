"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotateWebhookSecrets = exports.verifyWebhookSignature = exports.signWebhookPayload = void 0;
const node_crypto_1 = require("node:crypto");
const DEFAULT_TOLERANCE_SECONDS = 300;
const toSignedPayload = (timestamp, payload) => `${timestamp}.${payload}`;
const signDigest = (material, timestamp, payload) => {
    return (0, node_crypto_1.createHmac)("sha256", material.secret)
        .update(toSignedPayload(timestamp, payload), "utf8")
        .digest("hex");
};
const safeEqual = (left, right) => {
    const leftBuffer = Buffer.from(left, "utf8");
    const rightBuffer = Buffer.from(right, "utf8");
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(leftBuffer, rightBuffer);
};
const parseEpochSeconds = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};
const nowEpochSeconds = (clock) => Math.floor(clock().getTime() / 1000);
const withinTolerance = (eventTimestamp, currentTimestamp, toleranceSeconds) => {
    return Math.abs(currentTimestamp - eventTimestamp) <= toleranceSeconds;
};
const signWebhookPayload = (payload, material, timestampEpochSeconds = Math.floor(Date.now() / 1000)) => {
    const timestamp = String(timestampEpochSeconds);
    return {
        "x-webhook-timestamp": timestamp,
        "x-webhook-signature": signDigest(material, timestamp, payload),
        "x-webhook-signature-kid": material.key_id,
    };
};
exports.signWebhookPayload = signWebhookPayload;
const verifyWebhookSignature = (input) => {
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
    const primarySignature = signDigest({
        secret: input.primary_secret,
        key_id: "primary",
    }, input.timestamp, input.payload);
    if (safeEqual(primarySignature, input.signature)) {
        return {
            valid: true,
            key_id: "primary",
        };
    }
    if (input.secondary_secret && input.secondary_expires_at) {
        const expiryEpoch = Date.parse(input.secondary_expires_at);
        if (!Number.isNaN(expiryEpoch) && clock().getTime() <= expiryEpoch) {
            const secondarySignature = signDigest({
                secret: input.secondary_secret,
                key_id: "secondary",
            }, input.timestamp, input.payload);
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
exports.verifyWebhookSignature = verifyWebhookSignature;
const rotateWebhookSecrets = (currentPrimarySecret, nextPrimarySecret, graceSeconds, now = () => new Date()) => {
    const expiresAt = new Date(now().getTime() + graceSeconds * 1000).toISOString();
    return {
        primary_secret: nextPrimarySecret,
        secondary_secret: currentPrimarySecret,
        secondary_expires_at: expiresAt,
    };
};
exports.rotateWebhookSecrets = rotateWebhookSecrets;
