import { expect } from "chai";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { SolanaStablecoin } from "../src/stablecoin";
import { SdkErrorCode, StablecoinSdkError } from "../src/errors";
import { StablecoinVariant } from "../src/types";

interface MockCall {
  method: string;
  args: unknown[];
  accounts?: Record<string, unknown>;
  signers?: unknown[];
}

interface HarnessOptions {
  variant?: StablecoinVariant;
  failMethod?: string;
}

function buildMethod(
  calls: MockCall[],
  name: string,
  shouldFail: boolean
): (...args: unknown[]) => {
  accounts: (accounts: Record<string, unknown>) => {
    signers: (signers: unknown[]) => { rpc: () => Promise<string> };
  };
} {
  return (...args: unknown[]) => {
    const call: MockCall = { method: name, args };
    calls.push(call);

    return {
      accounts: (accounts: Record<string, unknown>) => {
        call.accounts = accounts;
        return {
          signers: (signers: unknown[]) => {
            call.signers = signers;
            return {
              rpc: async (): Promise<string> => {
                if (shouldFail) {
                  throw new Error(`rpc-failed-${name}`);
                }
                return `${name}-sig`;
              },
            };
          },
        };
      },
    };
  };
}

async function createHarness(options: HarnessOptions = {}): Promise<{
  stablecoin: SolanaStablecoin;
  calls: MockCall[];
}> {
  const calls: MockCall[] = [];
  const variant = options.variant ?? "SSS_1";
  const authority = Keypair.generate();
  const connection = new Connection("http://127.0.0.1:8899", "processed");
  const mint = Keypair.generate().publicKey;
  const stablecoin = await SolanaStablecoin.load(connection, mint, { variant, authority });

  const methods: Record<string, (...args: unknown[]) => unknown> = {
    mint: buildMethod(calls, "mint", options.failMethod === "mint"),
    burn: buildMethod(calls, "burn", options.failMethod === "burn"),
    freezeAccount: buildMethod(calls, "freezeAccount", options.failMethod === "freezeAccount"),
    thawAccount: buildMethod(calls, "thawAccount", options.failMethod === "thawAccount"),
    pause: buildMethod(calls, "pause", options.failMethod === "pause"),
    unpause: buildMethod(calls, "unpause", options.failMethod === "unpause"),
    updateMinter: buildMethod(calls, "updateMinter", options.failMethod === "updateMinter"),
    removeMinter: buildMethod(calls, "removeMinter", options.failMethod === "removeMinter"),
    transferAuthority: buildMethod(calls, "transferAuthority", options.failMethod === "transferAuthority"),
    updateRoles: buildMethod(calls, "updateRoles", options.failMethod === "updateRoles"),
    setTreasury: buildMethod(calls, "setTreasury", options.failMethod === "setTreasury"),
  };

  (stablecoin as any).connection = {
    commitment: "processed",
    getSignatureStatuses: async () => ({
      value: [
        {
          confirmationStatus: "confirmed",
          slot: 77,
          confirmations: 1,
        },
      ],
    }),
    getTokenSupply: async () => ({ value: { amount: "0" } }),
  } as unknown as Connection;

  (stablecoin as any).program = {
    programId: Keypair.generate().publicKey,
    methods,
    account: {
      stablecoin: {
        fetch: async () => ({
          authority: Keypair.generate().publicKey,
          mint,
          pauser: Keypair.generate().publicKey,
          burner: Keypair.generate().publicKey,
          blacklister: variant === "SSS_2" ? Keypair.generate().publicKey : undefined,
          seizer: variant === "SSS_2" ? Keypair.generate().publicKey : undefined,
          treasuryTokenAccount: variant === "SSS_2" ? Keypair.generate().publicKey : undefined,
          paused: false,
          permanentDelegateEnabled: variant === "SSS_2",
          transferHookEnabled: variant === "SSS_2",
        }),
      },
      minterConfig: {
        fetchNullable: async () => ({
          stablecoin: Keypair.generate().publicKey,
          minter: Keypair.generate().publicKey,
          quota: { toString: () => "1000" },
          minted: { toString: () => "20" },
          bump: 253,
        }),
      },
    },
  };

  return { stablecoin, calls };
}

describe("SolanaStablecoin lifecycle mutations", () => {
  it("returns tx envelope for mint and enforces explicit minter signer", async () => {
    const { stablecoin, calls } = await createHarness();
    const minter = Keypair.generate();
    const recipientTokenAccount = Keypair.generate().publicKey;

    const result = await stablecoin.mint({
      minter,
      recipientTokenAccount,
      amount: 42n,
    });

    expect(result.signature).to.equal("mint-sig");
    expect(result.confirmation.slot).to.equal(77);
    expect(result.confirmation.confirmationStatus).to.equal("confirmed");

    const mintCall = calls.find((call) => call.method === "mint");
    expect(mintCall).to.not.equal(undefined);
    expect((mintCall?.accounts?.minter as PublicKey).toBase58()).to.equal(minter.publicKey.toBase58());
    expect(mintCall?.signers).to.deep.equal([minter]);
  });

  it("rejects non-bigint or out-of-range amounts with stable error code", async () => {
    const { stablecoin } = await createHarness();
    const burner = Keypair.generate();
    const burnerTokenAccount = Keypair.generate().publicKey;

    const invalidAmounts: unknown[] = [1, -1n, (1n << 64n)];

    for (const amount of invalidAmounts) {
      try {
        await stablecoin.burn({
          burner,
          burnerTokenAccount,
          amount: amount as bigint,
        });
        expect.fail("Expected burn to throw for invalid amount");
      } catch (error) {
        expect(error).to.be.instanceOf(StablecoinSdkError);
        expect((error as StablecoinSdkError).code).to.equal(SdkErrorCode.INVALID_AMOUNT);
      }
    }
  });

  it("rejects missing signers and no-op role updates with deterministic local errors", async () => {
    const { stablecoin } = await createHarness();

    try {
      await stablecoin.pause({ authority: null as unknown as Keypair });
      expect.fail("Expected pause to reject missing signer");
    } catch (error) {
      expect((error as StablecoinSdkError).code).to.equal(SdkErrorCode.MISSING_SIGNER);
    }

    try {
      await stablecoin.updateRoles({ authority: Keypair.generate() });
      expect.fail("Expected updateRoles to reject no-op updates");
    } catch (error) {
      expect((error as StablecoinSdkError).code).to.equal(SdkErrorCode.INVALID_ARGUMENT);
    }
  });

  it("rejects SSS-1 blacklister/seizer role updates locally", async () => {
    const { stablecoin } = await createHarness({ variant: "SSS_1" });

    try {
      await stablecoin.updateRoles({
        authority: Keypair.generate(),
        blacklister: Keypair.generate().publicKey,
      });
      expect.fail("Expected updateRoles to reject compliance roles for SSS_1");
    } catch (error) {
      expect((error as StablecoinSdkError).code).to.equal(SdkErrorCode.UNSUPPORTED_OPERATION);
    }
  });

  it("normalizes rpc errors into stable sdk rpc error code", async () => {
    const { stablecoin } = await createHarness({ failMethod: "freezeAccount" });

    try {
      await stablecoin.freeze({
        tokenAccount: Keypair.generate().publicKey,
        pauser: Keypair.generate(),
      });
      expect.fail("Expected freeze to surface RPC error");
    } catch (error) {
      expect(error).to.be.instanceOf(StablecoinSdkError);
      const sdkError = error as StablecoinSdkError;
      expect(sdkError.code).to.equal(SdkErrorCode.RPC_ERROR);
      expect(sdkError.details?.operation).to.equal("freezeAccount");
    }
  });

  it("fetches typed state and minter helper data", async () => {
    const { stablecoin } = await createHarness({ variant: "SSS_2" });
    const state = await stablecoin.getState();

    expect(state.permanentDelegateEnabled).to.equal(true);
    expect(state.transferHookEnabled).to.equal(true);
    expect(state.blacklister).to.not.equal(undefined);
    expect(state.seizer).to.not.equal(undefined);
    expect(state.treasuryTokenAccount).to.not.equal(undefined);

    const minterState = await stablecoin.getMinterState(Keypair.generate().publicKey);
    expect(minterState?.quota).to.equal(1000n);
    expect(minterState?.minted).to.equal(20n);

    const hasMinter = await stablecoin.hasMinter(Keypair.generate().publicKey);
    expect(hasMinter).to.equal(true);

    (stablecoin as any).program.account.minterConfig.fetchNullable = async () => null;
    const noMinter = await stablecoin.hasMinter(Keypair.generate().publicKey);
    expect(noMinter).to.equal(false);
  });
});
