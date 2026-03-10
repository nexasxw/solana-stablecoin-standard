export enum SdkErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  UNSUPPORTED_OPERATION = "UNSUPPORTED_OPERATION",
  RPC_ERROR = "RPC_ERROR",
}

export class StablecoinSdkError extends Error {
  readonly code: SdkErrorCode;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(
    code: SdkErrorCode,
    message: string,
    options?: { details?: Record<string, unknown>; cause?: unknown }
  ) {
    super(message);
    this.name = "StablecoinSdkError";
    this.code = code;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}

export class ValidationError extends StablecoinSdkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(SdkErrorCode.VALIDATION_FAILED, message, { details });
    this.name = "ValidationError";
  }
}

export class UnsupportedOperationError extends StablecoinSdkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(SdkErrorCode.UNSUPPORTED_OPERATION, message, { details });
    this.name = "UnsupportedOperationError";
  }
}

export class RpcRequestError extends StablecoinSdkError {
  constructor(message: string, cause?: unknown, details?: Record<string, unknown>) {
    super(SdkErrorCode.RPC_ERROR, message, { cause, details });
    this.name = "RpcRequestError";
  }
}
