# SDK Reference

## Prerequisites

- Node.js 20+
- Yarn 1.x workspace tooling
- Anchor CLI 0.31+
- Solana CLI configured for the target cluster
- Repository dependencies installed with `yarn install`
- A `Connection` and role `Keypair` values for `authority`, `minter`, `burner`, and `pauser`

## Scope

This document captures shipped SDK behavior for the current repository state.

## Source Of Truth And Interface Parity

- Package: `@stbr/sss-token`
- Source: `sdk/core/src/`
- Canonical class: `sdk/core/src/stablecoin.ts` (`SolanaStablecoin`)
- Canonical preset selector: `sdk/core/src/presets.ts` (`Presets.SSS_1`, `Presets.SSS_2`)
- CLI parity surface: `sdk/core/src/cli/commands/*.ts` and wrapper `./scripts/sss-token`

All examples below are limited to methods and options currently exported and implemented in the shipped SDK.

## Initialization Workflows

### SSS-1 Preset Initialization

```ts
import { Connection, Keypair } from "@solana/web3.js";
import { Presets, SolanaStablecoin } from "@stbr/sss-token";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const authority = Keypair.generate();

const sss1 = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "Treasury USD",
  symbol: "TUSD",
  decimals: 6,
  authority,
});
```

### SSS-2 Preset Initialization

```ts
import { Connection, Keypair } from "@solana/web3.js";
import { Presets, SolanaStablecoin } from "@stbr/sss-token";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const authority = Keypair.generate();

const sss2 = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "Compliant USD",
  symbol: "CUSD",
  decimals: 6,
  authority,
});
```

### Custom Initialization Guidance

SDK initialization precedence is deterministic:

1. explicit runtime options
2. config file values
3. preset defaults

```ts
import { Connection, Keypair } from "@solana/web3.js";
import { SolanaStablecoin } from "@stbr/sss-token";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const authority = Keypair.generate();

const custom = await SolanaStablecoin.create(connection, {
  authority,
  configFile: "./stablecoin.toml",
  configFormat: "toml",
  name: "Override Name",
  symbol: "OVR",
});
```

Configuration file contract:

- file keys must be `snake_case`
- unknown fields are rejected
- non-object roots are rejected
- unsupported preset values fail at runtime

## Lifecycle Operations

```ts
import { Keypair, PublicKey } from "@solana/web3.js";
import { SolanaStablecoin } from "@stbr/sss-token";

declare const stablecoin: SolanaStablecoin;
declare const minter: Keypair;
declare const burner: Keypair;
declare const pauser: Keypair;
declare const recipientTokenAccount: PublicKey;
declare const burnerTokenAccount: PublicKey;
declare const targetTokenAccount: PublicKey;

await stablecoin.mint({
  minter,
  recipientTokenAccount,
  amount: 1_000_000n,
});

await stablecoin.burn({
  burner,
  burnerTokenAccount,
  amount: 500_000n,
});

await stablecoin.freeze({
  pauser,
  tokenAccount: targetTokenAccount,
});

await stablecoin.thaw({
  pauser,
  tokenAccount: targetTokenAccount,
});

await stablecoin.pause({ pauser });
await stablecoin.unpause({ pauser });
```

Read surfaces:

- `await stablecoin.getState()`
- `await stablecoin.getTotalSupply()`
- `await stablecoin.getMinterState(minterPublicKey)`

## CLI Cross-Check Surface

Use these commands from repository root to verify SDK/CLI parity:

```bash
./scripts/sss-token --help
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token burn --help
./scripts/sss-token freeze --help
./scripts/sss-token thaw --help
./scripts/sss-token pause --help
./scripts/sss-token unpause --help
```

## Verification References

- `docs/testing/phase-08-command-truth.md`
- `docs/testing/phase-08-regression-matrix.md`
- `.planning/phases/09-documentation/09-VALIDATION.md`
