import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Keypair } from "@solana/web3.js";
import { resolveRuntimeConfig } from "../src/cli/config";
import { CliConfigError, CliSignerError } from "../src/cli/errors";
import { resolveSignerConfig } from "../src/cli/signer";

async function writeTomlConfig(content: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-cli-config-"));
  const filePath = path.join(tempDir, "runtime.toml");
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

describe("CLI runtime config resolution", () => {
  it("applies precedence as flags > env > file", async () => {
    const fileMint = Keypair.generate().publicKey.toBase58();
    const envMint = Keypair.generate().publicKey.toBase58();
    const flagMint = Keypair.generate().publicKey.toBase58();
    const configPath = await writeTomlConfig(
      [
        'rpc_url = "https://file-rpc.example"',
        `mint = "${fileMint}"`,
        'variant = "SSS_1"',
        'default_signer = "/file/default.json"',
      ].join("\n")
    );

    const resolved = resolveRuntimeConfig({
      flags: {
        config: configPath,
        rpcUrl: "https://flag-rpc.example",
        mint: flagMint,
        variant: "SSS_2",
        authoritySigner: "/flag/authority.json",
      },
      env: {
        SSS_TOKEN_RPC_URL: "https://env-rpc.example",
        SSS_TOKEN_MINT: envMint,
        SSS_TOKEN_VARIANT: "SSS_1",
        SSS_TOKEN_SIGNER: "/env/default.json",
      },
    });

    expect(resolved.rpcUrl).to.equal("https://flag-rpc.example");
    expect(resolved.mint?.toBase58()).to.equal(flagMint);
    expect(resolved.variant).to.equal("SSS_2");
    expect(resolved.signers.defaultSigner).to.equal("/env/default.json");
    expect(resolved.signers.byRole.authority).to.equal("/flag/authority.json");
    expect(resolved.signers.byRole.minter).to.equal("/env/default.json");
  });

  it("uses env when flags are absent and falls back to file defaults", async () => {
    const fileMint = Keypair.generate().publicKey.toBase58();
    const envMint = Keypair.generate().publicKey.toBase58();
    const configPath = await writeTomlConfig(
      [
        'rpc_url = "https://file-rpc.example"',
        `mint = "${fileMint}"`,
        'variant = "SSS_1"',
      ].join("\n")
    );

    const resolved = resolveRuntimeConfig({
      flags: { config: configPath },
      env: {
        SSS_TOKEN_RPC_URL: "https://env-rpc.example",
        SSS_TOKEN_MINT: envMint,
        SSS_TOKEN_VARIANT: "SSS_2",
      },
    });

    expect(resolved.rpcUrl).to.equal("https://env-rpc.example");
    expect(resolved.mint?.toBase58()).to.equal(envMint);
    expect(resolved.variant).to.equal("SSS_2");
  });

  it("fails fast when explicit config path does not exist", () => {
    expect(() =>
      resolveRuntimeConfig({
        flags: { config: "/tmp/sss-token-missing-config.toml" },
        env: {},
      })
    ).to.throw(CliConfigError, /Config file not found/);
  });

  it("rejects unknown config fields with a stable config error category", async () => {
    const configPath = await writeTomlConfig(
      [
        'rpc_url = "https://file-rpc.example"',
        'unsupported_field = true',
      ].join("\n")
    );

    try {
      resolveRuntimeConfig({
        flags: { config: configPath },
        env: {},
      });
      expect.fail("Expected strict config schema validation to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(CliConfigError);
      expect((error as CliConfigError).code).to.equal("CLI_CONFIG");
    }
  });

  it("resolves signer paths by role and fails when required role signer is missing", () => {
    const resolved = resolveSignerConfig({
      flags: { defaultSigner: "/flag/default.json" },
      env: { SSS_TOKEN_MINTER_SIGNER: "/env/minter.json" },
      file: { defaultSigner: "/file/default.json" },
      requiredRoles: ["minter"],
    });

    expect(resolved.defaultSigner).to.equal("/flag/default.json");
    expect(resolved.byRole.minter).to.equal("/env/minter.json");
    expect(resolved.byRole.burner).to.equal("/flag/default.json");

    expect(() =>
      resolveSignerConfig({
        flags: {},
        env: {},
        file: {},
        requiredRoles: ["authority"],
      })
    ).to.throw(CliSignerError, /Missing signer for required role: authority/);
  });
});
