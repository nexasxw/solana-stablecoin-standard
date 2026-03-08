/**
 * Standard preset configurations.
 *
 * Think OpenZeppelin: the SDK is the library, SSS-1/SSS-2 are the standards.
 * The library makes them easy to deploy, the standards are what get adopted.
 */

import { StablecoinConfig } from "./types";

export enum Presets {
  SSS_1 = "SSS_1",
  SSS_2 = "SSS_2",
}

/**
 * SSS-1: Minimal Stablecoin
 *
 * Mint authority + freeze authority + metadata.
 * What's needed on every stable, nothing more.
 *
 * Token-2022 extensions: MintCloseAuthority, MetadataPointer, TokenMetadata
 */
export const SSS1_CONFIG: Omit<StablecoinConfig, "name" | "symbol" | "uri"> = {
  decimals: 6,
  enablePermanentDelegate: false,
  enableTransferHook: false,
  defaultAccountFrozen: false,
};

/**
 * SSS-2: Compliant Stablecoin
 *
 * SSS-1 + permanent delegate + transfer hook + blacklist enforcement.
 * For regulated stablecoins — USDC/USDT-class tokens.
 *
 * Token-2022 extensions: all SSS-1 + PermanentDelegate + TransferHook
 */
export const SSS2_CONFIG: Omit<StablecoinConfig, "name" | "symbol" | "uri"> = {
  decimals: 6,
  enablePermanentDelegate: true,
  enableTransferHook: true,
  defaultAccountFrozen: false,
};

export function getPresetConfig(
  preset: Presets
): Omit<StablecoinConfig, "name" | "symbol" | "uri"> {
  switch (preset) {
    case Presets.SSS_1:
      return SSS1_CONFIG;
    case Presets.SSS_2:
      return SSS2_CONFIG;
  }
}
