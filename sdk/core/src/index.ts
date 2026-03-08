/**
 * Solana Stablecoin Standard (SSS) SDK
 *
 * Modular SDK for issuing and managing stablecoins on Solana using Token-2022.
 * Provides opinionated presets for the most common stablecoin architectures.
 *
 * Standards:
 * - SSS-1: Minimal stablecoin — mint + freeze + metadata. Internal tokens, DAO treasuries.
 * - SSS-2: Compliant stablecoin — SSS-1 + permanent delegate + transfer hook + blacklist.
 *
 * @example
 * ```ts
 * import { SolanaStablecoin, Presets } from "@stbr/sss-token";
 *
 * // SSS-2 compliant stablecoin
 * const stable = await SolanaStablecoin.create(connection, {
 *   preset: Presets.SSS_2,
 *   name: "My Stablecoin",
 *   symbol: "MYUSD",
 *   decimals: 6,
 *   authority: adminKeypair,
 * });
 *
 * await stable.mint({ recipient, amount: 1_000_000, minter });
 * await stable.compliance.blacklistAdd(address, "OFAC match");
 * await stable.compliance.seize(frozenAccount, treasury);
 * ```
 *
 * @packageDocumentation
 */

export * from "./stablecoin";
export * from "./compliance";
export * from "./pda";
export * from "./presets";
export * from "./types";

// Re-export common types
export { BN } from "@coral-xyz/anchor";
export { PublicKey, Connection, Keypair } from "@solana/web3.js";
