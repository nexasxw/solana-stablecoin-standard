import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Command } from "commander";
import { registerLifecycleCommands } from "../src/cli/commands/lifecycle";
import { runCli } from "../src/cli";
import { SolanaStablecoin } from "../src/stablecoin";

async function writeSignerFile(): Promise<string> {
  const signer = Keypair.generate();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-cli-lifecycle-signer-"));
  const signerPath = path.join(dir, "role.json");
  await fs.writeFile(signerPath, JSON.stringify(Array.from(signer.secretKey)), "utf8");
  return signerPath;
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.allowExcessArguments(false);
  program.option("--config <path>");
  program.option("--rpc-url <url>");
  program.option("--mint <address>");
  program.option("--variant <variant>");
  program.option("--json");
  program.option("--yes");
  program.option("--authority-signer <path>");
  program.option("--minter-signer <path>");
  program.option("--burner-signer <path>");
  program.option("--pauser-signer <path>");
  registerLifecycleCommands(program);
  return program;
}

describe("CLI lifecycle commands", () => {
  it("parses mint arguments and routes signer + amount to SDK", async () => {
    const minterSigner = await writeSignerFile();
    const recipient = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const calls: Array<Record<string, unknown>> = [];
    const originalLoad = SolanaStablecoin.load;
    const originalWrite = process.stdout.write.bind(process.stdout);
    const output: string[] = [];

    (SolanaStablecoin as any).load = async () => ({
      mint: async (options: Record<string, unknown>) => {
        calls.push(options);
        return { signature: "sig-mint" };
      },
    });
    (process.stdout.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      output.push(chunk);
      return true;
    };

    try {
      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_1",
        "--minter-signer",
        minterSigner,
        "--yes",
        "--json",
        "mint",
        recipient.toBase58(),
        "42",
      ]);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
      (process.stdout.write as unknown as (chunk: string) => boolean) = originalWrite as unknown as (chunk: string) => boolean;
    }

    expect(calls).to.have.length(1);
    expect((calls[0].recipientTokenAccount as PublicKey).toBase58()).to.equal(recipient.toBase58());
    expect(calls[0].amount).to.equal(42n);
    expect(output.join("")).to.contain("\"ok\":true");
    expect(output.join("")).to.contain("sig-mint");
  });

  it("enforces confirmation unless --yes is provided for mutating commands", async () => {
    const authoritySigner = await writeSignerFile();
    const mint = Keypair.generate().publicKey;
    const originalLoad = SolanaStablecoin.load;

    (SolanaStablecoin as any).load = async () => ({
      pause: async () => ({ signature: "sig-pause" }),
    });

    try {
      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_1",
        "--authority-signer",
        authoritySigner,
        "pause",
      ]);
      expect.fail("Expected pause command without --yes to fail in non-interactive test mode");
    } catch (error) {
      expect(String(error)).to.match(/Confirmation required for pause/);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
    }
  });

  it("returns deterministic status and supply output", async () => {
    const mint = Keypair.generate().publicKey;
    const originalLoad = SolanaStablecoin.load;
    const originalWrite = process.stdout.write.bind(process.stdout);
    const output: string[] = [];
    const authority = Keypair.generate().publicKey;
    const pauser = Keypair.generate().publicKey;
    const burner = Keypair.generate().publicKey;

    (SolanaStablecoin as any).load = async () => ({
      getState: async () => ({
        authority,
        mint,
        pauser,
        burner,
        paused: false,
        permanentDelegateEnabled: false,
        transferHookEnabled: false,
      }),
      getTotalSupply: async () => 12345n,
    });
    (process.stdout.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      output.push(chunk);
      return true;
    };

    try {
      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_1",
        "--json",
        "status",
      ]);

      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_1",
        "--json",
        "supply",
      ]);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
      (process.stdout.write as unknown as (chunk: string) => boolean) = originalWrite as unknown as (chunk: string) => boolean;
    }

    const merged = output.join("");
    expect(merged).to.contain("\"command\":\"status\"");
    expect(merged).to.contain("\"command\":\"supply\"");
    expect(merged).to.contain("\"supply\":\"12345\"");
  });

  it("returns deterministic non-zero exit for invalid lifecycle input", async () => {
    const minterSigner = await writeSignerFile();
    const mint = Keypair.generate().publicKey;
    const recipient = Keypair.generate().publicKey;
    const originalWrite = process.stderr.write.bind(process.stderr);
    const errors: string[] = [];

    (process.stderr.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      errors.push(chunk);
      return true;
    };

    try {
      const exitCode = await runCli([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_1",
        "--minter-signer",
        minterSigner,
        "--yes",
        "mint",
        recipient.toBase58(),
        "invalid-amount",
      ]);

      expect(exitCode).to.equal(2);
    } finally {
      (process.stderr.write as unknown as (chunk: string) => boolean) = originalWrite as unknown as (chunk: string) => boolean;
    }

    expect(errors.join("")).to.contain("CLI_USAGE");
    expect(errors.join("")).to.contain("Invalid amount");
  });
});
