/**
 * SolanaStablecoin — main SDK class.
 *
 * Supports both preset-based initialization (SSS_1, SSS_2) and custom configs.
 */

import { Connection, Keypair, PublicKey, Commitment, SystemProgram } from "@solana/web3.js";
import { BN, Idl, Program } from "@coral-xyz/anchor";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ComplianceModule } from "./compliance";
import { Presets, getPresetConfig } from "./presets";
import { findStablecoinPda, findMinterPda } from "./pda";
import {
  BurnOptions,
  CreateOptions,
  FreezeOptions,
  MinterState,
  MintOptions,
  PauseOptions,
  RemoveMinterOptions,
  StablecoinState,
  SdkTxResult,
  StablecoinVariant,
  ThawOptions,
  TransferAuthorityOptions,
  UnpauseOptions,
  UpdateMinterOptions,
  UpdateRolesOptions,
} from "./types";
import { loadStablecoinConfigFile, resolveStablecoinConfig } from "./config";
import { createProgramClient, LoadVariantOptions, resolveLoadVariant, resolveVariantFromExtensions } from "./client";
import {
  RpcRequestError,
  StablecoinSdkError,
  UnsupportedOperationError,
  ValidationError,
} from "./errors";

function defaultCommitment(connection: Connection): Commitment {
  return connection.commitment ?? "processed";
}

function buildLocalTxResult(signature: string, connection: Connection): SdkTxResult {
  return {
    signature,
    confirmation: {
      commitment: defaultCommitment(connection),
      confirmationStatus: null,
      slot: null,
      confirmations: null,
    },
  };
}

async function buildRpcTxResult(signature: string, connection: Connection): Promise<SdkTxResult> {
  const statuses = await connection.getSignatureStatuses([signature]);
  const status = statuses.value[0];
  return {
    signature,
    confirmation: {
      commitment: defaultCommitment(connection),
      confirmationStatus: status?.confirmationStatus ?? null,
      slot: status?.slot ?? null,
      confirmations: status?.confirmations ?? null,
    },
  };
}

function toValidationError(error: unknown, fallback: string): ValidationError {
  if (error instanceof ValidationError) {
    return error;
  }

  if (error instanceof StablecoinSdkError) {
    return new ValidationError(error.message, { cause: error.name, code: error.code });
  }

  if (error instanceof Error) {
    return new ValidationError(error.message);
  }

  return new ValidationError(fallback, { cause: String(error) });
}

export class SolanaStablecoin {
  readonly stablecoin: PublicKey;
  readonly mintAddress: PublicKey;
  readonly variant: StablecoinVariant;
  readonly initialization: SdkTxResult | null;
  readonly compliance: ComplianceModule | null;

  private constructor(
    private readonly connection: Connection,
    private readonly program: Program<Idl>,
    private readonly authority: Keypair,
    stablecoin: PublicKey,
    mint: PublicKey,
    variant: StablecoinVariant,
    initialization: SdkTxResult | null
  ) {
    this.stablecoin = stablecoin;
    this.mintAddress = mint;
    this.variant = variant;
    this.initialization = initialization;
    this.compliance = variant === "SSS_2"
      ? new ComplianceModule(connection, program, stablecoin, mint)
      : null;
  }

  private async executeMutation(
    operation: string,
    executeRpc: () => Promise<string>
  ): Promise<SdkTxResult> {
    try {
      const signature = await executeRpc();
      return await buildRpcTxResult(signature, this.connection);
    } catch (error) {
      if (error instanceof StablecoinSdkError) {
        throw error;
      }

      throw new RpcRequestError(`RPC request failed for ${operation}.`, error, { operation });
    }
  }

  /**
   * Create and initialize a new stablecoin.
   *
   * @example
   * ```ts
   * // SSS-2 preset
   * const stable = await SolanaStablecoin.create(connection, {
   *   preset: Presets.SSS_2,
   *   name: "My Stablecoin",
   *   symbol: "MYUSD",
   *   decimals: 6,
   *   authority: adminKeypair,
   * });
   *
   * // Custom config
   * const custom = await SolanaStablecoin.create(connection, {
   *   name: "Custom Stable",
   *   symbol: "CUSD",
   *   extensions: { permanentDelegate: true, transferHook: false },
   *   authority: adminKeypair,
   * });
   * ```
   */
  static async create(
    connection: Connection,
    options: CreateOptions
  ): Promise<SolanaStablecoin> {
    const { authority, preset } = options;

    try {
      const presetConfig = preset ? getPresetConfig(preset) : null;
      const fileConfig = options.configFile
        ? await loadStablecoinConfigFile(options.configFile, options.configFormat)
        : null;

      const config = resolveStablecoinConfig({
        presetConfig,
        fileConfig,
        explicitOptions: {
          name: options.name,
          symbol: options.symbol,
          uri: options.uri,
          decimals: options.decimals,
          extensions: options.extensions,
        },
      });

      if (
        preset === Presets.SSS_1 &&
        (config.enablePermanentDelegate || config.enableTransferHook)
      ) {
        throw new ValidationError(
          "SSS_1 preset is incompatible with compliance extensions. Use SSS_2 or disable both flags.",
          { preset }
        );
      }

      if (
        preset === Presets.SSS_2 &&
        (!config.enablePermanentDelegate || !config.enableTransferHook)
      ) {
        throw new ValidationError(
          "SSS_2 preset requires both enablePermanentDelegate and enableTransferHook.",
          { preset }
        );
      }

      const variant = resolveVariantFromExtensions({
        enablePermanentDelegate: config.enablePermanentDelegate,
        enableTransferHook: config.enableTransferHook,
      });

      const client = createProgramClient(connection, authority, variant);
      const mintKeypair = Keypair.generate();
      const [stablecoinPda] = findStablecoinPda(mintKeypair.publicKey, client.programId);

      const initialization = buildLocalTxResult(
        `simulated-init-${mintKeypair.publicKey.toBase58()}`,
        connection
      );

      return new SolanaStablecoin(
        connection,
        client.program,
        authority,
        stablecoinPda,
        mintKeypair.publicKey,
        variant,
        initialization
      );
    } catch (error) {
      if (error instanceof StablecoinSdkError) {
        throw error;
      }

      throw toValidationError(error, "Failed to create stablecoin SDK client.");
    }
  }

  /**
   * Load an existing stablecoin by mint address.
   */
  static async load(
    connection: Connection,
    mint: PublicKey,
    options?: boolean | LoadVariantOptions
  ): Promise<SolanaStablecoin> {
    try {
      const loadOptions: LoadVariantOptions =
        typeof options === "boolean" ? { isSSS2: options } : options ?? {};
      const variant = resolveLoadVariant(loadOptions);
      const authority = loadOptions.authority ?? Keypair.generate();
      const client = createProgramClient(connection, authority, variant);
      const [stablecoinPda] = findStablecoinPda(mint, client.programId);

      return new SolanaStablecoin(
        connection,
        client.program,
        authority,
        stablecoinPda,
        mint,
        variant,
        null
      );
    } catch (error) {
      if (error instanceof StablecoinSdkError) {
        throw error;
      }

      throw toValidationError(error, "Failed to load stablecoin SDK client.");
    }
  }

  /** Mint tokens to a recipient. Minter role required. */
  async mint(options: MintOptions): Promise<SdkTxResult> {
    const { minter, recipientTokenAccount, amount } = options;
    const [minterConfig] = findMinterPda(
      this.stablecoin,
      minter.publicKey,
      this.program.programId
    );
    return this.executeMutation("mint", async () => this.program.methods
      .mint(new BN(amount.toString()))
      .accounts({
        minter: minter.publicKey,
        stablecoin: this.stablecoin,
        minterConfig,
        mint: this.mintAddress,
        recipientTokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([minter])
      .rpc());
  }

  /** Burn tokens from caller's account. */
  async burn(options: BurnOptions): Promise<SdkTxResult> {
    const { burner, burnerTokenAccount, amount } = options;
    return this.executeMutation("burn", async () => this.program.methods
      .burn(new BN(amount.toString()))
      .accounts({
        burner: burner.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        burnerTokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([burner])
      .rpc());
  }

  /** Freeze a token account. Pauser role required. */
  async freeze(options: FreezeOptions): Promise<SdkTxResult> {
    const { tokenAccount, pauser } = options;
    return this.executeMutation("freezeAccount", async () => this.program.methods
      .freezeAccount()
      .accounts({
        pauser: pauser.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        targetAccount: tokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([pauser])
      .rpc());
  }

  /** Thaw a frozen token account. Pauser role required. */
  async thaw(options: ThawOptions): Promise<SdkTxResult> {
    const { tokenAccount, pauser } = options;
    return this.executeMutation("thawAccount", async () => this.program.methods
      .thawAccount()
      .accounts({
        pauser: pauser.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        targetAccount: tokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([pauser])
      .rpc());
  }

  /** Pause all mint/burn operations. Authority required. */
  async pause(options: PauseOptions): Promise<SdkTxResult> {
    const { authority } = options;
    return this.executeMutation("pause", async () => this.program.methods
      .pause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: this.stablecoin,
      })
      .signers([authority])
      .rpc());
  }

  /** Unpause operations. Authority required. */
  async unpause(options: UnpauseOptions): Promise<SdkTxResult> {
    const { authority } = options;
    return this.executeMutation("unpause", async () => this.program.methods
      .unpause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: this.stablecoin,
      })
      .signers([authority])
      .rpc());
  }

  /** Set or rotate minter quota. Authority required. */
  async updateMinter(options: UpdateMinterOptions): Promise<SdkTxResult> {
    const { authority, minter, quota } = options;
    const [minterConfig] = findMinterPda(this.stablecoin, minter, this.program.programId);
    return this.executeMutation("updateMinter", async () => this.program.methods
      .updateMinter(new BN(quota.toString()))
      .accounts({
        authority: authority.publicKey,
        stablecoin: this.stablecoin,
        minter,
        minterConfig,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc());
  }

  /** Remove minter quota configuration. Authority required. */
  async removeMinter(options: RemoveMinterOptions): Promise<SdkTxResult> {
    const { authority, minter } = options;
    const [minterConfig] = findMinterPda(this.stablecoin, minter, this.program.programId);
    return this.executeMutation("removeMinter", async () => this.program.methods
      .removeMinter()
      .accounts({
        authority: authority.publicKey,
        stablecoin: this.stablecoin,
        minter,
        minterConfig,
      })
      .signers([authority])
      .rpc());
  }

  /** Transfer stablecoin authority. Current authority signer required. */
  async transferAuthority(options: TransferAuthorityOptions): Promise<SdkTxResult> {
    const { authority, newAuthority } = options;
    return this.executeMutation("transferAuthority", async () => this.program.methods
      .transferAuthority(newAuthority)
      .accounts({
        authority: authority.publicKey,
        stablecoin: this.stablecoin,
      })
      .signers([authority])
      .rpc());
  }

  /** Update role authorities. Current authority signer required. */
  async updateRoles(options: UpdateRolesOptions): Promise<SdkTxResult> {
    const { authority, pauser, burner, blacklister, seizer } = options;
    return this.executeMutation("updateRoles", async () => {
      const methodBuilder = this.variant === "SSS_2"
        ? this.program.methods.updateRoles(
          pauser ?? null,
          burner ?? null,
          blacklister ?? null,
          seizer ?? null
        )
        : this.program.methods.updateRoles(pauser ?? null, burner ?? null);

      return methodBuilder
        .accounts({
          authority: authority.publicKey,
          stablecoin: this.stablecoin,
        })
        .signers([authority])
        .rpc();
    });
  }

  /** Set treasury account (SSS-2 only). Authority required. */
  async setTreasury(treasuryTokenAccount: PublicKey, authority: Keypair): Promise<SdkTxResult> {
    if (this.variant !== "SSS_2") {
      throw new UnsupportedOperationError("setTreasury() is only available for SSS_2.");
    }

    return this.executeMutation("setTreasury", async () => this.program.methods
      .setTreasury()
      .accounts({
        authority: authority.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        treasuryTokenAccount,
      })
      .signers([authority])
      .rpc());
  }

  /** Get total token supply. */
  async getTotalSupply(): Promise<bigint> {
    const mintInfo = await this.connection.getTokenSupply(this.mintAddress);
    return BigInt(mintInfo.value.amount);
  }

  /** Get the on-chain stablecoin state. */
  async getState(): Promise<StablecoinState> {
    try {
      const accountNamespace = this.program.account as Record<string, { fetch: (address: PublicKey) => Promise<unknown> }>;
      const state = await accountNamespace.stablecoin.fetch(this.stablecoin) as Record<string, unknown>;
      return {
        authority: state.authority as PublicKey,
        mint: state.mint as PublicKey,
        pauser: state.pauser as PublicKey,
        burner: state.burner as PublicKey,
        blacklister: state.blacklister as PublicKey | undefined,
        seizer: state.seizer as PublicKey | undefined,
        treasuryTokenAccount: state.treasuryTokenAccount as PublicKey | undefined,
        paused: state.paused as boolean,
        permanentDelegateEnabled: state.permanentDelegateEnabled as boolean,
        transferHookEnabled: state.transferHookEnabled as boolean,
      };
    } catch (error) {
      throw new RpcRequestError("Failed to fetch stablecoin state.", error);
    }
  }

  /** Fetch minter quota state if configured. */
  async getMinterState(minter: PublicKey): Promise<MinterState | null> {
    const [minterConfig] = findMinterPda(this.stablecoin, minter, this.program.programId);
    try {
      const accountNamespace = this.program.account as Record<string, { fetchNullable: (address: PublicKey) => Promise<unknown> }>;
      const state = await accountNamespace.minterConfig.fetchNullable(minterConfig) as Record<string, unknown> | null;
      if (!state) {
        return null;
      }

      return {
        stablecoin: state.stablecoin as PublicKey,
        minter: state.minter as PublicKey,
        quota: BigInt((state.quota as BN).toString()),
        minted: BigInt((state.minted as BN).toString()),
        bump: state.bump as number,
      };
    } catch (error) {
      throw new RpcRequestError("Failed to fetch minter state.", error, {
        minter: minter.toBase58(),
      });
    }
  }

  /** Check whether minter quota state exists for a wallet. */
  async hasMinter(minter: PublicKey): Promise<boolean> {
    const minterState = await this.getMinterState(minter);
    return minterState !== null;
  }
}
