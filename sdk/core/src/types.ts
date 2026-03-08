/**
 * Shared types for the SSS SDK.
 */

import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

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
  /** Use a preset (SSS_1 or SSS_2) or provide a custom config */
  preset?: "SSS_1" | "SSS_2";
  /** Custom config — merged with preset defaults if preset is also set */
  name: string;
  symbol: string;
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
