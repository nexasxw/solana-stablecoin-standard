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

export function registerLifecycleCommands(program: Command): void {
  program
    .command("mint <recipientTokenAccount> <amount>")
    .description("Mint tokens to a token account")
    .action(async function action(this: Command, recipientTokenAccount: string, amount: string) {
      await ensureConfirmed(this, "mint");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.mint({
        minter: resolveRoleSigner(this, "minter"),
        recipientTokenAccount: parsePublicKey(recipientTokenAccount, "recipientTokenAccount"),
        amount: parseBigInt(amount, "amount"),
      });

      process.stdout.write(renderSuccess("mint", result, json));
    });

  program
    .command("burn <burnerTokenAccount> <amount>")
    .description("Burn tokens from token account")
    .action(async function action(this: Command, burnerTokenAccount: string, amount: string) {
      await ensureConfirmed(this, "burn");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.burn({
        burner: resolveRoleSigner(this, "burner"),
        burnerTokenAccount: parsePublicKey(burnerTokenAccount, "burnerTokenAccount"),
        amount: parseBigInt(amount, "amount"),
      });

      process.stdout.write(renderSuccess("burn", result, json));
    });

  program
    .command("freeze <tokenAccount>")
    .description("Freeze token account")
    .action(async function action(this: Command, tokenAccount: string) {
      await ensureConfirmed(this, "freeze");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.freeze({
        pauser: resolveRoleSigner(this, "pauser"),
        tokenAccount: parsePublicKey(tokenAccount, "tokenAccount"),
      });

      process.stdout.write(renderSuccess("freeze", result, json));
    });

  program
    .command("thaw <tokenAccount>")
    .description("Thaw token account")
    .action(async function action(this: Command, tokenAccount: string) {
      await ensureConfirmed(this, "thaw");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.thaw({
        pauser: resolveRoleSigner(this, "pauser"),
        tokenAccount: parsePublicKey(tokenAccount, "tokenAccount"),
      });

      process.stdout.write(renderSuccess("thaw", result, json));
    });

  program
    .command("pause")
    .description("Pause mint and burn operations")
    .action(async function action(this: Command) {
      await ensureConfirmed(this, "pause");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.pause({
        authority: resolveRoleSigner(this, "authority"),
      });

      process.stdout.write(renderSuccess("pause", result, json));
    });

  program
    .command("unpause")
    .description("Resume mint and burn operations")
    .action(async function action(this: Command) {
      await ensureConfirmed(this, "unpause");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.unpause({
        authority: resolveRoleSigner(this, "authority"),
      });

      process.stdout.write(renderSuccess("unpause", result, json));
    });

  program
    .command("status")
    .description("Show stablecoin state")
    .action(async function action(this: Command) {
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const state = await stablecoin.getState();
      process.stdout.write(
        renderSuccess(
          "status",
          {
            authority: state.authority.toBase58(),
            mint: state.mint.toBase58(),
            pauser: state.pauser.toBase58(),
            burner: state.burner.toBase58(),
            blacklister: state.blacklister?.toBase58() ?? null,
            seizer: state.seizer?.toBase58() ?? null,
            treasuryTokenAccount: state.treasuryTokenAccount?.toBase58() ?? null,
            paused: state.paused,
            permanentDelegateEnabled: state.permanentDelegateEnabled,
            transferHookEnabled: state.transferHookEnabled,
          },
          json
        )
      );
    });

  program
    .command("supply")
    .description("Show stablecoin total supply")
    .action(async function action(this: Command) {
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const supply = await stablecoin.getTotalSupply();
      process.stdout.write(renderSuccess("supply", { supply: supply.toString() }, json));
    });
}
