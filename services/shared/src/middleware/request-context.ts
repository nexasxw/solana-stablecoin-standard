import { randomUUID } from "node:crypto";

import { StableServiceError } from "../contracts/errors";

export interface RequestContext {
  request_id: string;
  tenant_id: string;
  received_at: string;
}

export interface RequestContextHeaders {
  [header: string]: string | string[] | undefined;
}

const REQUEST_ID_HEADERS = ["x-request-id", "x-correlation-id"];
const TENANT_ID_HEADERS = ["x-tenant-id", "x-issuer-tenant"];

const readHeader = (headers: RequestContextHeaders, candidates: string[]): string | null => {
  for (const candidate of candidates) {
    const value = headers[candidate] ?? headers[candidate.toLowerCase()] ?? headers[candidate.toUpperCase()];
    if (Array.isArray(value)) {
      const first = value.find((entry) => entry.trim().length > 0);
      if (first) {
        return first.trim();
      }
      continue;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

export const createRequestContext = (
  headers: RequestContextHeaders,
  clock: () => Date = () => new Date()
): RequestContext => {
  const tenantId = readHeader(headers, TENANT_ID_HEADERS);
  if (!tenantId) {
    throw new StableServiceError("INVALID_ARGUMENT", "Missing tenant identity header", {
      required_headers: TENANT_ID_HEADERS,
    });
  }

  return {
    request_id: readHeader(headers, REQUEST_ID_HEADERS) ?? randomUUID(),
    tenant_id: tenantId,
    received_at: clock().toISOString(),
  };
};

export const propagateRequestContext = (
  context: RequestContext,
  headers: RequestContextHeaders
): RequestContextHeaders => {
  return {
    ...headers,
    "x-request-id": context.request_id,
    "x-tenant-id": context.tenant_id,
  };
};

export const requireTenantScope = (context: RequestContext, tenantId: string): void => {
  if (context.tenant_id !== tenantId) {
    throw new StableServiceError("FORBIDDEN", "Tenant scope mismatch", {
      expected_tenant_id: tenantId,
      actual_tenant_id: context.tenant_id,
      request_id: context.request_id,
    });
  }
};
