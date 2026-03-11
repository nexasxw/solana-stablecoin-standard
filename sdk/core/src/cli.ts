#!/usr/bin/env node
import { Command } from "commander";
import { loadCommandContext } from "./cli/context";

function registerInitGroup(program: Command): void {
  const init = program.command("init").description("Initialize SSS-1, SSS-2, or custom stablecoin deployments");

  init
    .command("create")
    .description("Initialize a new stablecoin deployment")
    .action(() => {
      loadCommandContext(init, { variant: true });
    });
}

function registerLifecycleGroup(program: Command): void {
  const lifecycle = program
    .command("lifecycle")
    .description("Run lifecycle operations (mint, burn, freeze, thaw, pause, unpause)");

  const contextRequired = { mint: true, variant: true };

  lifecycle.command("mint").description("Mint tokens").action(() => {
    loadCommandContext(lifecycle, contextRequired);
  });
  lifecycle.command("burn").description("Burn tokens").action(() => {
    loadCommandContext(lifecycle, contextRequired);
  });
  lifecycle.command("freeze").description("Freeze an account").action(() => {
    loadCommandContext(lifecycle, contextRequired);
  });
  lifecycle.command("thaw").description("Thaw an account").action(() => {
    loadCommandContext(lifecycle, contextRequired);
  });
}

function registerAdminGroup(program: Command): void {
  const admin = program
    .command("admin")
    .description("Manage roles, minters, authority, and stablecoin controls");

  admin.command("pause").description("Pause mint/burn operations").action(() => {
    loadCommandContext(admin, { mint: true, variant: true });
  });

  admin.command("unpause").description("Resume mint/burn operations").action(() => {
    loadCommandContext(admin, { mint: true, variant: true });
  });
}

function registerComplianceGroup(program: Command): void {
  const compliance = program
    .command("compliance")
    .description("Run SSS-2 blacklist and seize compliance commands");

  compliance.command("blacklist-add").description("Add address to blacklist").action(() => {
    loadCommandContext(compliance, { mint: true, variant: true });
  });

  compliance.command("blacklist-remove").description("Remove address from blacklist").action(() => {
    loadCommandContext(compliance, { mint: true, variant: true });
  });

  compliance.command("seize").description("Seize tokens from a blacklisted account").action(() => {
    loadCommandContext(compliance, { mint: true, variant: true });
  });
}

function registerInfoGroup(program: Command): void {
  const info = program.command("info").description("Inspect stablecoin metadata and supply status");
  info.command("status").description("Show stablecoin state").action(() => {
    loadCommandContext(info, { mint: true, variant: true });
  });
  info.command("supply").description("Show current total supply").action(() => {
    loadCommandContext(info, { mint: true, variant: true });
  });
}

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("sss-token")
    .description("Operator CLI for the Solana Stablecoin Standard")
    .showHelpAfterError("(use --help for usage)")
    .allowExcessArguments(false);

  program.option("-c, --config <path>", "Path to CLI runtime config file");
  program.option("--rpc-url <url>", "Solana RPC URL override");
  program.option("--mint <address>", "Stablecoin mint public key");
  program.option("--variant <variant>", "Stablecoin variant (SSS_1 or SSS_2)");
  program.option("--json", "Emit machine-readable JSON output");
  program.option("-y, --yes", "Bypass confirmation prompts");

  registerInitGroup(program);
  registerLifecycleGroup(program);
  registerAdminGroup(program);
  registerComplianceGroup(program);
  registerInfoGroup(program);

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<number> {
  const program = createCliProgram();
  await program.parseAsync(argv);
  return 0;
}

if (require.main === module) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
