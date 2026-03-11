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
