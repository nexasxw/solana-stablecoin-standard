import { Command } from "commander";
import { SolanaStablecoin } from "../../stablecoin";
import { loadCommandContext } from "../context";
import { CliUsageError } from "../errors";
import { renderSuccess } from "../output";
import { parseOptionalInteger, parsePreset, resolveRoleSigner } from "../parsers";

interface InitCommandOptions {
  preset?: string;
  custom?: string;
  name?: string;
  symbol?: string;
  uri?: string;
  decimals?: string;
  enablePermanentDelegate?: boolean;
  enableTransferHook?: boolean;
}

function enforceInitMode(options: InitCommandOptions): void {
  const hasPreset = Boolean(options.preset);
  const hasCustom = Boolean(options.custom);

  if (hasPreset === hasCustom) {
    throw new CliUsageError("Exactly one of --preset or --custom must be provided.");
  }

  if (hasPreset && (!options.name || !options.symbol)) {
    throw new CliUsageError("Preset initialization requires --name and --symbol.");
  }
}

export async function runInitCommand(command: Command, options: InitCommandOptions): Promise<void> {
  enforceInitMode(options);

  const context = loadCommandContext(command);
  const authority = resolveRoleSigner(command, "authority");

  const stablecoin = await SolanaStablecoin.create(context.connection, {
    authority,
    preset: options.preset ? parsePreset(options.preset) : undefined,
    configFile: options.custom,
    name: options.name,
    symbol: options.symbol,
    uri: options.uri,
    decimals: parseOptionalInteger(options.decimals, "decimals"),
    extensions: {
      permanentDelegate: options.enablePermanentDelegate || undefined,
      transferHook: options.enableTransferHook || undefined,
    },
  });

  process.stdout.write(
    renderSuccess(
      "init",
      {
        variant: stablecoin.variant,
        stablecoin: stablecoin.stablecoin.toBase58(),
        mint: stablecoin.mintAddress.toBase58(),
        initialization: stablecoin.initialization,
      },
      context.runtime.output === "json"
    )
  );
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new stablecoin deployment")
    .option("--preset <preset>", "Preset deployment mode (sss-1|sss-2)")
    .option("--custom <path>", "Path to a custom stablecoin config file (.json/.toml)")
    .option("--name <name>", "Stablecoin name")
    .option("--symbol <symbol>", "Stablecoin symbol")
    .option("--uri <uri>", "Metadata URI")
    .option("--decimals <decimals>", "Mint decimals")
    .option("--enable-permanent-delegate", "Enable permanent delegate extension")
    .option("--enable-transfer-hook", "Enable transfer hook extension")
    .action(async function action(this: Command, options: InitCommandOptions) {
      await runInitCommand(this, options);
    });
}
