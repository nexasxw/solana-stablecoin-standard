import { createHash, randomUUID } from "node:crypto";

import { StableServiceError } from "../contracts/errors";

export interface DurableIdempotencyRecord<TResponse = unknown> {
  id: string;
  tenant_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  request_id: string;
  first_response: TResponse;
  created_at: string;
}

export interface DurableIdempotencyStore<TResponse = unknown> {
  find(tenantId: string, idempotencyKey: string): DurableIdempotencyRecord<TResponse> | null;
  save(record: DurableIdempotencyRecord<TResponse>): void;
}

export interface IdempotencyExecutionInput<TPayload, TResponse> {
  tenant_id: string;
  request_id: string;
  idempotency_key: string;
  payload: TPayload;
  store: DurableIdempotencyStore<TResponse>;
  execute: () => TResponse;
  now?: () => Date;
}

export interface IdempotencyExecutionResult<TResponse> {
  replayed: boolean;
  response: TResponse;
  record: DurableIdempotencyRecord<TResponse>;
}

type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue };

const canonicalize = (value: unknown): CanonicalValue => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, CanonicalValue>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return String(value);
};

export const createRequestFingerprint = (payload: unknown): string => {
  const canonicalPayload = JSON.stringify(canonicalize(payload));
  return createHash("sha256").update(canonicalPayload).digest("hex");
};

export class InMemoryIdempotencyStore<TResponse = unknown>
  implements DurableIdempotencyStore<TResponse>
{
  private readonly records = new Map<string, DurableIdempotencyRecord<TResponse>>();

  find(tenantId: string, idempotencyKey: string): DurableIdempotencyRecord<TResponse> | null {
    return this.records.get(`${tenantId}:${idempotencyKey}`) ?? null;
  }

  save(record: DurableIdempotencyRecord<TResponse>): void {
    this.records.set(`${record.tenant_id}:${record.idempotency_key}`, record);
  }
}

export const executeWithDurableIdempotency = <TPayload, TResponse>(
  input: IdempotencyExecutionInput<TPayload, TResponse>
): IdempotencyExecutionResult<TResponse> => {
  const fingerprint = createRequestFingerprint(input.payload);
  const existing = input.store.find(input.tenant_id, input.idempotency_key);

  if (existing) {
    if (existing.request_fingerprint !== fingerprint) {
      throw new StableServiceError("IDEMPOTENCY_CONFLICT", "Idempotency key already used with different payload", {
        idempotency_key: input.idempotency_key,
        tenant_id: input.tenant_id,
        request_id: input.request_id,
      });
    }

    return {
      replayed: true,
      response: existing.first_response,
      record: existing,
    };
  }

  const response = input.execute();
  const record: DurableIdempotencyRecord<TResponse> = {
    id: randomUUID(),
    tenant_id: input.tenant_id,
    idempotency_key: input.idempotency_key,
    request_fingerprint: fingerprint,
    request_id: input.request_id,
    first_response: response,
    created_at: (input.now ?? (() => new Date()))().toISOString(),
  };

  input.store.save(record);

  return {
    replayed: false,
    response,
    record,
  };
};
