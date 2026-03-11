import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import {
  rotateWebhookSecrets,
  signWebhookPayload,
  verifyWebhookSignature,
} from "../security/signature";

describe("webhook signature rotation", () => {
  it("verifies signatures signed with current primary secret", () => {
    const timestampSeconds = Math.floor(Date.parse("2026-03-11T15:00:00.000Z") / 1000);
    const payload = JSON.stringify({ event_id: "evt-sign-1", value: 42 });

    const signed = signWebhookPayload(
      payload,
      {
        secret: "primary-secret-v2",
        key_id: "primary",
      },
      timestampSeconds
    );

    const verification = verifyWebhookSignature({
      payload,
      timestamp: signed["x-webhook-timestamp"],
      signature: signed["x-webhook-signature"],
      primary_secret: "primary-secret-v2",
      now: () => new Date("2026-03-11T15:02:00.000Z"),
      tolerance_seconds: 300,
    });

    assert.equal(verification.valid, true);
    assert.equal(verification.key_id, "primary");
  });

  it("supports dual-key verification during secret rotation grace window", () => {
    const now = () => new Date("2026-03-11T15:10:00.000Z");
    const rotated = rotateWebhookSecrets("primary-secret-v1", "primary-secret-v2", 600, now);

    const payload = JSON.stringify({ event_id: "evt-sign-2", amount: "500" });
    const timestampSeconds = Math.floor(Date.parse("2026-03-11T15:11:00.000Z") / 1000);

    const signedWithOldSecret = signWebhookPayload(
      payload,
      {
        secret: "primary-secret-v1",
        key_id: "secondary",
      },
      timestampSeconds
    );

    const validWithinGrace = verifyWebhookSignature({
      payload,
      timestamp: signedWithOldSecret["x-webhook-timestamp"],
      signature: signedWithOldSecret["x-webhook-signature"],
      primary_secret: rotated.primary_secret,
      secondary_secret: rotated.secondary_secret,
      secondary_expires_at: rotated.secondary_expires_at,
      now: () => new Date("2026-03-11T15:12:00.000Z"),
      tolerance_seconds: 300,
    });

    assert.equal(validWithinGrace.valid, true);
    assert.equal(validWithinGrace.key_id, "secondary");

    const invalidAfterGrace = verifyWebhookSignature({
      payload,
      timestamp: signedWithOldSecret["x-webhook-timestamp"],
      signature: signedWithOldSecret["x-webhook-signature"],
      primary_secret: rotated.primary_secret,
      secondary_secret: rotated.secondary_secret,
      secondary_expires_at: rotated.secondary_expires_at,
      now: () => new Date("2026-03-11T15:22:00.000Z"),
      tolerance_seconds: 1200,
    });

    assert.equal(invalidAfterGrace.valid, false);
    assert.equal(invalidAfterGrace.reason, "invalid_signature");
  });

  it("rejects timestamps outside the signed tolerance window", () => {
    const payload = JSON.stringify({ event_id: "evt-sign-3" });
    const timestampSeconds = Math.floor(Date.parse("2026-03-11T15:20:00.000Z") / 1000);

    const signed = signWebhookPayload(
      payload,
      {
        secret: "primary-secret-v3",
        key_id: "primary",
      },
      timestampSeconds
    );

    const stale = verifyWebhookSignature({
      payload,
      timestamp: signed["x-webhook-timestamp"],
      signature: signed["x-webhook-signature"],
      primary_secret: "primary-secret-v3",
      now: () => new Date("2026-03-11T15:30:01.000Z"),
      tolerance_seconds: 300,
    });

    assert.equal(stale.valid, false);
    assert.equal(stale.reason, "timestamp_out_of_window");
  });
});
