import fs from "node:fs";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Command } from "commander";
import { resolveRuntimeConfig } from "./config";
import { CliSignerError, CliUsageError } from "./errors";
import { SignerRole } from "./signer";
import { CliGlobalOptions } from "./types";

export function parsePublicKey(input: string, field: string): PublicKey {
  try {
    return new PublicKey(input);
  } catch (error) {
    throw new CliUsageError(`Invalid ${field} public key.`, {
      field,
      value: input,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export function parseBigInt(input: string, field: string): bigint {
  try {
    const amount = BigInt(input);
    if (amount < 0n) {
      throw new CliUsageError(`${field} must be non-negative.`, { field, value: input });
    }
    return amount;
  } catch (error) {
    if (error instanceof CliUsageError) {
      throw error;
    }

    throw new CliUsageError(`Invalid ${field}. Expected an integer string.`, {
      field,
      value: input,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export function parseOptionalInteger(input: string | undefined, field: string): number | undefined {
  if (input == null) {
    return undefined;
  }

  if (!/^\d+$/.test(input.trim())) {
    throw new CliUsageError(`Invalid ${field}. Expected a non-negative integer.`, {
      field,
      value: input,
    });
  }

  return Number.parseInt(input, 10);
}

export function parsePreset(input: string): "SSS_1" | "SSS_2" {
  const normalized = input.trim().toUpperCase().replace("-", "_");
  if (normalized === "SSS_1" || normalized === "SSS_2") {
    return normalized;
  }

  throw new CliUsageError(`Invalid preset "${input}". Expected sss-1 or sss-2.`);
}

function readKeypairFile(filePath: string): Keypair {
  let parsed: unknown;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new CliSignerError("Failed to read signer file.", {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "number")) {
    throw new CliSignerError("Invalid signer file format. Expected JSON number array.", { filePath });
  }

  try {
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch (error) {
    throw new CliSignerError("Invalid signer secret key bytes.", {
      filePath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export function resolveRoleSigner(command: Command, role: Exclude<SignerRole, "default">): Keypair {
  const flags = command.optsWithGlobals<Record<string, unknown>>() as CliGlobalOptions;
  const runtime = resolveRuntimeConfig({ flags });
  const signerPath = runtime.signers.byRole[role];

  if (!signerPath) {
    throw new CliSignerError(`Missing signer for role: ${role}.`, { role });
  }

  return readKeypairFile(signerPath);
}
