export interface ApiEnvelope<TData = unknown, TError = unknown> {
  success: boolean;
  data: TData | null;
  error: TError | null;
  code: string;
  request_id: string;
  timestamp: string;
}

export interface EnvelopeMeta {
  requestId: string;
  timestamp?: Date;
}

export interface EnvelopeError {
  message: string;
  details?: Record<string, unknown>;
}

const toIsoTimestamp = (timestamp?: Date): string => {
  return (timestamp ?? new Date()).toISOString();
};

export const createSuccessEnvelope = <TData>(
  data: TData,
  code: string,
  meta: EnvelopeMeta
): ApiEnvelope<TData, never> => {
  return {
    success: true,
    data,
    error: null,
    code,
    request_id: meta.requestId,
    timestamp: toIsoTimestamp(meta.timestamp),
  };
};

export const createErrorEnvelope = <TError extends EnvelopeError>(
  error: TError,
  code: string,
  meta: EnvelopeMeta
): ApiEnvelope<never, TError> => {
  return {
    success: false,
    data: null,
    error,
    code,
    request_id: meta.requestId,
    timestamp: toIsoTimestamp(meta.timestamp),
  };
};
