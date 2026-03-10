/**
 * Shared types for the SSS SDK.
 */

import { PublicKey, Keypair, Commitment, ConfirmationStatus } from "@solana/web3.js";
import type { SolanaStablecoin } from "./stablecoin";

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

export type StablecoinVariant = "SSS_1" | "SSS_2";

export interface TxConfirmationMetadata {
  commitment: Commitment;
  confirmationStatus: ConfirmationStatus | null;
  slot: number | null;
  confirmations: number | null;
}

export interface SdkTxResult {
  signature: string;
  confirmation: TxConfirmationMetadata;
}

export interface CreateStablecoinResult {
  stablecoin: SolanaStablecoin;
  initialization: SdkTxResult;
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
