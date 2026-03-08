/**
 * Shared test helpers.
 */

import * as anchor from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function airdrop(
  connection: Connection,
  address: PublicKey,
  lamports = 2e9
): Promise<void> {
  const sig = await connection.requestAirdrop(address, lamports);
  await connection.confirmTransaction(sig);
}

export function newKeypair(): Keypair {
  return Keypair.generate();
}
