import { Command } from "commander";
import { SolanaStablecoin } from "../../stablecoin";
import { ensureConfirmed } from "../confirm";
import { loadCommandContext } from "../context";
import { renderSuccess } from "../output";
import { parseBigInt, parsePublicKey, resolveRoleSigner } from "../parsers";

async function loadRuntimeStablecoin(command: Command): Promise<{
  stablecoin: SolanaStablecoin;
  json: boolean;
}> {
  const context = loadCommandContext(command, { mint: true, variant: true });
  const stablecoin = await SolanaStablecoin.load(context.connection, context.runtime.mint!, {
    variant: context.runtime.variant!,
  });

  return {
    stablecoin,
    json: context.runtime.output === "json",
  };
}

export function registerMinterCommands(program: Command): void {
  const minters = program.command("minters").description("Manage minter quotas");

  minters
    .command("add <minter>")
    .description("Add or rotate a minter quota")
    .requiredOption("--quota <amount>", "Minter mint quota (u64 integer)")
    .action(async function action(this: Command, minter: string, options: { quota: string }) {
      await ensureConfirmed(this, "minters add");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.updateMinter({
        authority: resolveRoleSigner(this, "authority"),
        minter: parsePublicKey(minter, "minter"),
        quota: parseBigInt(options.quota, "quota"),
      });

      process.stdout.write(renderSuccess("minters add", result, json));
    });

  minters
    .command("remove <minter>")
    .description("Remove a minter quota configuration")
    .action(async function action(this: Command, minter: string) {
      await ensureConfirmed(this, "minters remove");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.removeMinter({
        authority: resolveRoleSigner(this, "authority"),
        minter: parsePublicKey(minter, "minter"),
      });

      process.stdout.write(renderSuccess("minters remove", result, json));
    });

  minters
    .command("get <minter>")
    .description("Get minter quota and minted state")
    .action(async function action(this: Command, minter: string) {
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const state = await stablecoin.getMinterState(parsePublicKey(minter, "minter"));
      process.stdout.write(
        renderSuccess(
          "minters get",
          state
            ? {
              stablecoin: state.stablecoin.toBase58(),
              minter: state.minter.toBase58(),
              quota: state.quota.toString(),
              minted: state.minted.toString(),
              bump: state.bump,
            }
            : null,
          json
        )
      );
    });
}
