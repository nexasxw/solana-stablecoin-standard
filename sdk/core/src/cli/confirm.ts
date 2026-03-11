import inquirer from "inquirer";
import { Command } from "commander";
import { resolveRuntimeConfig } from "./config";
import { CliUsageError } from "./errors";
import { CliGlobalOptions } from "./types";

export async function ensureConfirmed(command: Command, action: string): Promise<void> {
  const flags = command.optsWithGlobals<Record<string, unknown>>() as CliGlobalOptions;
  const runtime = resolveRuntimeConfig({ flags });

  if (runtime.confirmBypass) {
    return;
  }

  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    throw new CliUsageError(`Confirmation required for ${action}. Re-run with --yes for non-interactive execution.`);
  }

  const response = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: "confirm",
      name: "proceed",
      message: `Confirm ${action}?`,
      default: false,
    },
  ]);

  if (!response.proceed) {
    throw new CliUsageError(`Cancelled ${action}.`);
  }
}
