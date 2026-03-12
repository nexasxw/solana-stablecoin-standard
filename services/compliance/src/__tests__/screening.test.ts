import { strict as assert } from "node:assert";
import { describe, it } from "mocha";

import { ScreeningRouteHandlers } from "../routes/screening";
import { ComplianceRepository } from "../store/compliance-repository";

const tenantId = "tenant-screening";

const headers = (requestId: string): Record<string, string> => ({
  "x-request-id": requestId,
  "x-tenant-id": tenantId,
  "x-service-id": "issuer-service",
  "x-service-role": "issuer",
  "x-service-tenant-ids": tenantId,
  "x-requester-id": "ops.requester",
  "x-approver-id": "ops.approver",
  "x-intent-signature": `sig-${requestId}`,
  "x-intent-signature-alg": "ed25519",
  "x-intent-signed-at": "2026-03-11T12:00:00.000Z",
  "x-intent-nonce": `nonce-${requestId}`,
});

describe("screening boundary contracts", () => {
  it("returns stable decision reason codes with canonical response envelope fields", () => {
    const repository = new ComplianceRepository();
    const screening = new ScreeningRouteHandlers(repository);

    const allow = screening.evaluate({
      headers: headers("req-screen-allow"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "blacklist_add",
        subject: "holder-a",
        onchain_blacklisted: false,
      },
    });

    const deny = screening.evaluate({
      headers: headers("req-screen-deny"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "seize",
        subject: "holder-b",
        amount: "25",
        onchain_blacklisted: false,
      },
    });

    const review = screening.evaluate({
      headers: headers("req-screen-review"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "seize",
        subject: "holder-c",
        amount: "1000000",
        onchain_blacklisted: true,
      },
    });

    assert.equal(allow.success, true);
    assert.equal(allow.request_id, "req-screen-allow");
    assert.equal(allow.code, "COMPLIANCE_SCREENING_OK");
    assert.equal(allow.data?.decision, "allow");
    assert.equal(allow.data?.reason_code, "ALLOW_POLICY_PASS");
    assert.equal(typeof allow.timestamp, "string");

    assert.equal(deny.success, true);
    assert.equal(deny.request_id, "req-screen-deny");
    assert.equal(deny.code, "COMPLIANCE_SCREENING_OK");
    assert.equal(deny.data?.decision, "deny");
    assert.equal(deny.data?.reason_code, "DENY_SEIZE_TARGET_NOT_BLACKLISTED");

    assert.equal(review.success, true);
    assert.equal(review.request_id, "req-screen-review");
    assert.equal(review.code, "COMPLIANCE_SCREENING_OK");
    assert.equal(review.data?.decision, "review_required");
    assert.equal(review.data?.reason_code, "REVIEW_LARGE_AMOUNT");
    assert.equal(review.data?.review_status, "pending");
  });

  it("returns stable FORBIDDEN envelope for non-issuer callers", () => {
    const repository = new ComplianceRepository();
    const screening = new ScreeningRouteHandlers(repository);

    const forbidden = screening.evaluate({
      headers: {
        ...headers("req-screen-forbidden"),
        "x-service-role": "compliance",
      },
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-1",
        operation: "blacklist_add",
        subject: "holder-z",
        onchain_blacklisted: false,
      },
    });

    assert.equal(forbidden.success, false);
    assert.equal(forbidden.request_id, "req-screen-forbidden");
    assert.equal(forbidden.code, "FORBIDDEN");
    assert.equal(forbidden.data, null);
    const errorDetails = (forbidden.error as { details?: Record<string, unknown> } | null)?.details;
    assert.equal(errorDetails?.stable_code, "FORBIDDEN");
  });

  it("returns deterministic decision payload for repeated identical screening input", () => {
    const repository = new ComplianceRepository();
    const screening = new ScreeningRouteHandlers(repository);
    const request = {
      headers: headers("req-screen-repeat"),
      body: {
        tenant_id: tenantId,
        stablecoin_id: "mint-repeat",
        operation: "blacklist_add" as const,
        subject: "holder-repeat",
        onchain_blacklisted: false,
      },
    };

    const first = screening.evaluate(request);
    const second = screening.evaluate(request);

    assert.equal(first.success, true);
    assert.equal(second.success, true);
    assert.equal(first.code, "COMPLIANCE_SCREENING_OK");
    assert.equal(second.code, "COMPLIANCE_SCREENING_OK");
    assert.equal(first.request_id, second.request_id);
    assert.equal(first.data?.decision, second.data?.decision);
    assert.equal(first.data?.reason_code, second.data?.reason_code);
  });
});
