import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { runCli } from "../src/cli";
import { InvalidReasonError, SdkErrorCode } from "../src/errors";
import { SolanaStablecoin } from "../src/stablecoin";

async function writeConfig(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-cli-integration-config-"));
  const configPath = path.join(dir, "config.toml");
  await fs.writeFile(configPath, content, "utf8");
  return configPath;
}

function restoreEnvKey(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe("CLI integration contracts", () => {
  it("keeps JSON envelope schema stable for success and failure paths", async () => {
    const mint = Keypair.generate().publicKey;
    const address = Keypair.generate().publicKey;
    const originalLoad = SolanaStablecoin.load;
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    const stdout: string[] = [];
    const stderr: string[] = [];

    (SolanaStablecoin as any).load = async () => ({
      variant: "SSS_2",
      getTotalSupply: async () => 12_345n,
      compliance: {
        isBlacklisted: async () => true,
      },
    });
    (process.stdout.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      stdout.push(chunk);
      return true;
    };
    (process.stderr.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      stderr.push(chunk);
      return true;
    };

    try {
      const successExit = await runCli([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_2",
        "--json",
        "supply",
      ]);
      expect(successExit).to.equal(0);

      const failExit = await runCli([
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
      expect(failExit).to.equal(3);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
      (process.stdout.write as unknown as (chunk: string) => boolean) = originalStdoutWrite as unknown as (chunk: string) => boolean;
      (process.stderr.write as unknown as (chunk: string) => boolean) = originalStderrWrite as unknown as (chunk: string) => boolean;
    }

    const success = JSON.parse(stdout[0]);
    expect(Object.keys(success)).to.deep.equal(["ok", "command", "data", "error"]);
    expect(success.ok).to.equal(true);
    expect(success.data.supply).to.equal("12345");

    const failure = JSON.parse(stderr[0]);
    expect(Object.keys(failure)).to.deep.equal(["ok", "command", "data", "error"]);
    expect(failure.ok).to.equal(false);
    expect(failure.error.code).to.equal("CLI_SDK");
    expect(failure.error.details.sdkCode).to.equal("UNSUPPORTED_OPERATION");
  });

  it("passes through SDK errors with deterministic sdkCode and exits", async () => {
    const mint = Keypair.generate().publicKey;
    const address = Keypair.generate().publicKey;
    const signer = Keypair.generate();
    const signerDir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-cli-integration-signer-"));
    const signerPath = path.join(signerDir, "blacklister.json");
    await fs.writeFile(signerPath, JSON.stringify(Array.from(signer.secretKey)), "utf8");

    const originalLoad = SolanaStablecoin.load;
    const originalWrite = process.stderr.write.bind(process.stderr);
    const errors: string[] = [];
    (SolanaStablecoin as any).load = async () => ({
      variant: "SSS_2",
      compliance: {
        blacklistAdd: async () => {
          throw new InvalidReasonError("Invalid blacklist reason.", { field: "reason" });
        },
      },
    });
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
        "SSS_2",
        "--blacklister-signer",
        signerPath,
        "--yes",
        "--json",
        "blacklist",
        "add",
        address.toBase58(),
        "--reason",
        "bad",
      ]);
      expect(exitCode).to.equal(2);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
      (process.stderr.write as unknown as (chunk: string) => boolean) = originalWrite as unknown as (chunk: string) => boolean;
    }

    const parsed = JSON.parse(errors[0]);
    expect(parsed.error.code).to.equal("CLI_SDK");
    expect(parsed.error.details.sdkCode).to.equal(SdkErrorCode.INVALID_REASON);
  });

  it("applies flags > env > config precedence across lifecycle and compliance commands", async () => {
    const fileMint = Keypair.generate().publicKey;
    const envMint = Keypair.generate().publicKey;
    const flagMint = Keypair.generate().publicKey;
    const address = Keypair.generate().publicKey;
    const configPath = await writeConfig(
      [
        `mint = "${fileMint.toBase58()}"`,
        'variant = "SSS_1"',
        'rpc_url = "https://file-rpc.example"',
      ].join("\n")
    );

    const loadCalls: Array<{ mint: PublicKey; variant: string }> = [];
    const originalLoad = SolanaStablecoin.load;
    (SolanaStablecoin as any).load = async (_connection: unknown, mint: PublicKey, options: { variant: string }) => {
      loadCalls.push({ mint, variant: options.variant });
      return {
        variant: options.variant,
        getTotalSupply: async () => 1n,
        compliance: {
          isBlacklisted: async () => false,
        },
      };
    };

    const previousEnv = {
      SSS_TOKEN_CONFIG: process.env.SSS_TOKEN_CONFIG,
      SSS_TOKEN_MINT: process.env.SSS_TOKEN_MINT,
      SSS_TOKEN_VARIANT: process.env.SSS_TOKEN_VARIANT,
      SSS_TOKEN_RPC_URL: process.env.SSS_TOKEN_RPC_URL,
    };

    process.env.SSS_TOKEN_CONFIG = configPath;
    process.env.SSS_TOKEN_MINT = envMint.toBase58();
    process.env.SSS_TOKEN_VARIANT = "SSS_2";
    process.env.SSS_TOKEN_RPC_URL = "https://env-rpc.example";

    try {
      const supplyExit = await runCli([
        "node",
        "sss-token",
        "--mint",
        flagMint.toBase58(),
        "--variant",
        "SSS_1",
        "supply",
      ]);
      expect(supplyExit).to.equal(0);

      const blacklistExit = await runCli([
        "node",
        "sss-token",
        "blacklist",
        "check",
        address.toBase58(),
      ]);
      expect(blacklistExit).to.equal(0);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
      restoreEnvKey("SSS_TOKEN_CONFIG", previousEnv.SSS_TOKEN_CONFIG);
      restoreEnvKey("SSS_TOKEN_MINT", previousEnv.SSS_TOKEN_MINT);
      restoreEnvKey("SSS_TOKEN_VARIANT", previousEnv.SSS_TOKEN_VARIANT);
      restoreEnvKey("SSS_TOKEN_RPC_URL", previousEnv.SSS_TOKEN_RPC_URL);
    }

    expect(loadCalls).to.have.length(2);
    expect(loadCalls[0].mint.toBase58()).to.equal(flagMint.toBase58());
    expect(loadCalls[0].variant).to.equal("SSS_1");
    expect(loadCalls[1].mint.toBase58()).to.equal(envMint.toBase58());
    expect(loadCalls[1].variant).to.equal("SSS_2");
  });
});
