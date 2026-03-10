import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Connection, Keypair } from "@solana/web3.js";
import { SolanaStablecoin } from "../src/stablecoin";
import { Presets } from "../src/presets";
import { CreateOptions } from "../src/types";
import { SdkErrorCode, StablecoinSdkError } from "../src/errors";

const connection = new Connection("http://127.0.0.1:8899", "processed");

function createBaseOptions(overrides: Partial<CreateOptions> = {}): CreateOptions {
  return {
    authority: Keypair.generate(),
    name: "Stable USD",
    symbol: "SUSD",
    ...overrides,
  };
}

async function expectCreateError(
  options: CreateOptions,
  expectedMessage: RegExp,
  expectedCode: SdkErrorCode = SdkErrorCode.VALIDATION_FAILED
): Promise<void> {
  try {
    await SolanaStablecoin.create(connection, options);
    expect.fail("Expected SolanaStablecoin.create to throw");
  } catch (error) {
    expect(error).to.be.instanceOf(StablecoinSdkError);
    expect((error as StablecoinSdkError).code).to.equal(expectedCode);
    const message = error instanceof Error ? error.message : String(error);
    expect(message).to.match(expectedMessage);
  }
}

async function expectLoadError(
  options: Parameters<typeof SolanaStablecoin.load>[2],
  expectedMessage: RegExp,
  expectedCode: SdkErrorCode = SdkErrorCode.VALIDATION_FAILED
): Promise<void> {
  try {
    await SolanaStablecoin.load(connection, Keypair.generate().publicKey, options);
    expect.fail("Expected SolanaStablecoin.load to throw");
  } catch (error) {
    expect(error).to.be.instanceOf(StablecoinSdkError);
    expect((error as StablecoinSdkError).code).to.equal(expectedCode);
    const message = error instanceof Error ? error.message : String(error);
    expect(message).to.match(expectedMessage);
  }
}

async function writeTempConfig(content: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-create-config-"));
  const configPath = path.join(tempDir, "stablecoin.json");
  await fs.writeFile(configPath, content, "utf8");
  return configPath;
}

describe("SolanaStablecoin.create preset/config integration", () => {
  it("creates SSS-1 with compliance disabled by default", async () => {
    const stablecoin = await SolanaStablecoin.create(
      connection,
      createBaseOptions({ preset: Presets.SSS_1 })
    );

    expect(stablecoin.initialization).to.not.equal(null);
    expect(stablecoin.initialization?.signature).to.match(/^simulated-init-/);
    expect(stablecoin.variant).to.equal("SSS_1");
    expect(stablecoin.compliance).to.equal(null);
  });

  it("creates SSS-2 with compliance enabled by default", async () => {
    const stablecoin = await SolanaStablecoin.create(
      connection,
      createBaseOptions({ preset: Presets.SSS_2 })
    );

    expect(stablecoin.variant).to.equal("SSS_2");
    expect(stablecoin.compliance).to.not.equal(null);
  });

  it("rejects SSS-1 when compliance extensions are explicitly enabled", async () => {
    await expectCreateError(
      createBaseOptions({
        preset: Presets.SSS_1,
        extensions: {
          permanentDelegate: true,
          transferHook: true,
        },
      }),
      /SSS_1 preset is incompatible/
    );
  });

  it("rejects SSS-2 when compliance extensions are explicitly disabled", async () => {
    await expectCreateError(
      createBaseOptions({
        preset: Presets.SSS_2,
        extensions: {
          permanentDelegate: false,
          transferHook: false,
        },
      }),
      /SSS_2 preset requires both/
    );
  });

  it("rejects unsupported preset values", async () => {
    await expectCreateError(
      createBaseOptions({
        preset: "SSS_3" as unknown as "SSS_1",
      }),
      /Unsupported preset/
    );
  });

  it("enforces file-over-preset precedence on compatibility checks", async () => {
    const configPath = await writeTempConfig(
      JSON.stringify({
        name: "File Stable",
        symbol: "FILE",
        enable_permanent_delegate: false,
        enable_transfer_hook: false,
      })
    );

    await expectCreateError(
      createBaseOptions({
        preset: Presets.SSS_2,
        configFile: configPath,
      }),
      /SSS_2 preset requires both/
    );
  });

  it("enforces explicit-over-file precedence for extension flags", async () => {
    const configPath = await writeTempConfig(
      JSON.stringify({
        name: "File Stable",
        symbol: "FILE",
        enable_permanent_delegate: true,
        enable_transfer_hook: true,
      })
    );

    const stablecoin = await SolanaStablecoin.create(
      connection,
      createBaseOptions({
        configFile: configPath,
        extensions: {
          permanentDelegate: false,
          transferHook: false,
        },
      })
    );

    expect(stablecoin.compliance).to.equal(null);
    expect(stablecoin.variant).to.equal("SSS_1");
  });

  it("loads deterministic SSS-1 variant from explicit load variant", async () => {
    const loaded = await SolanaStablecoin.load(
      connection,
      Keypair.generate().publicKey,
      { variant: "SSS_1" }
    );

    expect(loaded.variant).to.equal("SSS_1");
    expect(loaded.compliance).to.equal(null);
  });

  it("loads deterministic SSS-2 variant from legacy isSSS2 option", async () => {
    const loaded = await SolanaStablecoin.load(
      connection,
      Keypair.generate().publicKey,
      true
    );

    expect(loaded.variant).to.equal("SSS_2");
    expect(loaded.compliance).to.not.equal(null);
  });

  it("prioritizes explicit load variant over boolean load hints", async () => {
    const loaded = await SolanaStablecoin.load(
      connection,
      Keypair.generate().publicKey,
      { variant: "SSS_1", isSSS2: true }
    );

    expect(loaded.variant).to.equal("SSS_1");
    expect(loaded.compliance).to.equal(null);
  });

  it("returns stable validation error code for invalid load extension hints", async () => {
    await expectLoadError(
      {
        extensions: {
          permanentDelegate: true,
        },
      },
      /must provide both/
    );
  });
});
