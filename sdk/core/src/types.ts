/**
 * Shared types for the SSS SDK.
 */

import { PublicKey, Keypair } from "@solana/web3.js";

export interface StablecoinConfig {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
}

export interface CreateOptions {
  /** Use a preset (SSS_1 or SSS_2) or provide a custom config. Runtime validation rejects unknown values. */
  preset?: "SSS_1" | "SSS_2";
  /** Optional config file path (.toml or .json) */
  configFile?: string;
  /** Optional config file format override */
  configFormat?: "toml" | "json";
  /** Custom config — merged with preset/file defaults; required unless provided by config file */
  name?: string;
  symbol?: string;
  uri?: string;
  decimals?: number;
  extensions?: {
    permanentDelegate?: boolean;
    transferHook?: boolean;
    defaultAccountFrozen?: boolean;
  };
  authority: Keypair;
}

export interface MintOptions {
  recipient: PublicKey;
  amount: number | bigint;
  minter: Keypair;
}

export interface BurnOptions {
  amount: number | bigint;
  burner: Keypair;
}

export interface StablecoinState {
  authority: PublicKey;
  mint: PublicKey;
  pauser: PublicKey;
  burner: PublicKey;
  paused: boolean;
  permanentDelegateEnabled: boolean;
  transferHookEnabled: boolean;
}
