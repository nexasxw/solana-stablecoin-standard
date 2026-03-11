import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Command } from "commander";
import { registerComplianceCommands } from "../src/cli/commands/compliance";
import { runCli } from "../src/cli";
import { SdkErrorCode } from "../src/errors";
import { SolanaStablecoin } from "../src/stablecoin";

async function writeSignerFile(): Promise<string> {
  const signer = Keypair.generate();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-cli-compliance-signer-"));
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
  program.option("--blacklister-signer <path>");
  program.option("--seizer-signer <path>");
  registerComplianceCommands(program);
  return program;
}

describe("CLI compliance commands", () => {
  it("routes blacklist add/remove/check and seize to SDK compliance module", async () => {
    const blacklisterSigner = await writeSignerFile();
    const seizerSigner = await writeSignerFile();
    const mint = Keypair.generate().publicKey;
    const address = Keypair.generate().publicKey;
    const fromTokenAccount = Keypair.generate().publicKey;
    const targetOwner = Keypair.generate().publicKey;
    const treasuryTokenAccount = Keypair.generate().publicKey;
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const originalLoad = SolanaStablecoin.load;

    (SolanaStablecoin as any).load = async () => ({
      variant: "SSS_2",
      compliance: {
        blacklistAdd: async (...args: unknown[]) => {
          calls.push({ method: "blacklistAdd", args });
          return { operation: "blacklistAdd", signature: "sig-add" };
        },
        blacklistRemove: async (...args: unknown[]) => {
          calls.push({ method: "blacklistRemove", args });
          return { operation: "blacklistRemove", signature: "sig-remove" };
        },
        isBlacklisted: async (...args: unknown[]) => {
          calls.push({ method: "isBlacklisted", args });
          return true;
        },
        seize: async (...args: unknown[]) => {
          calls.push({ method: "seize", args });
          return { operation: "seize", signature: "sig-seize" };
        },
      },
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
        "SSS_2",
        "--blacklister-signer",
        blacklisterSigner,
        "--yes",
        "--json",
        "blacklist",
        "add",
        address.toBase58(),
        "--reason",
        "OFAC match",
      ]);

      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_2",
        "--blacklister-signer",
        blacklisterSigner,
        "--yes",
        "blacklist",
        "remove",
        address.toBase58(),
      ]);

      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_2",
        "blacklist",
        "check",
        address.toBase58(),
      ]);

      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_2",
        "--seizer-signer",
        seizerSigner,
        "--yes",
        "seize",
        fromTokenAccount.toBase58(),
        targetOwner.toBase58(),
        "--to",
        treasuryTokenAccount.toBase58(),
      ]);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
    }

    expect(calls).to.have.length(4);
    expect((calls[0].args[0] as PublicKey).toBase58()).to.equal(address.toBase58());
    expect(calls[0].args[1]).to.equal("OFAC match");
    expect((calls[1].args[0] as PublicKey).toBase58()).to.equal(address.toBase58());
    expect((calls[2].args[0] as PublicKey).toBase58()).to.equal(address.toBase58());
    expect((calls[3].args[0] as PublicKey).toBase58()).to.equal(fromTokenAccount.toBase58());
    expect((calls[3].args[1] as PublicKey).toBase58()).to.equal(targetOwner.toBase58());
    expect((calls[3].args[2] as PublicKey).toBase58()).to.equal(treasuryTokenAccount.toBase58());
  });

  it("returns deterministic unsupported error for SSS-1 compliance command", async () => {
    const mint = Keypair.generate().publicKey;
    const address = Keypair.generate().publicKey;
    const stderrWrite = process.stderr.write.bind(process.stderr);
    const stderr: string[] = [];

    (process.stderr.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      stderr.push(chunk);
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
        "--json",
        "blacklist",
        "check",
        address.toBase58(),
      ]);

      expect(exitCode).to.equal(3);
    } finally {
      (process.stderr.write as unknown as (chunk: string) => boolean) = stderrWrite as unknown as (chunk: string) => boolean;
    }

    const parsed = JSON.parse(stderr.join(""));
    expect(parsed.error.code).to.equal("CLI_SDK");
    expect(parsed.error.details.sdkCode).to.equal(SdkErrorCode.UNSUPPORTED_OPERATION);
  });
});
