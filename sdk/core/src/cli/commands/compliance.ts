import { Command } from "commander";
import { SolanaStablecoin } from "../../stablecoin";
import { ensureConfirmed } from "../confirm";
import { enforceVariant, loadCommandContext } from "../context";
import { UnsupportedOperationError } from "../../errors";
import { renderSuccess } from "../output";
import { parsePublicKey, resolveRoleSigner } from "../parsers";

async function loadRuntimeCompliance(command: Command, operation: string): Promise<{
  stablecoin: SolanaStablecoin;
  json: boolean;
}> {
  const context = loadCommandContext(command, { mint: true, variant: true });
  enforceVariant(context.runtime, "SSS_2", operation);

  const stablecoin = await SolanaStablecoin.load(context.connection, context.runtime.mint!, {
    variant: context.runtime.variant!,
  });

  if (stablecoin.compliance === null) {
    throw new UnsupportedOperationError("Compliance commands are only available for SSS_2 deployments.", {
      operation,
      variant: stablecoin.variant,
    });
  }

  return {
    stablecoin,
    json: context.runtime.output === "json",
  };
}

export function registerComplianceCommands(program: Command): void {
  const blacklist = program.command("blacklist").description("Manage SSS-2 blacklist entries");

  blacklist
    .command("add <address>")
    .description("Add address to blacklist")
    .requiredOption("--reason <reason>", "Blacklist reason")
    .action(async function action(this: Command, address: string, options: { reason: string }) {
      await ensureConfirmed(this, "blacklist add");
      const { stablecoin, json } = await loadRuntimeCompliance(this, "blacklist add");
      const result = await stablecoin.compliance!.blacklistAdd(
        parsePublicKey(address, "address"),
        options.reason,
        resolveRoleSigner(this, "blacklister")
      );

      process.stdout.write(renderSuccess("blacklist add", result, json));
    });

  blacklist
    .command("remove <address>")
    .description("Remove address from blacklist")
    .action(async function action(this: Command, address: string) {
      await ensureConfirmed(this, "blacklist remove");
      const { stablecoin, json } = await loadRuntimeCompliance(this, "blacklist remove");
      const result = await stablecoin.compliance!.blacklistRemove(
        parsePublicKey(address, "address"),
        resolveRoleSigner(this, "blacklister")
      );

      process.stdout.write(renderSuccess("blacklist remove", result, json));
    });

  blacklist
    .command("check <address>")
    .description("Check whether address is blacklisted")
    .action(async function action(this: Command, address: string) {
      const parsedAddress = parsePublicKey(address, "address");
      const { stablecoin, json } = await loadRuntimeCompliance(this, "blacklist check");
      const blacklisted = await stablecoin.compliance!.isBlacklisted(parsedAddress);

      process.stdout.write(
        renderSuccess(
          "blacklist check",
          {
            address: parsedAddress.toBase58(),
            blacklisted,
          },
          json
        )
      );
    });

  program
    .command("seize <fromTokenAccount> <targetOwner>")
    .description("Seize tokens from a blacklisted account to treasury")
    .requiredOption("--to <treasuryTokenAccount>", "Treasury token account")
    .action(async function action(
      this: Command,
      fromTokenAccount: string,
      targetOwner: string,
      options: { to: string }
    ) {
      await ensureConfirmed(this, "seize");
      const { stablecoin, json } = await loadRuntimeCompliance(this, "seize");
      const result = await stablecoin.compliance!.seize(
        parsePublicKey(fromTokenAccount, "fromTokenAccount"),
        parsePublicKey(targetOwner, "targetOwner"),
        parsePublicKey(options.to, "treasuryTokenAccount"),
        resolveRoleSigner(this, "seizer")
      );

      process.stdout.write(renderSuccess("seize", result, json));
    });
}
