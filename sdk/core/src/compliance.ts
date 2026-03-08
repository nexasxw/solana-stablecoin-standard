/**
 * SSS-2 compliance module — blacklist management and seizure.
 *
 * Only available when the stablecoin was initialized with SSS-2 preset
 * (enableTransferHook = true, enablePermanentDelegate = true).
 */

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { findBlacklistEntryPda } from "./pda";

export class ComplianceModule {
  constructor(
    private readonly connection: Connection,
    private readonly program: Program,
    private readonly stablecoin: PublicKey,
    private readonly mint: PublicKey
  ) {}

  /**
   * Add an address to the blacklist.
   * Requires blacklister role (or authority).
   */
  async blacklistAdd(
    address: PublicKey,
    reason: string,
    blacklister: Keypair
  ): Promise<string> {
    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      address,
      this.program.programId
    );

    return this.program.methods
      .addToBlacklist(reason)
      .accounts({
        blacklister: blacklister.publicKey,
        stablecoin: this.stablecoin,
        address,
        blacklistEntry,
      })
      .signers([blacklister])
      .rpc();
  }

  /**
   * Remove an address from the blacklist.
   * Requires blacklister role (or authority).
   */
  async blacklistRemove(
    address: PublicKey,
    blacklister: Keypair
  ): Promise<string> {
    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      address,
      this.program.programId
    );

    return this.program.methods
      .removeFromBlacklist()
      .accounts({
        blacklister: blacklister.publicKey,
        stablecoin: this.stablecoin,
        address,
        blacklistEntry,
      })
      .signers([blacklister])
      .rpc();
  }

  /**
   * Check if an address is blacklisted.
   */
  async isBlacklisted(address: PublicKey): Promise<boolean> {
    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      address,
      this.program.programId
    );
    const account = await this.connection.getAccountInfo(blacklistEntry);
    return account !== null;
  }

  /**
   * Seize tokens from a frozen/blacklisted account to treasury.
   * Requires seizer role (or authority). Uses permanent delegate.
   */
  async seize(
    fromTokenAccount: PublicKey,
    treasuryTokenAccount: PublicKey,
    seizer: Keypair
  ): Promise<string> {
    return this.program.methods
      .seize()
      .accounts({
        seizer: seizer.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mint,
        fromTokenAccount,
        treasuryTokenAccount,
      })
      .signers([seizer])
      .rpc();
  }
}
