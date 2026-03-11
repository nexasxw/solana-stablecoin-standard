import { StableServiceError } from "../contracts/errors";
import type { RequestContextHeaders } from "../middleware/request-context";

export interface ServiceIdentity {
  service_id: string;
  role: "issuer" | "indexer" | "compliance" | "webhook";
  tenant_ids: string[];
}

export interface IntentSignatureContext {
  signature: string;
  algorithm: string;
  signed_at: string;
  nonce: string;
}

export interface IssuanceIdentityChain {
  requester: string;
  approver: string | null;
  executor_service: string;
  intent_signature: IntentSignatureContext;
}

const SERVICE_ID_HEADER = "x-service-id";
const SERVICE_ROLE_HEADER = "x-service-role";
const TENANTS_HEADER = "x-service-tenant-ids";
const REQUESTER_HEADER = "x-requester-id";
const APPROVER_HEADER = "x-approver-id";
const INTENT_SIGNATURE_HEADER = "x-intent-signature";
const INTENT_ALGORITHM_HEADER = "x-intent-signature-alg";
const INTENT_SIGNED_AT_HEADER = "x-intent-signed-at";
const INTENT_NONCE_HEADER = "x-intent-nonce";

const read = (headers: RequestContextHeaders, key: string): string | null => {
  const value = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
  if (Array.isArray(value)) {
    const first = value.find((entry) => entry.trim().length > 0);
    return first ? first.trim() : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
};

const parseTenants = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const assertIsoTimestamp = (value: string, field: string): void => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new StableServiceError("INVALID_ARGUMENT", `Invalid ${field} timestamp`, { field, value });
  }
};

export const parseServiceIdentity = (headers: RequestContextHeaders): ServiceIdentity => {
  const serviceId = read(headers, SERVICE_ID_HEADER);
  const roleValue = read(headers, SERVICE_ROLE_HEADER);

  if (!serviceId || !roleValue) {
    throw new StableServiceError("UNAUTHORIZED", "Missing service identity headers", {
      required_headers: [SERVICE_ID_HEADER, SERVICE_ROLE_HEADER, TENANTS_HEADER],
    });
  }

  if (roleValue !== "issuer" && roleValue !== "indexer" && roleValue !== "compliance" && roleValue !== "webhook") {
    throw new StableServiceError("FORBIDDEN", "Unknown service role", {
      role: roleValue,
    });
  }

  return {
    service_id: serviceId,
    role: roleValue,
    tenant_ids: parseTenants(read(headers, TENANTS_HEADER)),
  };
};

export const requireIssuerAuthorization = (identity: ServiceIdentity, tenantId: string): void => {
  if (identity.role !== "issuer") {
    throw new StableServiceError("FORBIDDEN", "Only issuer services may mutate issuance jobs", {
      role: identity.role,
      service_id: identity.service_id,
    });
  }

  if (!identity.tenant_ids.includes(tenantId)) {
    throw new StableServiceError("FORBIDDEN", "Issuer service not authorized for tenant", {
      service_id: identity.service_id,
      tenant_id: tenantId,
    });
  }
};

export const parseIntentSignatureContext = (headers: RequestContextHeaders): IntentSignatureContext => {
  const signature = read(headers, INTENT_SIGNATURE_HEADER);
  const algorithm = read(headers, INTENT_ALGORITHM_HEADER);
  const signedAt = read(headers, INTENT_SIGNED_AT_HEADER);
  const nonce = read(headers, INTENT_NONCE_HEADER);

  if (!signature || !algorithm || !signedAt || !nonce) {
    throw new StableServiceError("INVALID_ARGUMENT", "Missing intent-signature headers", {
      required_headers: [
        INTENT_SIGNATURE_HEADER,
        INTENT_ALGORITHM_HEADER,
        INTENT_SIGNED_AT_HEADER,
        INTENT_NONCE_HEADER,
      ],
    });
  }

  assertIsoTimestamp(signedAt, INTENT_SIGNED_AT_HEADER);

  return {
    signature,
    algorithm,
    signed_at: signedAt,
    nonce,
  };
};

export const buildIssuanceIdentityChain = (
  headers: RequestContextHeaders,
  executingServiceId: string
): IssuanceIdentityChain => {
  const requester = read(headers, REQUESTER_HEADER);
  if (!requester) {
    throw new StableServiceError("INVALID_ARGUMENT", "Missing requester identity header", {
      required_headers: [REQUESTER_HEADER],
    });
  }

  return {
    requester,
    approver: read(headers, APPROVER_HEADER),
    executor_service: executingServiceId,
    intent_signature: parseIntentSignatureContext(headers),
  };
};
