/**
 * Shared test helpers.
 */

import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";

export const STABLECOIN_SEED = Buffer.from("stablecoin");
export const MINTER_SEED = Buffer.from("minter");
export const TOKEN_2022_PROGRAM = TOKEN_2022_PROGRAM_ID;
export const ASSOCIATED_TOKEN_PROGRAM = ASSOCIATED_TOKEN_PROGRAM_ID;
export const RENT_SYSVAR = SYSVAR_RENT_PUBKEY;
export const SYSTEM_PROGRAM = SystemProgram.programId;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function airdrop(
  connection: Connection,
  address: PublicKey,
  lamports = 2e9
): Promise<void> {
  const sig = await connection.requestAirdrop(address, lamports);
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );
}

export function newKeypair(): Keypair {
  return Keypair.generate();
}

export function findStablecoinPda(
  mint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STABLECOIN_SEED, mint.toBuffer()],
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

export async function createToken2022Ata(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      owner,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );
  await anchor.web3.sendAndConfirmTransaction(connection, tx, [payer]);
  return ata;
}

export async function fetchToken2022Account(
  connection: Connection,
  address: PublicKey
) {
  return getAccount(connection, address, "confirmed", TOKEN_2022_PROGRAM_ID);
}

export async function fetchToken2022Mint(
  connection: Connection,
  mint: PublicKey
) {
  return getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
}

export async function expectAnchorError(
  action: Promise<unknown>,
  expected: string
): Promise<void> {
  try {
    await action;
    throw new Error(`Expected error ${expected}`);
  } catch (error) {
    const message = String(error);
    const anchorError = error as {
      error?: { errorCode?: { code?: string } };
      logs?: string[];
    };
    const code = anchorError.error?.errorCode?.code;
    const logs = anchorError.logs?.join("\n") ?? "";
    expect(
      code === expected || message.includes(expected) || logs.includes(expected),
      `Expected ${expected}, got ${message}`
    ).to.eq(true);
  }
}

export function toSignerArray(...signers: Signer[]): Signer[] {
  return signers;
}

export async function confirmSignature(
  connection: Connection,
  signature: string
): Promise<void> {
  await connection.confirmTransaction(signature, "confirmed");
}
