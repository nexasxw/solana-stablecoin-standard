/**
 * SolanaStablecoin — main SDK class.
 *
 * Supports both preset-based initialization (SSS_1, SSS_2) and custom configs.
 */

import { Connection, Keypair, PublicKey, Commitment } from "@solana/web3.js";
import { Idl, Program } from "@coral-xyz/anchor";
import { ComplianceModule } from "./compliance";
import { Presets, getPresetConfig } from "./presets";
import { findStablecoinPda, findMinterPda } from "./pda";
import {
  CreateOptions,
  MintOptions,
  BurnOptions,
  StablecoinState,
  SdkTxResult,
  StablecoinVariant,
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
    const { minter } = options;
    findMinterPda(
      this.stablecoin,
      minter.publicKey,
      this.program.programId
    );
    throw new UnsupportedOperationError(
      "mint() is not implemented yet — awaiting lifecycle implementation."
    );
  }

  /** Burn tokens from caller's account. */
  async burn(_options: BurnOptions): Promise<SdkTxResult> {
    throw new UnsupportedOperationError(
      "burn() is not implemented yet — awaiting lifecycle implementation."
    );
  }

  /** Freeze a token account. Pauser role required. */
  async freeze(_tokenAccount: PublicKey, _pauser: Keypair): Promise<SdkTxResult> {
    throw new UnsupportedOperationError(
      "freeze() is not implemented yet — awaiting lifecycle implementation."
    );
  }

  /** Thaw a frozen token account. Pauser role required. */
  async thaw(_tokenAccount: PublicKey, _pauser: Keypair): Promise<SdkTxResult> {
    throw new UnsupportedOperationError(
      "thaw() is not implemented yet — awaiting lifecycle implementation."
    );
  }

  /** Pause all mint/burn operations. Authority required. */
  async pause(): Promise<SdkTxResult> {
    throw new UnsupportedOperationError(
      "pause() is not implemented yet — awaiting lifecycle implementation."
    );
  }

  /** Unpause operations. Authority required. */
  async unpause(): Promise<SdkTxResult> {
    throw new UnsupportedOperationError(
      "unpause() is not implemented yet — awaiting lifecycle implementation."
    );
  }

  /** Get total token supply. */
  async getTotalSupply(): Promise<bigint> {
    const mintInfo = await this.connection.getTokenSupply(this.mintAddress);
    return BigInt(mintInfo.value.amount);
  }

  /** Get the on-chain stablecoin state. */
  async getState(): Promise<StablecoinState> {
    throw new RpcRequestError("getState() is not implemented yet — awaiting account fetch support.");
  }
}
