import { Command } from "commander";
import { Connection } from "@solana/web3.js";
import { resolveRuntimeConfig } from "./config";
import { CliUsageError } from "./errors";
import { CliCommandContext, CliContextRequirements, CliGlobalOptions, CliRuntimeDefaults, CliVariant } from "./types";

const DEFAULT_RPC_URL = "http://127.0.0.1:8899";

function readGlobalOptions(command: Command): CliGlobalOptions {
  return command.optsWithGlobals<CliGlobalOptions>();
}

export function buildRuntimeDefaults(options: CliGlobalOptions): CliRuntimeDefaults {
  const resolved = resolveRuntimeConfig({ flags: options });

  return {
    rpcUrl: resolved.rpcUrl || DEFAULT_RPC_URL,
    mint: resolved.mint,
    variant: resolved.variant as CliVariant | null,
    output: resolved.output,
    confirmBypass: resolved.confirmBypass,
  };
}

export function enforceContextRequirements(
  runtime: CliRuntimeDefaults,
  requirements: CliContextRequirements = {}
): void {
  if (requirements.mint && runtime.mint === null) {
    throw new CliUsageError("Missing required runtime context: mint. Provide --mint or SSS_TOKEN_MINT.");
  }

  if (requirements.variant && runtime.variant === null) {
    throw new CliUsageError("Missing required runtime context: variant. Provide --variant or SSS_TOKEN_VARIANT.");
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
