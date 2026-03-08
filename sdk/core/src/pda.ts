/**
 * PDA derivation utilities for SSS programs.
 */

import { PublicKey } from "@solana/web3.js";

const STABLECOIN_SEED = Buffer.from("stablecoin");
const MINTER_SEED = Buffer.from("minter");
const BLACKLIST_SEED = Buffer.from("blacklist");

export function findStablecoinPda(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STABLECOIN_SEED, authority.toBuffer()],
    programId
  );
}

export function findMinterPda(
  stablecoin: PublicKey,
  minter: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MINTER_SEED, stablecoin.toBuffer(), minter.toBuffer()],
    programId
  );
}

export function findBlacklistEntryPda(
  stablecoin: PublicKey,
  address: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BLACKLIST_SEED, stablecoin.toBuffer(), address.toBuffer()],
    programId
  );
}

export function findExtraAccountMetasPda(
  mint: PublicKey,
  hookProgramId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mint.toBuffer()],
    hookProgramId
  );
}
