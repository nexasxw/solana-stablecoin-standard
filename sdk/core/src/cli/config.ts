import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as TOML from "@iarna/toml";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { CliConfigError, CliUsageError } from "./errors";
import { resolveSignerConfig, ResolvedSignerConfig, SignerConfigInput } from "./signer";
import { CliGlobalOptions, CliOutputMode, CliVariant } from "./types";

const FILE_SCHEMA = z.object({
  rpc_url: z.string().trim().min(1).optional(),
  mint: z.string().trim().min(1).optional(),
  variant: z.enum(["SSS_1", "SSS_2"]).optional(),
  output: z.enum(["human", "json"]).optional(),
  confirm: z.boolean().optional(),
  default_signer: z.string().trim().min(1).optional(),
  authority_signer: z.string().trim().min(1).optional(),
  minter_signer: z.string().trim().min(1).optional(),
  burner_signer: z.string().trim().min(1).optional(),
  pauser_signer: z.string().trim().min(1).optional(),
  blacklister_signer: z.string().trim().min(1).optional(),
  seizer_signer: z.string().trim().min(1).optional(),
}).strict();

type RuntimeConfigFile = z.infer<typeof FILE_SCHEMA>;

export interface RuntimeResolutionOptions {
  flags: CliGlobalOptions & SignerConfigInput;
  env?: NodeJS.ProcessEnv;
}

export interface RuntimeConfigResolution {
  configPath: string | null;
  rpcUrl: string;
  mint: PublicKey | null;
  variant: CliVariant | null;
  output: CliOutputMode;
  confirmBypass: boolean;
  signers: ResolvedSignerConfig;
}

function parseVariant(value?: string): CliVariant | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace("-", "_");
  if (normalized === "SSS_1" || normalized === "SSS_2") {
    return normalized;
  }

  throw new CliUsageError(`Invalid variant "${value}". Expected SSS_1 or SSS_2.`, { value });
}

function parseMint(value?: string): PublicKey | null {
  if (!value) {
    return null;
  }

  try {
    return new PublicKey(value);
  } catch (error) {
    throw new CliUsageError("Invalid mint public key.", {
      value,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

function defaultConfigPath(): string {
  return path.join(os.homedir(), ".config", "sss-token", "config.toml");
}

function parseConfigFile(filePath: string, raw: string): RuntimeConfigFile {
  const ext = path.extname(filePath).toLowerCase();

  let parsed: unknown;
  if (ext === ".toml") {
    parsed = TOML.parse(raw);
  } else if (ext === ".json") {
    parsed = JSON.parse(raw);
  } else {
    throw new CliConfigError(`Unsupported config extension: ${ext}. Use .toml or .json`, {
      filePath,
      extension: ext,
    });
  }

  const result = FILE_SCHEMA.safeParse(parsed);
  if (!result.success) {
    throw new CliConfigError("Invalid CLI config file.", {
      filePath,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return result.data;
}

function loadConfigFile(resolvedPath: string, required: boolean): RuntimeConfigFile | null {
  if (!fs.existsSync(resolvedPath)) {
    if (required) {
      throw new CliConfigError(`Config file not found: ${resolvedPath}`, { filePath: resolvedPath });
    }

    return null;
  }

  const raw = fs.readFileSync(resolvedPath, "utf8");
  try {
    return parseConfigFile(resolvedPath, raw);
  } catch (error) {
    if (error instanceof CliConfigError) {
      throw error;
    }

    throw new CliConfigError("Failed to parse config file.", {
      filePath: resolvedPath,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseOutputMode(value?: string): CliOutputMode | null {
  if (!value) {
    return null;
  }
  if (value !== "human" && value !== "json") {
    throw new CliConfigError(`Invalid output mode: ${value}`, { value });
  }
  return value;
}

function parseBooleanEnv(value?: string): boolean | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new CliConfigError(`Invalid boolean environment value: ${value}`, { value });
}

export function resolveRuntimeConfig(options: RuntimeResolutionOptions): RuntimeConfigResolution {
  const env = options.env ?? process.env;

  const explicitConfigPath = options.flags.config?.trim() || env.SSS_TOKEN_CONFIG?.trim() || null;
  const configPath = explicitConfigPath ?? defaultConfigPath();
  const config = loadConfigFile(configPath, explicitConfigPath !== null);

  const rpcUrl = options.flags.rpcUrl?.trim() || env.SSS_TOKEN_RPC_URL?.trim() || config?.rpc_url || "http://127.0.0.1:8899";
  const mint = parseMint(options.flags.mint || env.SSS_TOKEN_MINT || config?.mint);
  const variant = parseVariant(options.flags.variant || env.SSS_TOKEN_VARIANT || config?.variant);

  const outputFromEnv = parseOutputMode(env.SSS_TOKEN_OUTPUT);
  const outputFromFile = parseOutputMode(config?.output);
  const output = options.flags.json ? "json" : outputFromEnv || outputFromFile || "human";

  const confirmFromEnv = parseBooleanEnv(env.SSS_TOKEN_YES);
  const confirmBypass = options.flags.yes || confirmFromEnv || config?.confirm || false;

  const signers = resolveSignerConfig({
    flags: options.flags,
    env,
    file: {
      defaultSigner: config?.default_signer,
      authoritySigner: config?.authority_signer,
      minterSigner: config?.minter_signer,
      burnerSigner: config?.burner_signer,
      pauserSigner: config?.pauser_signer,
      blacklisterSigner: config?.blacklister_signer,
      seizerSigner: config?.seizer_signer,
    },
  });

  return {
    configPath: config ? configPath : null,
    rpcUrl,
    mint,
    variant,
    output,
    confirmBypass,
    signers,
  };
}
