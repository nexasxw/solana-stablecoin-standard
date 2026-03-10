export enum SdkErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_ARGUMENT = "INVALID_ARGUMENT",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  MISSING_SIGNER = "MISSING_SIGNER",
  UNSUPPORTED_OPERATION = "UNSUPPORTED_OPERATION",
  RPC_ERROR = "RPC_ERROR",
}

export class StablecoinSdkError extends Error {
  readonly code: SdkErrorCode;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

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

export class InvalidArgumentError extends StablecoinSdkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(SdkErrorCode.INVALID_ARGUMENT, message, { details });
    this.name = "InvalidArgumentError";
  }
}

export class InvalidAmountError extends StablecoinSdkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(SdkErrorCode.INVALID_AMOUNT, message, { details });
    this.name = "InvalidAmountError";
  }
}

export class MissingSignerError extends StablecoinSdkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(SdkErrorCode.MISSING_SIGNER, message, { details });
    this.name = "MissingSignerError";
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
