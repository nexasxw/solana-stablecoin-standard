/**
 * SolanaStablecoin — main SDK class.
 *
 * Supports both preset-based initialization (SSS_1, SSS_2) and custom configs.
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { ComplianceModule } from "./compliance";
import { Presets, getPresetConfig } from "./presets";
import { findStablecoinPda, findMinterPda } from "./pda";
import { CreateOptions, MintOptions, BurnOptions, StablecoinState } from "./types";
import { loadStablecoinConfigFile, resolveStablecoinConfig } from "./config";

// TODO: import generated IDLs
// import SSS1_IDL from "../../target/idl/sss_1.json";
// import SSS2_IDL from "../../target/idl/sss_2.json";

const SSS1_PROGRAM_ID = new PublicKey("SSS1111111111111111111111111111111111111111");
const SSS2_PROGRAM_ID = new PublicKey("SSS2222222222222222222222222222222222222222");

export class SolanaStablecoin {
  readonly stablecoin: PublicKey;
  readonly mintAddress: PublicKey;
  readonly compliance: ComplianceModule | null;

  private constructor(
    private readonly connection: Connection,
    private readonly program: Program,
    private readonly authority: Keypair,
    stablecoin: PublicKey,
    mint: PublicKey,
    isCompliant: boolean
  ) {
    this.stablecoin = stablecoin;
    this.mintAddress = mint;
    this.compliance = isCompliant
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
      throw new Error(
        "SSS_1 preset is incompatible with compliance extensions. Use SSS_2 or disable both flags."
      );
    }

    if (
      preset === Presets.SSS_2 &&
      (!config.enablePermanentDelegate || !config.enableTransferHook)
    ) {
      throw new Error(
        "SSS_2 preset requires both enablePermanentDelegate and enableTransferHook."
      );
    }

    const isSSS2 = config.enablePermanentDelegate && config.enableTransferHook;

    const programId = isSSS2 ? SSS2_PROGRAM_ID : SSS1_PROGRAM_ID;
    new AnchorProvider(
      connection,
      new Wallet(authority),
      AnchorProvider.defaultOptions()
    );

    // TODO: use generated IDL
    // const program = new Program(isSSS2 ? SSS2_IDL : SSS1_IDL, provider);
    const program = {} as Program;

    const mintKeypair = Keypair.generate();
    const [stablecoinPda] = findStablecoinPda(mintKeypair.publicKey, programId);

    // TODO: call program.methods.initialize(config).accounts({...}).signers([authority, mintKeypair]).rpc()

    return new SolanaStablecoin(
      connection,
      program,
      authority,
      stablecoinPda,
      mintKeypair.publicKey,
      isSSS2 ?? false
    );
  }

  /**
   * Load an existing stablecoin by mint address.
   */
  static async load(
    connection: Connection,
    mint: PublicKey,
    isSSS2 = false
  ): Promise<SolanaStablecoin> {
    const programId = isSSS2 ? SSS2_PROGRAM_ID : SSS1_PROGRAM_ID;
    findStablecoinPda(mint, programId);
    // TODO: fetch stablecoin account and load mint
    throw new Error("Not yet implemented — awaiting IDL generation");
  }

  /** Mint tokens to a recipient. Minter role required. */
  async mint(options: MintOptions): Promise<string> {
    const { minter } = options;
    findMinterPda(
      this.stablecoin,
      minter.publicKey,
      this.program.programId
    );
    // TODO: call program.methods.mint(new BN(amount)).accounts({...}).rpc()
    throw new Error("Not yet implemented — awaiting IDL generation");
  }

  /** Burn tokens from caller's account. */
  async burn(_options: BurnOptions): Promise<string> {
    throw new Error("Not yet implemented — awaiting IDL generation");
  }

  /** Freeze a token account. Pauser role required. */
  async freeze(_tokenAccount: PublicKey, _pauser: Keypair): Promise<string> {
    throw new Error("Not yet implemented — awaiting IDL generation");
  }

  /** Thaw a frozen token account. Pauser role required. */
  async thaw(_tokenAccount: PublicKey, _pauser: Keypair): Promise<string> {
    throw new Error("Not yet implemented — awaiting IDL generation");
  }

  /** Pause all mint/burn operations. Authority required. */
  async pause(): Promise<string> {
    throw new Error("Not yet implemented — awaiting IDL generation");
  }

  /** Unpause operations. Authority required. */
  async unpause(): Promise<string> {
    throw new Error("Not yet implemented — awaiting IDL generation");
  }

  /** Get total token supply. */
  async getTotalSupply(): Promise<bigint> {
    const mintInfo = await this.connection.getTokenSupply(this.mintAddress);
    return BigInt(mintInfo.value.amount);
  }

  /** Get the on-chain stablecoin state. */
  async getState(): Promise<StablecoinState> {
    throw new Error("Not yet implemented — awaiting IDL generation");
  }
}
