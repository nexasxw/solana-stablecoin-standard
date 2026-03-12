# SDK Usage Contract (`@stbr/sss-token`)

This document is the executable contract for the TypeScript SDK surface shipped in `sdk/core/src`.

## Prerequisites

- Node.js and Yarn installed.
- Dependencies installed from repository root:
  - `yarn install`
- Anchor programs built so IDLs and program addresses are available to the SDK client:
  - `anchor build`
- A reachable Solana RPC endpoint (default local validator is `http://127.0.0.1:8899`).
- Authority/role keypairs loaded as `Keypair` instances in your app.

## Source Of Truth And Interface Parity

- Primary source of truth:
  - `sdk/core/src/stablecoin.ts`
  - `sdk/core/src/compliance.ts`
  - `sdk/core/src/types.ts`
  - `sdk/core/src/errors.ts`
- CLI parity lane (same SDK under the hood):
  - `./scripts/sss-token`

If this doc conflicts with the files above, treat code as canonical.

## Initialize Stablecoins

```ts
import { Connection, Keypair } from "@solana/web3.js";
import { Presets, SolanaStablecoin } from "@stbr/sss-token";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const authority = Keypair.fromSecretKey(/* Uint8Array secret key bytes */);
```

### Initialize SSS-1

```ts
const sss1 = await SolanaStablecoin.create(connection, {
  authority,
  preset: Presets.SSS_1,
  name: "USD Internal",
  symbol: "USDI",
  decimals: 6,
});
```

### Initialize SSS-2

```ts
const sss2 = await SolanaStablecoin.create(connection, {
  authority,
  preset: Presets.SSS_2,
  name: "USD Compliant",
  symbol: "USDCM",
  decimals: 6,
});
```

### Initialize Custom Configuration

You can use `--custom` in CLI or `configFile` in SDK for `.json/.toml` config contracts.

```ts
const custom = await SolanaStablecoin.create(connection, {
  authority,
  configFile: "./stablecoin.toml",
  name: "USD Custom",
  symbol: "USDX",
  extensions: {
    permanentDelegate: false,
    transferHook: false,
  },
});
```

## Load Existing Deployment

```ts
import { PublicKey } from "@solana/web3.js";

const mint = new PublicKey("ReplaceWithMintAddress");
const stable = await SolanaStablecoin.load(connection, mint, {
  variant: "SSS_1",
});
```

## Lifecycle Operations

### mint

```ts
await stable.mint({
  minter: Keypair.fromSecretKey(/* minter secret */),
  recipientTokenAccount: new PublicKey("RecipientTokenAccount"),
  amount: 1_000_000n,
});
```

### burn

```ts
await stable.burn({
  burner: Keypair.fromSecretKey(/* burner secret */),
  burnerTokenAccount: new PublicKey("BurnerTokenAccount"),
  amount: 500_000n,
});
```

### freeze and thaw

```ts
await stable.freeze({
  pauser: Keypair.fromSecretKey(/* pauser secret */),
  tokenAccount: new PublicKey("TargetTokenAccount"),
});

await stable.thaw({
  pauser: Keypair.fromSecretKey(/* pauser secret */),
  tokenAccount: new PublicKey("TargetTokenAccount"),
});
```

### pause and unpause

```ts
await stable.pause({
  authority: Keypair.fromSecretKey(/* authority secret */),
});

await stable.unpause({
  authority: Keypair.fromSecretKey(/* authority secret */),
});
```

## Read Operations

```ts
const supply = await stable.getTotalSupply();
const state = await stable.getState();
const minterState = await stable.getMinterState(new PublicKey("Minter"));
```

## SSS-2 Compliance Availability

- `stable.compliance` is:
  - `null` for `SSS_1`
  - `ComplianceModule` for `SSS_2`
- Do not call compliance helpers unless variant is `SSS_2`.

## Failure-Path Contract

SDK errors are machine-branchable via `SdkErrorCode` (`sdk/core/src/errors.ts`):

- `VALIDATION_FAILED`
- `INVALID_ARGUMENT`
- `INVALID_REASON`
- `INVALID_AMOUNT`
- `MISSING_SIGNER`
- `UNSUPPORTED_OPERATION`
- `RPC_ERROR`

Common failures:

- Passing non-`PublicKey` for `recipientTokenAccount` or other key fields -> `INVALID_ARGUMENT`.
- Passing non-`bigint`, negative, or `> u64` amounts -> `INVALID_AMOUNT`.
- Missing signer object for role fields (`authority`, `minter`, etc.) -> `MISSING_SIGNER`.
- Attempting SSS-2-only role updates on `SSS_1` -> `UNSUPPORTED_OPERATION`.
- Network/cluster failures during RPC execution -> `RPC_ERROR`.

## CLI Parity Reference

The CLI invokes the same SDK flows and is the fastest parity check:

```bash
./scripts/sss-token init --help
./scripts/sss-token mint --help
./scripts/sss-token burn --help
./scripts/sss-token freeze --help
./scripts/sss-token thaw --help
./scripts/sss-token pause --help
./scripts/sss-token unpause --help
```

