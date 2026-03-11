export const JOB_LIFECYCLE_STATES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
] as const;

export type JobLifecycleState = (typeof JOB_LIFECYCLE_STATES)[number];

export interface ServiceJob<TPayload = unknown, TResult = unknown> {
  id: string;
  tenant_id: string;
  type: string;
  state: JobLifecycleState;
  request_id: string;
  payload: TPayload;
  result: TResult | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface EventEnvelope<TBody = unknown> {
  event_id: string;
  event_type: string;
  event_version: string;
  request_id: string;
  occurred_at: string;
  body: TBody;
}

export interface IdempotencyRecord<TResponse = unknown> {
  tenant_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  first_response: TResponse;
  created_at: string;
}
