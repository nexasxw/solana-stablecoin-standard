import { Command } from "commander";
import { Connection, PublicKey } from "@solana/web3.js";
import { CliCommandContext, CliContextRequirements, CliGlobalOptions, CliRuntimeDefaults, CliVariant } from "./types";

const DEFAULT_RPC_URL = "http://127.0.0.1:8899";

function normalizeVariant(value?: string): CliVariant | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace("-", "_");
  if (normalized === "SSS_1" || normalized === "SSS_2") {
    return normalized;
  }

  throw new Error(`Invalid variant "${value}". Expected SSS_1 or SSS_2.`);
}

function parseMint(value?: string): PublicKey | null {
  if (!value) {
    return null;
  }

  try {
    return new PublicKey(value);
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid mint public key: ${cause}`);
  }
}

function readGlobalOptions(command: Command): CliGlobalOptions {
  return command.optsWithGlobals<CliGlobalOptions>();
}

export function buildRuntimeDefaults(options: CliGlobalOptions): CliRuntimeDefaults {
  const rpcFromFlags = options.rpcUrl?.trim();
  const rpcFromEnv = process.env.SSS_TOKEN_RPC_URL?.trim();
  const resolvedRpcUrl = rpcFromFlags || rpcFromEnv || DEFAULT_RPC_URL;

  return {
    rpcUrl: resolvedRpcUrl,
    mint: parseMint(options.mint),
    variant: normalizeVariant(options.variant),
    output: options.json ? "json" : "human",
    confirmBypass: Boolean(options.yes),
  };
}

export function enforceContextRequirements(
  runtime: CliRuntimeDefaults,
  requirements: CliContextRequirements = {}
): void {
  if (requirements.mint && runtime.mint === null) {
    throw new Error("Missing required runtime context: mint. Provide --mint or SSS_TOKEN_MINT.");
  }

  if (requirements.variant && runtime.variant === null) {
    throw new Error("Missing required runtime context: variant. Provide --variant or SSS_TOKEN_VARIANT.");
  }
}

export function loadCommandContext(
  command: Command,
  requirements: CliContextRequirements = {}
): CliCommandContext {
  const options = readGlobalOptions(command);
  const runtime = buildRuntimeDefaults(options);
  enforceContextRequirements(runtime, requirements);

  return {
    connection: new Connection(runtime.rpcUrl, "confirmed"),
    options,
    runtime,
  };
}
