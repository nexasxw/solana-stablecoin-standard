/**
 * SSS-2 compliance module — blacklist management and seizure.
 *
 * Only available when the stablecoin was initialized with SSS-2 preset
 * (enableTransferHook = true, enablePermanentDelegate = true).
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { findBlacklistEntryPda } from "./pda";
import {
  InvalidArgumentError,
  InvalidReasonError,
  MissingSignerError,
  RpcRequestError,
  StablecoinSdkError,
  UnsupportedOperationError,
} from "./errors";
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

  private ensurePublicKey(input: unknown, field: string): PublicKey {
    if (!(input instanceof PublicKey)) {
      throw new InvalidArgumentError(`Expected ${field} to be a PublicKey.`, { field });
    }

    return input;
  }

  private ensureSigner(input: unknown, field: string): Keypair {
    if (!(input instanceof Keypair)) {
      throw new MissingSignerError(`Expected ${field} to be a Keypair signer.`, { field });
    }

    return input;
  }

  private ensureReason(reason: unknown): string {
    if (typeof reason !== "string") {
      throw new InvalidReasonError("Expected reason to be a string.", {
        field: "reason",
        receivedType: typeof reason,
      });
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new InvalidReasonError(
        "blacklistAdd requires a non-empty trimmed reason.",
        { field: "reason" }
      );
    }

    return trimmedReason;
  }

  private async executeMutation(
    operation: ComplianceTxResult["operation"],
    executeRpc: () => Promise<string>
  ): Promise<ComplianceTxResult> {
    try {
      const signature = await executeRpc();
      return this.buildTxResult(operation, signature);
    } catch (error) {
      if (error instanceof StablecoinSdkError) {
        throw error;
      }

      throw new RpcRequestError(
        `Compliance RPC request failed for ${operation}.`,
        error,
        { operation }
      );
    }
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
    const validatedAddress = this.ensurePublicKey(address, "address");
    const validatedBlacklister = this.ensureSigner(blacklister, "blacklister");
    const validatedReason = this.ensureReason(reason);

    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      validatedAddress,
      this.program.programId
    );

    return this.executeMutation("blacklistAdd", async () => this.program.methods
      .addToBlacklist(validatedReason)
      .accounts({
        blacklister: validatedBlacklister.publicKey,
        stablecoin: this.stablecoin,
        address: validatedAddress,
        blacklistEntry,
      })
      .signers([validatedBlacklister])
      .rpc());
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
    const validatedAddress = this.ensurePublicKey(address, "address");
    const validatedBlacklister = this.ensureSigner(blacklister, "blacklister");

    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      validatedAddress,
      this.program.programId
    );

    return this.executeMutation("blacklistRemove", async () => this.program.methods
      .removeFromBlacklist()
      .accounts({
        blacklister: validatedBlacklister.publicKey,
        stablecoin: this.stablecoin,
        address: validatedAddress,
        blacklistEntry,
      })
      .signers([validatedBlacklister])
      .rpc());
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
    const validatedFromTokenAccount = this.ensurePublicKey(fromTokenAccount, "fromTokenAccount");
    const validatedTargetOwner = this.ensurePublicKey(targetOwner, "targetOwner");
    const validatedTreasuryTokenAccount = this.ensurePublicKey(treasuryTokenAccount, "treasuryTokenAccount");
    const validatedSeizer = this.ensureSigner(seizer, "seizer");

    const [blacklistEntry] = findBlacklistEntryPda(
      this.stablecoin,
      validatedTargetOwner,
      this.program.programId
    );

    return this.executeMutation("seize", async () => this.program.methods
      .seize()
      .accounts({
        seizer: validatedSeizer.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mint,
        fromTokenAccount: validatedFromTokenAccount,
        targetOwner: validatedTargetOwner,
        treasuryTokenAccount: validatedTreasuryTokenAccount,
        blacklistEntry,
      })
      .signers([validatedSeizer])
      .rpc());
  }
}
