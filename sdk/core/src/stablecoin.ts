/**
 * SolanaStablecoin — main SDK class.
 *
 * Supports both preset-based initialization (SSS_1, SSS_2) and custom configs.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Commitment,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { BN, Idl, Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ComplianceModule } from "./compliance";
import { Presets, getPresetConfig } from "./presets";
import { findExtraAccountMetasPda, findStablecoinPda, findMinterPda } from "./pda";
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
  InvalidAmountError,
  InvalidArgumentError,
  MissingSignerError,
  RpcRequestError,
  StablecoinSdkError,
  UnsupportedOperationError,
  ValidationError,
} from "./errors";

function defaultCommitment(connection: Connection): Commitment {
  return connection.commitment ?? "processed";
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

const U64_MAX = (1n << 64n) - 1n;
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("SSSHook111111111111111111111111111111111111");

interface InitializeExecutorInput {
  client: ReturnType<typeof createProgramClient>;
  connection: Connection;
  authority: Keypair;
  mintKeypair: Keypair;
  stablecoin: PublicKey;
  config: {
    name: string;
    symbol: string;
    uri: string;
    decimals: number;
    enablePermanentDelegate: boolean;
    enableTransferHook: boolean;
  };
}

function ensurePublicKey(input: unknown, field: string): PublicKey {
  if (!(input instanceof PublicKey)) {
    throw new InvalidArgumentError(`Expected ${field} to be a PublicKey.`, { field });
  }

  return input;
}

function ensureSigner(input: unknown, field: string): Keypair {
  if (!(input instanceof Keypair)) {
    throw new MissingSignerError(`Expected ${field} to be a Keypair signer.`, { field });
  }

  return input;
}

function ensureU64Amount(input: unknown, field: string): BN {
  if (typeof input !== "bigint") {
    throw new InvalidAmountError(`Expected ${field} to be a bigint.`, {
      field,
      receivedType: typeof input,
    });
  }

  if (input < 0n) {
    throw new InvalidAmountError(`${field} must be non-negative.`, { field, amount: input.toString() });
  }

  if (input > U64_MAX) {
    throw new InvalidAmountError(`${field} exceeds max u64 range.`, {
      field,
      amount: input.toString(),
      max: U64_MAX.toString(),
    });
  }

  return new BN(input.toString());
}

export class SolanaStablecoin {
  private static createProgramClientFactory: typeof createProgramClient = createProgramClient;
  private static initializeExecutor = SolanaStablecoin.defaultInitializeExecutor;

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

  private static async defaultInitializeExecutor(
    input: InitializeExecutorInput
  ): Promise<SdkTxResult> {
    const initializeConfig = {
      name: input.config.name,
      symbol: input.config.symbol,
      uri: input.config.uri,
      decimals: input.config.decimals,
      enable_permanent_delegate: input.config.enablePermanentDelegate,
      enable_transfer_hook: input.config.enableTransferHook,
    };

    const accounts: Record<string, PublicKey> = {
      authority: input.authority.publicKey,
      stablecoin: input.stablecoin,
      mint: input.mintKeypair.publicKey,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };

    if (input.client.variant === "SSS_2") {
      const [extraAccountMetaList] = findExtraAccountMetasPda(
        input.mintKeypair.publicKey,
        TRANSFER_HOOK_PROGRAM_ID
      );

      accounts.extraAccountMetaList = extraAccountMetaList;
      accounts.transferHookProgram = TRANSFER_HOOK_PROGRAM_ID;
      accounts.associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
    }

    try {
      const signature = await input.client.program.methods
        .initialize(initializeConfig)
        .accounts(accounts)
        .signers([input.authority, input.mintKeypair])
        .rpc();

      return await buildRpcTxResult(signature, input.connection);
    } catch (error) {
      throw new RpcRequestError("RPC request failed for initialize.", error, {
        operation: "initialize",
      });
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

      const client = SolanaStablecoin.createProgramClientFactory(connection, authority, variant);
      const mintKeypair = Keypair.generate();
      const [stablecoinPda] = findStablecoinPda(mintKeypair.publicKey, client.programId);

      const initialization = await SolanaStablecoin.initializeExecutor({
        client,
        connection,
        authority,
        mintKeypair,
        stablecoin: stablecoinPda,
        config: {
          name: config.name,
          symbol: config.symbol,
          uri: config.uri,
          decimals: config.decimals,
          enablePermanentDelegate: config.enablePermanentDelegate,
          enableTransferHook: config.enableTransferHook,
        },
      });

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
      const client = SolanaStablecoin.createProgramClientFactory(connection, authority, variant);
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
    const minter = ensureSigner(options.minter, "minter");
    const recipientTokenAccount = ensurePublicKey(options.recipientTokenAccount, "recipientTokenAccount");
    const amount = ensureU64Amount(options.amount, "amount");
    const [minterConfig] = findMinterPda(
      this.stablecoin,
      minter.publicKey,
      this.program.programId
    );
    return this.executeMutation("mint", async () => this.program.methods
      .mint(amount)
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
    const burner = ensureSigner(options.burner, "burner");
    const burnerTokenAccount = ensurePublicKey(options.burnerTokenAccount, "burnerTokenAccount");
    const amount = ensureU64Amount(options.amount, "amount");
    return this.executeMutation("burn", async () => this.program.methods
      .burn(amount)
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
    const tokenAccount = ensurePublicKey(options.tokenAccount, "tokenAccount");
    const pauser = ensureSigner(options.pauser, "pauser");
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
    const tokenAccount = ensurePublicKey(options.tokenAccount, "tokenAccount");
    const pauser = ensureSigner(options.pauser, "pauser");
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
    const authority = ensureSigner(options.authority, "authority");
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
    const authority = ensureSigner(options.authority, "authority");
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
    const authority = ensureSigner(options.authority, "authority");
    const minter = ensurePublicKey(options.minter, "minter");
    const quota = ensureU64Amount(options.quota, "quota");
    const [minterConfig] = findMinterPda(this.stablecoin, minter, this.program.programId);
    return this.executeMutation("updateMinter", async () => this.program.methods
      .updateMinter(quota)
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
    const authority = ensureSigner(options.authority, "authority");
    const minter = ensurePublicKey(options.minter, "minter");
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
    const authority = ensureSigner(options.authority, "authority");
    const newAuthority = ensurePublicKey(options.newAuthority, "newAuthority");
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
    const authority = ensureSigner(options.authority, "authority");
    const pauser = options.pauser == null ? null : ensurePublicKey(options.pauser, "pauser");
    const burner = options.burner == null ? null : ensurePublicKey(options.burner, "burner");
    const blacklister = options.blacklister == null ? null : ensurePublicKey(options.blacklister, "blacklister");
    const seizer = options.seizer == null ? null : ensurePublicKey(options.seizer, "seizer");

    if (this.variant !== "SSS_2" && (blacklister !== null || seizer !== null)) {
      throw new UnsupportedOperationError(
        "blacklister/seizer role updates are only available for SSS_2."
      );
    }

    const hasRoleChange = [pauser, burner, blacklister, seizer].some((role) => role !== null);
    if (!hasRoleChange) {
      throw new InvalidArgumentError("updateRoles requires at least one role update.");
    }

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
    const validatedAuthority = ensureSigner(authority, "authority");
    const validatedTreasury = ensurePublicKey(treasuryTokenAccount, "treasuryTokenAccount");
    if (this.variant !== "SSS_2") {
      throw new UnsupportedOperationError("setTreasury() is only available for SSS_2.");
    }

    return this.executeMutation("setTreasury", async () => this.program.methods
      .setTreasury()
      .accounts({
        authority: validatedAuthority.publicKey,
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        treasuryTokenAccount: validatedTreasury,
      })
      .signers([validatedAuthority])
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
    const validatedMinter = ensurePublicKey(minter, "minter");
    const [minterConfig] = findMinterPda(this.stablecoin, validatedMinter, this.program.programId);
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
