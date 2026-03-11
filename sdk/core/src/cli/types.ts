import { Connection, PublicKey } from "@solana/web3.js";

export type CliVariant = "SSS_1" | "SSS_2";
export type CliOutputMode = "human" | "json";

export interface CliGlobalOptions {
  config?: string;
  rpcUrl?: string;
  mint?: string;
  variant?: string;
  json?: boolean;
  yes?: boolean;
}

export interface CliRuntimeDefaults {
  rpcUrl: string;
  mint: PublicKey | null;
  variant: CliVariant | null;
  output: CliOutputMode;
  confirmBypass: boolean;
}

export interface CliCommandContext {
  connection: Connection;
  options: CliGlobalOptions;
  runtime: CliRuntimeDefaults;
}

export interface CliContextRequirements {
  mint?: boolean;
  variant?: boolean;
}
