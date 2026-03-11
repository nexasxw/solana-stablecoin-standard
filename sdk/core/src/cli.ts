#!/usr/bin/env node
import { Command } from "commander";
import { registerAdminCommands } from "./cli/commands/admin";
import { registerComplianceCommands } from "./cli/commands/compliance";
import { registerInitCommand } from "./cli/commands/init";
import { registerLifecycleCommands } from "./cli/commands/lifecycle";
import { registerMinterCommands } from "./cli/commands/minters";
import { resolveCliFailure } from "./cli/errors";
import { renderFailure } from "./cli/output";

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("sss-token")
    .description("Operator CLI for the Solana Stablecoin Standard")
    .showHelpAfterError("(use --help for usage)")
    .exitOverride()
    .allowExcessArguments(false);

  program.option("-c, --config <path>", "Path to CLI runtime config file");
  program.option("--rpc-url <url>", "Solana RPC URL override");
  program.option("--mint <address>", "Stablecoin mint public key");
  program.option("--variant <variant>", "Stablecoin variant (SSS_1 or SSS_2)");
  program.option("--json", "Emit machine-readable JSON output");
  program.option("-y, --yes", "Bypass confirmation prompts");
  program.option("--signer <path>", "Default signer keypair path");
  program.option("--authority-signer <path>", "Authority signer keypair path");
  program.option("--minter-signer <path>", "Minter signer keypair path");
  program.option("--burner-signer <path>", "Burner signer keypair path");
  program.option("--pauser-signer <path>", "Pauser signer keypair path");
  program.option("--blacklister-signer <path>", "Blacklister signer keypair path");
  program.option("--seizer-signer <path>", "Seizer signer keypair path");

  registerInitCommand(program);
  registerLifecycleCommands(program);
  registerAdminCommands(program);
  registerMinterCommands(program);
  registerComplianceCommands(program);

  return program;
}

function isJsonMode(argv: string[]): boolean {
  return argv.includes("--json");
}

function commandLabel(argv: string[]): string {
  const commandParts = argv.slice(2).filter((token) => !token.startsWith("-"));
  return commandParts.join(" ") || "sss-token";
}

export async function runCli(argv: string[] = process.argv): Promise<number> {
  const program = createCliProgram();
  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    const cliError = resolveCliFailure(error);
    process.stderr.write(renderFailure(commandLabel(argv), cliError, isJsonMode(argv)));
    return cliError.exitCode;
  }
}

if (require.main === module) {
  runCli().then((exitCode) => {
    process.exit(exitCode);
  });
}
