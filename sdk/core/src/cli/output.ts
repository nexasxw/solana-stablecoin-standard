import { CliError } from "./errors";

export interface CliSuccessEnvelope {
  ok: true;
  command: string;
  data: unknown;
  error: null;
}

export interface CliFailureEnvelope {
  ok: false;
  command: string;
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type CliEnvelope = CliSuccessEnvelope | CliFailureEnvelope;

export function buildSuccessEnvelope(command: string, data: unknown = {}): CliSuccessEnvelope {
  return {
    ok: true,
    command,
    data,
    error: null,
  };
}

export function buildFailureEnvelope(command: string, error: CliError): CliFailureEnvelope {
  return {
    ok: false,
    command,
    data: null,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}

export function renderSuccess(command: string, data: unknown, json: boolean): string {
  if (json) {
    return `${JSON.stringify(buildSuccessEnvelope(command, data))}\n`;
  }

  return `${command}: ok\n`;
}

export function renderFailure(command: string, error: CliError, json: boolean): string {
  if (json) {
    return `${JSON.stringify(buildFailureEnvelope(command, error))}\n`;
  }

  return `${command}: ${error.code} ${error.message}\n`;
}
