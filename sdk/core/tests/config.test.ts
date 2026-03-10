import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  parseStablecoinConfigString,
  validateStablecoinConfig,
  resolveStablecoinConfig,
  loadStablecoinConfigFile,
} from "../src/config";
import { SSS1_CONFIG } from "../src/presets";

describe("config parsing and validation", () => {
  it("normalizes equivalent JSON and TOML configs", () => {
    const jsonConfig = parseStablecoinConfigString(
      JSON.stringify({
        name: "My Stablecoin",
        symbol: "MUSD",
        uri: "https://example.com/metadata.json",
        decimals: 6,
        enable_permanent_delegate: true,
        enable_transfer_hook: true,
        default_account_frozen: false,
      }),
      "json"
    );

    const tomlConfig = parseStablecoinConfigString(
      [
        'name = "My Stablecoin"',
        'symbol = "MUSD"',
        'uri = "https://example.com/metadata.json"',
        "decimals = 6",
        "enable_permanent_delegate = true",
        "enable_transfer_hook = true",
        "default_account_frozen = false",
      ].join("\n"),
      "toml"
    );

    expect(jsonConfig).to.deep.equal(tomlConfig);
  });

  it("rejects unknown fields", () => {
    expect(() =>
      parseStablecoinConfigString(
        JSON.stringify({
          name: "My Stablecoin",
          symbol: "MUSD",
          unsupported_field: true,
        }),
        "json"
      )
    ).to.throw(/Unknown/);
  });

  it("rejects camelCase file keys and enforces snake_case schema", () => {
    expect(() =>
      parseStablecoinConfigString(
        JSON.stringify({
          name: "My Stablecoin",
          symbol: "MUSD",
          enablePermanentDelegate: true,
          enableTransferHook: true,
        }),
        "json"
      )
    ).to.throw(/Unknown config fields/);
  });

  it("rejects empty name or symbol", () => {
    expect(() =>
      parseStablecoinConfigString(
        JSON.stringify({
          name: "   ",
          symbol: "MUSD",
        }),
        "json"
      )
    ).to.throw();

    expect(() =>
      parseStablecoinConfigString(
        JSON.stringify({
          name: "My Stablecoin",
          symbol: "",
        }),
        "json"
      )
    ).to.throw();
  });

  it("rejects non-object config roots", () => {
    expect(() => parseStablecoinConfigString("[]", "json")).to.throw(
      /expected an object/
    );
  });

  it("rejects mixed compliance extension configuration", () => {
    expect(() =>
      validateStablecoinConfig({
        name: "My Stablecoin",
        symbol: "MUSD",
        uri: "",
        decimals: 6,
        enablePermanentDelegate: true,
        enableTransferHook: false,
        defaultAccountFrozen: false,
      })
    ).to.throw(/must both be true or both be false/);
  });

  it("applies merge precedence explicit > file > preset", () => {
    const resolved = resolveStablecoinConfig({
      presetConfig: SSS1_CONFIG,
      fileConfig: {
        name: "File Name",
        symbol: "FILE",
        uri: "https://file.example/metadata.json",
        decimals: 9,
        enablePermanentDelegate: false,
        enableTransferHook: false,
        defaultAccountFrozen: true,
      },
      explicitOptions: {
        name: "Explicit Name",
        symbol: "XUSD",
        decimals: 8,
        uri: "https://explicit.example/metadata.json",
        extensions: {
          defaultAccountFrozen: false,
        },
      },
    });

    expect(resolved).to.deep.equal({
      name: "Explicit Name",
      symbol: "XUSD",
      uri: "https://explicit.example/metadata.json",
      decimals: 8,
      enablePermanentDelegate: false,
      enableTransferHook: false,
      defaultAccountFrozen: false,
    });
  });

  it("loads config file from disk and infers format", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-config-"));
    const filePath = path.join(tempDir, "stablecoin.toml");
    await fs.writeFile(
      filePath,
      [
        'name = "Disk Stablecoin"',
        'symbol = "DUSD"',
        "enable_permanent_delegate = false",
        "enable_transfer_hook = false",
      ].join("\n"),
      "utf8"
    );

    const loaded = await loadStablecoinConfigFile(filePath);

    expect(loaded.name).to.equal("Disk Stablecoin");
    expect(loaded.symbol).to.equal("DUSD");
    expect(loaded.decimals).to.equal(6);
    expect(loaded.enablePermanentDelegate).to.equal(false);
    expect(loaded.enableTransferHook).to.equal(false);
  });

  it("honors explicit format override even when extension differs", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-config-"));
    const filePath = path.join(tempDir, "stablecoin.json");
    await fs.writeFile(
      filePath,
      ['name = "Toml Override"', 'symbol = "TOVR"'].join("\n"),
      "utf8"
    );

    const loaded = await loadStablecoinConfigFile(filePath, "toml");

    expect(loaded.name).to.equal("Toml Override");
    expect(loaded.symbol).to.equal("TOVR");
    expect(loaded.decimals).to.equal(6);
  });
});
