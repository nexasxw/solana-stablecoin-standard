/**
 * SSS-2 compliance module — blacklist management and seizure.
 *
 * Only available when the stablecoin was initialized with SSS-2 preset
 * (enableTransferHook = true, enablePermanentDelegate = true).
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { findBlacklistEntryPda } from "./pda";
import { UnsupportedOperationError } from "./errors";
import { ComplianceTxResult } from "./types";

export class ComplianceModule {
  constructor(
    private readonly connection: Connection,
    private readonly program: Program,
    private readonly stablecoin: PublicKey,
    private readonly mint: PublicKey,
    private readonly options: { enabled?: boolean } = {}
  ) {}

  private assertSupported(operation: ComplianceTxResult["operation"]): void {
    if (this.options.enabled === false) {
      throw new UnsupportedOperationError(
        "Compliance helpers are only available for SSS-2 deployments.",
        { operation }
      );
    }
  }

  private buildTxResult(
    operation: ComplianceTxResult["operation"],
    signature: string
  ): ComplianceTxResult {
    return {
      operation,
      signature,
      confirmation: {
        commitment: this.connection.commitment ?? "processed",
        confirmationStatus: null,
        slot: null,
        confirmations: null,
      },
    };
  }

  /**
   * Add an address to the blacklist.
   * Requires blacklister role (or authority).
   */
  async blacklistAdd(
    address: PublicKey,
    reason: string,
    blacklister: Keypair
  ): Promise<ComplianceTxResult> {
    this.assertSupported("blacklistAdd");

    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      address,
      this.program.programId
    );

    const signature = await this.program.methods
      .addToBlacklist(reason)
      .accounts({
        blacklister: blacklister.publicKey,
        stablecoin: this.stablecoin,
        address,
        blacklistEntry,
      })
      .signers([blacklister])
      .rpc();

    return this.buildTxResult("blacklistAdd", signature);
  }

  /**
   * Remove an address from the blacklist.
   * Requires blacklister role (or authority).
   */
  async blacklistRemove(
    address: PublicKey,
    blacklister: Keypair
  ): Promise<ComplianceTxResult> {
    this.assertSupported("blacklistRemove");

    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      address,
      this.program.programId
    );

    const signature = await this.program.methods
      .removeFromBlacklist()
      .accounts({
        blacklister: blacklister.publicKey,
        stablecoin: this.stablecoin,
        address,
        blacklistEntry,
      })
      .signers([blacklister])
      .rpc();

    return this.buildTxResult("blacklistRemove", signature);
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
    targetOwner: PublicKey,
    treasuryTokenAccount: PublicKey,
    seizer: Keypair
  ): Promise<ComplianceTxResult> {
    this.assertSupported("seize");

    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      targetOwner,
      this.program.programId
    );

    const signature = await this.program.methods
      .seize()
      .accounts({
        seizer: seizer.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mint,
        fromTokenAccount,
        targetOwner,
        treasuryTokenAccount,
        blacklistEntry,
      })
      .signers([seizer])
      .rpc();

    return this.buildTxResult("seize", signature);
  }
}
