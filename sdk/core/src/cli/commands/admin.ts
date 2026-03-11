import { Command } from "commander";
import { SolanaStablecoin } from "../../stablecoin";
import { ensureConfirmed } from "../confirm";
import { loadCommandContext } from "../context";
import { renderSuccess } from "../output";
import { parsePublicKey, resolveRoleSigner } from "../parsers";

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

export function registerAdminCommands(program: Command): void {
  const roles = program.command("roles").description("Manage stablecoin role authorities");
  roles
    .command("update")
    .description("Update pauser/burner and SSS-2 compliance role addresses")
    .option("--pauser <address>", "New pauser authority")
    .option("--burner <address>", "New burner authority")
    .option("--blacklister <address>", "New blacklister authority (SSS-2 only)")
    .option("--seizer <address>", "New seizer authority (SSS-2 only)")
    .action(async function action(
      this: Command,
      options: {
        pauser?: string;
        burner?: string;
        blacklister?: string;
        seizer?: string;
      }
    ) {
      await ensureConfirmed(this, "roles update");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.updateRoles({
        authority: resolveRoleSigner(this, "authority"),
        pauser: options.pauser ? parsePublicKey(options.pauser, "pauser") : undefined,
        burner: options.burner ? parsePublicKey(options.burner, "burner") : undefined,
        blacklister: options.blacklister ? parsePublicKey(options.blacklister, "blacklister") : undefined,
        seizer: options.seizer ? parsePublicKey(options.seizer, "seizer") : undefined,
      });

      process.stdout.write(renderSuccess("roles update", result, json));
    });

  const authority = program.command("authority").description("Manage stablecoin authority");
  authority
    .command("transfer <newAuthority>")
    .description("Transfer stablecoin authority to a new public key")
    .action(async function action(this: Command, newAuthority: string) {
      await ensureConfirmed(this, "authority transfer");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.transferAuthority({
        authority: resolveRoleSigner(this, "authority"),
        newAuthority: parsePublicKey(newAuthority, "newAuthority"),
      });

      process.stdout.write(renderSuccess("authority transfer", result, json));
    });

  const treasury = program.command("treasury").description("Manage SSS-2 treasury token account");
  treasury
    .command("set <treasuryTokenAccount>")
    .description("Set SSS-2 treasury token account")
    .action(async function action(this: Command, treasuryTokenAccount: string) {
      await ensureConfirmed(this, "treasury set");
      const { stablecoin, json } = await loadRuntimeStablecoin(this);
      const result = await stablecoin.setTreasury(
        parsePublicKey(treasuryTokenAccount, "treasuryTokenAccount"),
        resolveRoleSigner(this, "authority")
      );

      process.stdout.write(renderSuccess("treasury set", result, json));
    });
}
