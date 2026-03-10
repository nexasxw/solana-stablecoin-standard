import { expect } from "chai";
import { Presets, SSS1_CONFIG, SSS2_CONFIG, getPresetConfig, PresetConfig } from "../src/presets";

describe("presets", () => {
  it("returns canonical SSS-1 preset", () => {
    const preset = getPresetConfig(Presets.SSS_1);
    const expected: PresetConfig = {
      decimals: 6,
      enablePermanentDelegate: false,
      enableTransferHook: false,
      defaultAccountFrozen: false,
    };

    expect(preset).to.deep.equal(expected);
    expect(SSS1_CONFIG.enablePermanentDelegate).to.equal(false);
    expect(SSS1_CONFIG.enableTransferHook).to.equal(false);
  });

  it("returns canonical SSS-2 preset", () => {
    const preset = getPresetConfig(Presets.SSS_2);
    const expected: PresetConfig = {
      decimals: 6,
      enablePermanentDelegate: true,
      enableTransferHook: true,
      defaultAccountFrozen: false,
    };

    expect(preset).to.deep.equal(expected);
    expect(SSS2_CONFIG.enablePermanentDelegate).to.equal(true);
    expect(SSS2_CONFIG.enableTransferHook).to.equal(true);
  });

  it("returns a defensive copy", () => {
    const first = getPresetConfig(Presets.SSS_1);
    first.decimals = 9;
    const second = getPresetConfig(Presets.SSS_1);

    expect(second.decimals).to.equal(6);
  });

  it("rejects unsupported preset values", () => {
    expect(() => getPresetConfig("SSS_3")).to.throw(/Unsupported preset/);
  });
});
