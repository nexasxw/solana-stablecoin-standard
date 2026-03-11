import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Keypair } from "@solana/web3.js";
import { Command } from "commander";
import { registerInitCommand, runInitCommand } from "../src/cli/commands/init";
import { CliUsageError } from "../src/cli/errors";
import { SolanaStablecoin } from "../src/stablecoin";

async function writeSignerFile(): Promise<string> {
  const signer = Keypair.generate();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-cli-init-signer-"));
  const signerPath = path.join(dir, "authority.json");
  await fs.writeFile(signerPath, JSON.stringify(Array.from(signer.secretKey)), "utf8");
  return signerPath;
}

function makeCommand(flags: Record<string, unknown>): Command {
  return {
    optsWithGlobals: () => flags,
  } as unknown as Command;
}

describe("CLI init command", () => {
  it("supports preset mode and normalizes preset values", async () => {
    const authoritySigner = await writeSignerFile();
    const mint = Keypair.generate().publicKey;
    const stablecoinAddress = Keypair.generate().publicKey;
    let captured: Record<string, unknown> | undefined;
    const originalCreate = SolanaStablecoin.create;
    const originalWrite = process.stdout.write.bind(process.stdout);
    const output: string[] = [];

    (SolanaStablecoin as any).create = async (_connection: unknown, options: Record<string, unknown>) => {
      captured = options;
      return {
        variant: "SSS_1",
        stablecoin: stablecoinAddress,
        mintAddress: mint,
        initialization: { signature: "sig-init" },
      };
    };
    (process.stdout.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      output.push(chunk);
      return true;
    };

    try {
      await runInitCommand(
        makeCommand({
          rpcUrl: "http://127.0.0.1:8899",
          authoritySigner,
          json: true,
        }),
        {
          preset: "sss-1",
          name: "Stable USD",
          symbol: "sUSD",
        }
      );
    } finally {
      (SolanaStablecoin as any).create = originalCreate;
      (process.stdout.write as unknown as (chunk: string) => boolean) = originalWrite as unknown as (chunk: string) => boolean;
    }

    expect(captured).to.not.equal(undefined);
    expect(captured?.["preset"]).to.equal("SSS_1");
    expect(captured?.["name"]).to.equal("Stable USD");
    expect(captured?.["symbol"]).to.equal("sUSD");
    expect(output.join("")).to.contain("\"ok\":true");
    expect(output.join("")).to.contain(mint.toBase58());
  });

  it("supports custom config mode", async () => {
    const authoritySigner = await writeSignerFile();
    let captured: Record<string, unknown> | undefined;
    const originalCreate = SolanaStablecoin.create;

    (SolanaStablecoin as any).create = async (_connection: unknown, options: Record<string, unknown>) => {
      captured = options;
      return {
        variant: "SSS_2",
        stablecoin: Keypair.generate().publicKey,
        mintAddress: Keypair.generate().publicKey,
        initialization: { signature: "sig-custom" },
      };
    };

    try {
      await runInitCommand(
        makeCommand({
          rpcUrl: "http://127.0.0.1:8899",
          authoritySigner,
        }),
        {
          custom: "/tmp/sss-custom.toml",
        }
      );
    } finally {
      (SolanaStablecoin as any).create = originalCreate;
    }

    expect(captured).to.not.equal(undefined);
    expect(captured?.["configFile"]).to.equal("/tmp/sss-custom.toml");
    expect(captured?.["preset"]).to.equal(undefined);
  });

  it("rejects invalid mode combinations", async () => {
    const authoritySigner = await writeSignerFile();
    const command = makeCommand({
      rpcUrl: "http://127.0.0.1:8899",
      authoritySigner,
    });

    try {
      await runInitCommand(command, {
        preset: "sss-1",
        custom: "/tmp/sss-custom.toml",
        name: "Stable USD",
        symbol: "SUSD",
      });
      expect.fail("Expected invalid mode combination to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(CliUsageError);
      expect(String(error)).to.match(/Exactly one of --preset or --custom/);
    }

    try {
      await runInitCommand(command, {});
      expect.fail("Expected missing mode to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(CliUsageError);
      expect(String(error)).to.match(/Exactly one of --preset or --custom/);
    }
  });

  it("registers init command with expected help surface", () => {
    const program = new Command();
    registerInitCommand(program);

    const init = program.commands.find((cmd) => cmd.name() === "init");
    expect(init).to.not.equal(undefined);
    expect(init?.options.some((option) => option.long === "--preset")).to.equal(true);
    expect(init?.options.some((option) => option.long === "--custom")).to.equal(true);
  });
});
