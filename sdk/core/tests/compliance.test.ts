import { expect } from "chai";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { SolanaStablecoin } from "../src/stablecoin";
import { ComplianceModule } from "../src/compliance";
import { Presets } from "../src/presets";
import { SdkErrorCode, StablecoinSdkError } from "../src/errors";

interface MockComplianceCall {
  operation: "blacklistAdd" | "blacklistRemove" | "seize";
  args: unknown[];
  accounts?: Record<string, unknown>;
  signers?: unknown[];
}

function buildMethod(
  calls: MockComplianceCall[],
  operation: MockComplianceCall["operation"],
  shouldFail: boolean
): (...args: unknown[]) => {
  accounts: (accounts: Record<string, unknown>) => {
    signers: (signers: unknown[]) => { rpc: () => Promise<string> };
  };
} {
  return (...args: unknown[]) => {
    const call: MockComplianceCall = { operation, args };
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
                  throw new Error(`rpc-failed-${operation}`);
                }
                return `${operation}-sig`;
              },
            };
          },
        };
      },
    };
  };
}

function createComplianceHarness(options: { enabled?: boolean; failOperation?: MockComplianceCall["operation"] } = {}): {
  module: ComplianceModule;
  calls: MockComplianceCall[];
} {
  const calls: MockComplianceCall[] = [];
  const stablecoin = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;

  const module = new ComplianceModule(
    { commitment: "processed" } as unknown as Connection,
    {
      programId: Keypair.generate().publicKey,
      methods: {
        addToBlacklist: buildMethod(calls, "blacklistAdd", options.failOperation === "blacklistAdd"),
        removeFromBlacklist: buildMethod(calls, "blacklistRemove", options.failOperation === "blacklistRemove"),
        seize: buildMethod(calls, "seize", options.failOperation === "seize"),
      },
    } as any,
    stablecoin,
    mint,
    { enabled: options.enabled }
  );

  return { module, calls };
}

describe("SSS-2 compliance helpers", () => {
  it("returns typed transaction metadata and trims blacklist reason", async () => {
    const { module, calls } = createComplianceHarness({ enabled: true });
    const address = Keypair.generate().publicKey;
    const blacklister = Keypair.generate();

    const result = await module.blacklistAdd(address, "  OFAC match  ", blacklister);

    expect(result.operation).to.equal("blacklistAdd");
    expect(result.signature).to.equal("blacklistAdd-sig");
    expect(result.confirmation.commitment).to.equal("processed");

    const call = calls.find((entry) => entry.operation === "blacklistAdd");
    expect(call?.args[0]).to.equal("OFAC match");
    expect(call?.signers).to.deep.equal([blacklister]);
  });

  it("rejects empty or whitespace-only blacklist reasons preflight", async () => {
    const { module } = createComplianceHarness({ enabled: true });
    const address = Keypair.generate().publicKey;
    const blacklister = Keypair.generate();

    try {
      await module.blacklistAdd(address, "   ", blacklister);
      expect.fail("Expected blacklistAdd to reject empty reason");
    } catch (error) {
      expect(error).to.be.instanceOf(StablecoinSdkError);
      expect((error as StablecoinSdkError).code).to.equal(SdkErrorCode.INVALID_REASON);
    }
  });

  it("requires explicit operator signer inputs for blacklist and seize mutations", async () => {
    const { module } = createComplianceHarness({ enabled: true });
    const address = Keypair.generate().publicKey;
    const fromTokenAccount = Keypair.generate().publicKey;
    const targetOwner = Keypair.generate().publicKey;
    const treasuryTokenAccount = Keypair.generate().publicKey;

    const missingSignerCases: Array<() => Promise<unknown>> = [
      () => module.blacklistAdd(address, "reason", null as unknown as Keypair),
      () => module.blacklistRemove(address, {} as Keypair),
      () => module.seize(fromTokenAccount, targetOwner, treasuryTokenAccount, null as unknown as Keypair),
    ];

    for (const runCase of missingSignerCases) {
      try {
        await runCase();
        expect.fail("Expected compliance method to reject missing signer");
      } catch (error) {
        expect(error).to.be.instanceOf(StablecoinSdkError);
        expect((error as StablecoinSdkError).code).to.equal(SdkErrorCode.MISSING_SIGNER);
      }
    }
  });

  it("preserves explicit seize account tuple and returns typed metadata", async () => {
    const { module, calls } = createComplianceHarness({ enabled: true });
    const seizer = Keypair.generate();
    const fromTokenAccount = Keypair.generate().publicKey;
    const targetOwner = Keypair.generate().publicKey;
    const treasuryTokenAccount = Keypair.generate().publicKey;

    const result = await module.seize(
      fromTokenAccount,
      targetOwner,
      treasuryTokenAccount,
      seizer
    );

    expect(result.operation).to.equal("seize");
    expect(result.signature).to.equal("seize-sig");

    const call = calls.find((entry) => entry.operation === "seize");
    expect((call?.accounts?.fromTokenAccount as PublicKey).toBase58()).to.equal(fromTokenAccount.toBase58());
    expect((call?.accounts?.targetOwner as PublicKey).toBase58()).to.equal(targetOwner.toBase58());
    expect((call?.accounts?.treasuryTokenAccount as PublicKey).toBase58()).to.equal(treasuryTokenAccount.toBase58());
    expect(call?.signers).to.deep.equal([seizer]);
  });

  it("maps unexpected compliance rpc failures to stable rpc error code", async () => {
    const { module } = createComplianceHarness({
      enabled: true,
      failOperation: "blacklistRemove",
    });

    try {
      await module.blacklistRemove(Keypair.generate().publicKey, Keypair.generate());
      expect.fail("Expected blacklistRemove to surface RPC error");
    } catch (error) {
      expect(error).to.be.instanceOf(StablecoinSdkError);
      const sdkError = error as StablecoinSdkError;
      expect(sdkError.code).to.equal(SdkErrorCode.RPC_ERROR);
      expect(sdkError.details?.operation).to.equal("blacklistRemove");
    }
  });

  it("keeps compliance inaccessible for SSS-1 and returns explicit unsupported errors otherwise", async () => {
    const connection = new Connection("http://127.0.0.1:8899", "processed");
    const sss1Stablecoin = await SolanaStablecoin.load(
      connection,
      Keypair.generate().publicKey,
      { variant: Presets.SSS_1, authority: Keypair.generate() }
    );
    expect(sss1Stablecoin.compliance).to.equal(null);

    const { module } = createComplianceHarness({ enabled: false });
    try {
      await module.blacklistRemove(Keypair.generate().publicKey, Keypair.generate());
      expect.fail("Expected disabled compliance module to reject mutation");
    } catch (error) {
      expect(error).to.be.instanceOf(StablecoinSdkError);
      expect((error as StablecoinSdkError).code).to.equal(SdkErrorCode.UNSUPPORTED_OPERATION);
    }
  });
});
