/**
 * Shared types for the SSS SDK.
 */

import { PublicKey, Keypair, Commitment, TransactionConfirmationStatus } from "@solana/web3.js";
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
  recipientTokenAccount: PublicKey;
  amount: bigint;
  minter: Keypair;
}

export interface BurnOptions {
  burnerTokenAccount: PublicKey;
  amount: bigint;
  burner: Keypair;
}

export interface FreezeOptions {
  tokenAccount: PublicKey;
  pauser: Keypair;
}

export interface ThawOptions {
  tokenAccount: PublicKey;
  pauser: Keypair;
}

export interface PauseOptions {
  authority: Keypair;
}

export interface UnpauseOptions {
  authority: Keypair;
}

export interface UpdateMinterOptions {
  authority: Keypair;
  minter: PublicKey;
  quota: bigint;
}

export interface RemoveMinterOptions {
  authority: Keypair;
  minter: PublicKey;
}

export interface TransferAuthorityOptions {
  authority: Keypair;
  newAuthority: PublicKey;
}

export interface UpdateRolesOptions {
  authority: Keypair;
  pauser?: PublicKey | null;
  burner?: PublicKey | null;
  blacklister?: PublicKey | null;
  seizer?: PublicKey | null;
}

export type StablecoinVariant = "SSS_1" | "SSS_2";

export interface TxConfirmationMetadata {
  commitment: Commitment;
  confirmationStatus: TransactionConfirmationStatus | null;
  slot: number | null;
  confirmations: number | null;
}

export interface SdkTxResult {
  signature: string;
  confirmation: TxConfirmationMetadata;
}

export type ComplianceMutationKind = "blacklistAdd" | "blacklistRemove" | "seize";

export interface ComplianceTxResult extends SdkTxResult {
  operation: ComplianceMutationKind;
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
  blacklister?: PublicKey;
  seizer?: PublicKey;
  treasuryTokenAccount?: PublicKey;
  paused: boolean;
  permanentDelegateEnabled: boolean;
  transferHookEnabled: boolean;
}

export interface MinterState {
  stablecoin: PublicKey;
  minter: PublicKey;
  quota: bigint;
  minted: bigint;
  bump: number;
}
