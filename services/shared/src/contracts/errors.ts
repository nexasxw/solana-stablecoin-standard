const sdkErrorCodes = [
  "VALIDATION_FAILED",
  "INVALID_ARGUMENT",
  "INVALID_REASON",
  "INVALID_AMOUNT",
  "MISSING_SIGNER",
  "UNSUPPORTED_OPERATION",
  "RPC_ERROR",
] as const;

const serviceErrorCodes = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_STATE",
  "IDEMPOTENCY_CONFLICT",
  "RATE_LIMITED",
  "DEPENDENCY_FAILURE",
  "TIMEOUT",
  "INTERNAL_ERROR",
] as const;

export const STABLE_ERROR_CODES = [...sdkErrorCodes, ...serviceErrorCodes] as const;

export type StableErrorCode = (typeof STABLE_ERROR_CODES)[number];

export interface StableErrorShape {
  code: StableErrorCode;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class StableServiceError extends Error {
  readonly code: StableErrorCode;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(code: StableErrorCode, message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message);
    this.name = "StableServiceError";
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

const stableErrorCodeSet = new Set<string>(STABLE_ERROR_CODES);

export const isStableErrorCode = (value: string): value is StableErrorCode => {
  return stableErrorCodeSet.has(value);
};

export const mapErrorCode = (error: unknown): StableErrorCode => {
  if (error && typeof error === "object" && "code" in error) {
    const value = (error as { code?: unknown }).code;
    if (typeof value === "string" && isStableErrorCode(value)) {
      return value;
    }
  }

  if (error instanceof TypeError) {
    return "INVALID_ARGUMENT";
  }

  return "INTERNAL_ERROR";
};

export const toStableError = (error: unknown): StableErrorShape => {
  if (error instanceof StableServiceError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      cause: error.cause,
    };
  }

  const code = mapErrorCode(error);
  if (error instanceof Error) {
    return {
      code,
      message: error.message,
      cause: error,
    };
  }

  return {
    code,
    message: "Unexpected service error",
  };
};
