import fs from "node:fs/promises";
import path from "node:path";
import * as TOML from "@iarna/toml";
import { z } from "zod";
import { PresetConfig } from "./presets";
import { CreateOptions, StablecoinConfig } from "./types";

export type ConfigFormat = "json" | "toml";

export interface StablecoinConfigFileInput {
  name?: string;
  symbol?: string;
  uri?: string;
  decimals?: number;
  enable_permanent_delegate?: boolean;
  enable_transfer_hook?: boolean;
  default_account_frozen?: boolean;
}

const fileSchema = z
  .object({
    name: z.string().trim().min(1),
    symbol: z.string().trim().min(1),
    uri: z.string().optional().default(""),
    decimals: z.number().int().min(0).max(255).optional().default(6),
    enable_permanent_delegate: z.boolean().optional().default(false),
    enable_transfer_hook: z.boolean().optional().default(false),
    default_account_frozen: z.boolean().optional().default(false),
  })
  .strict();

const runtimeSchema = z
  .object({
    name: z.string().trim().min(1),
    symbol: z.string().trim().min(1),
    uri: z.string(),
    decimals: z.number().int().min(0).max(255),
    enablePermanentDelegate: z.boolean(),
    enableTransferHook: z.boolean(),
    defaultAccountFrozen: z.boolean(),
  })
  .strict();

function formatStrictSchemaError(error: z.ZodError): Error {
  const unknownFieldIssue = error.issues.find(issue => issue.code === "unrecognized_keys");
  if (unknownFieldIssue && "keys" in unknownFieldIssue) {
    return new Error(`Unknown config fields: ${unknownFieldIssue.keys.join(", ")}`);
  }

  return new Error(error.issues.map(issue => issue.message).join("; "));
}

function parseRawString(input: string, format: ConfigFormat): unknown {
  try {
    if (format === "json") {
      return JSON.parse(input);
    }

    return TOML.parse(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${format.toUpperCase()} config: ${message}`);
  }
}

function assertObjectRoot(input: unknown): void {
  if (input === null || Array.isArray(input) || typeof input !== "object") {
    throw new Error("Invalid config root: expected an object");
  }
}

function normalizeFileConfig(input: unknown): StablecoinConfig {
  assertObjectRoot(input);

  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) {
    throw formatStrictSchemaError(parsed.error);
  }

  return validateStablecoinConfig({
    name: parsed.data.name,
    symbol: parsed.data.symbol,
    uri: parsed.data.uri,
    decimals: parsed.data.decimals,
    enablePermanentDelegate: parsed.data.enable_permanent_delegate,
    enableTransferHook: parsed.data.enable_transfer_hook,
    defaultAccountFrozen: parsed.data.default_account_frozen,
  });
}

function inferFormat(filePath: string): ConfigFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".toml") {
    return "toml";
  }

  if (ext === ".json") {
    return "json";
  }

  throw new Error(`Unsupported config extension: ${ext || "(none)"}. Use .toml or .json`);
}

export function validateStablecoinConfig(config: unknown): StablecoinConfig {
  const parsed = runtimeSchema.safeParse(config);
  if (!parsed.success) {
    throw formatStrictSchemaError(parsed.error);
  }

  if (parsed.data.enablePermanentDelegate !== parsed.data.enableTransferHook) {
    throw new Error(
      "Invalid compliance extension config: enablePermanentDelegate and enableTransferHook must both be true or both be false"
    );
  }

  return parsed.data;
}

export function parseStablecoinConfigString(
  input: string,
  format: ConfigFormat
): StablecoinConfig {
  const raw = parseRawString(input, format);
  return normalizeFileConfig(raw);
}

export async function loadStablecoinConfigFile(
  filePath: string,
  format?: ConfigFormat
): Promise<StablecoinConfig> {
  const source = await fs.readFile(filePath, "utf8");
  return parseStablecoinConfigString(source, format ?? inferFormat(filePath));
}

export function resolveStablecoinConfig(input: {
  presetConfig?: PresetConfig | null;
  fileConfig?: StablecoinConfig | null;
  explicitOptions: Pick<CreateOptions, "name" | "symbol" | "uri" | "decimals" | "extensions">;
}): StablecoinConfig {
  const { presetConfig, fileConfig, explicitOptions } = input;

  const resolved = {
    name: explicitOptions.name ?? fileConfig?.name,
    symbol: explicitOptions.symbol ?? fileConfig?.symbol,
    uri: explicitOptions.uri ?? fileConfig?.uri ?? "",
    decimals: explicitOptions.decimals ?? fileConfig?.decimals ?? presetConfig?.decimals ?? 6,
    enablePermanentDelegate:
      explicitOptions.extensions?.permanentDelegate ??
      fileConfig?.enablePermanentDelegate ??
      presetConfig?.enablePermanentDelegate ??
      false,
    enableTransferHook:
      explicitOptions.extensions?.transferHook ??
      fileConfig?.enableTransferHook ??
      presetConfig?.enableTransferHook ??
      false,
    defaultAccountFrozen:
      explicitOptions.extensions?.defaultAccountFrozen ??
      fileConfig?.defaultAccountFrozen ??
      presetConfig?.defaultAccountFrozen ??
      false,
  };

  return validateStablecoinConfig(resolved);
}
