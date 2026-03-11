import { StablecoinSdkError } from "../errors";

export enum CliErrorCode {
  USAGE = "CLI_USAGE",
  CONFIG = "CLI_CONFIG",
  SIGNER = "CLI_SIGNER",
  SDK = "CLI_SDK",
  RUNTIME = "CLI_RUNTIME",
}

export class CliError extends Error {
  readonly code: CliErrorCode;
  readonly exitCode: number;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(
    code: CliErrorCode,
    message: string,
    options?: { exitCode?: number; details?: Record<string, unknown>; cause?: unknown }
  ) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.exitCode = options?.exitCode ?? 1;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}

export class CliUsageError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(CliErrorCode.USAGE, message, { exitCode: 2, details });
    this.name = "CliUsageError";
  }
}

export class CliConfigError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(CliErrorCode.CONFIG, message, { exitCode: 2, details });
    this.name = "CliConfigError";
  }
}

export class CliSignerError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(CliErrorCode.SIGNER, message, { exitCode: 2, details });
    this.name = "CliSignerError";
  }
}

function sdkExitCode(error: StablecoinSdkError): number {
  switch (error.code) {
    case "INVALID_ARGUMENT":
    case "INVALID_REASON":
    case "INVALID_AMOUNT":
    case "MISSING_SIGNER":
      return 2;
    case "UNSUPPORTED_OPERATION":
      return 3;
    case "RPC_ERROR":
      return 10;
    default:
      return 1;
  }
}

export function resolveCliFailure(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof StablecoinSdkError) {
    return new CliError(CliErrorCode.SDK, error.message, {
      exitCode: sdkExitCode(error),
      details: {
        sdkCode: error.code,
        ...(error.details ?? {}),
      },
      cause: error,
    });
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    const message = String((error as { message: unknown }).message);
    return new CliUsageError(message, { cause: error });
  }

  if (error instanceof Error) {
    return new CliError(CliErrorCode.RUNTIME, error.message, {
      exitCode: 1,
      cause: error,
    });
  }

  return new CliError(CliErrorCode.RUNTIME, String(error), { exitCode: 1 });
}
