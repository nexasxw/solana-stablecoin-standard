import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Command } from "commander";
import { registerAdminCommands } from "../src/cli/commands/admin";
import { registerMinterCommands } from "../src/cli/commands/minters";
import { SolanaStablecoin } from "../src/stablecoin";

async function writeSignerFile(): Promise<string> {
  const signer = Keypair.generate();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sss-cli-admin-signer-"));
  const signerPath = path.join(dir, "authority.json");
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
  program.option("--authority-signer <path>");
  registerAdminCommands(program);
  registerMinterCommands(program);
  return program;
}

describe("CLI admin and minter commands", () => {
  it("routes roles update and authority transfer with parsed keys", async () => {
    const authoritySigner = await writeSignerFile();
    const mint = Keypair.generate().publicKey;
    const roleCalls: Array<Record<string, unknown>> = [];
    const transferCalls: Array<Record<string, unknown>> = [];
    const originalLoad = SolanaStablecoin.load;

    (SolanaStablecoin as any).load = async () => ({
      updateRoles: async (options: Record<string, unknown>) => {
        roleCalls.push(options);
        return { signature: "sig-roles" };
      },
      transferAuthority: async (options: Record<string, unknown>) => {
        transferCalls.push(options);
        return { signature: "sig-transfer" };
      },
    });

    const pauser = Keypair.generate().publicKey;
    const burner = Keypair.generate().publicKey;
    const newAuthority = Keypair.generate().publicKey;

    try {
      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_1",
        "--authority-signer",
        authoritySigner,
        "--yes",
        "--json",
        "roles",
        "update",
        "--pauser",
        pauser.toBase58(),
        "--burner",
        burner.toBase58(),
      ]);

      await buildProgram().parseAsync([
        "node",
        "sss-token",
        "--rpc-url",
        "http://127.0.0.1:8899",
        "--mint",
        mint.toBase58(),
        "--variant",
        "SSS_1",
        "--authority-signer",
        authoritySigner,
        "--yes",
        "--json",
        "authority",
        "transfer",
        newAuthority.toBase58(),
      ]);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
    }

    expect(roleCalls).to.have.length(1);
    expect((roleCalls[0].pauser as PublicKey).toBase58()).to.equal(pauser.toBase58());
    expect((roleCalls[0].burner as PublicKey).toBase58()).to.equal(burner.toBase58());
    expect(transferCalls).to.have.length(1);
    expect((transferCalls[0].newAuthority as PublicKey).toBase58()).to.equal(newAuthority.toBase58());
  });

  it("routes treasury and minter management commands", async () => {
    const authoritySigner = await writeSignerFile();
    const mint = Keypair.generate().publicKey;
    const treasury = Keypair.generate().publicKey;
    const minter = Keypair.generate().publicKey;
    const calls: Record<string, Array<Record<string, unknown>>> = {
      treasury: [],
      add: [],
      remove: [],
      get: [],
    };
    const originalLoad = SolanaStablecoin.load;

    (SolanaStablecoin as any).load = async () => ({
      setTreasury: async (treasuryTokenAccount: PublicKey, authority: unknown) => {
        calls.treasury.push({ treasuryTokenAccount, authority });
        return { signature: "sig-treasury" };
      },
      updateMinter: async (options: Record<string, unknown>) => {
        calls.add.push(options);
        return { signature: "sig-add" };
      },
      removeMinter: async (options: Record<string, unknown>) => {
        calls.remove.push(options);
        return { signature: "sig-remove" };
      },
      getMinterState: async (minterAddress: PublicKey) => {
        calls.get.push({ minterAddress });
        return {
          stablecoin: mint,
          minter: minterAddress,
          quota: 5000n,
          minted: 1200n,
          bump: 251,
        };
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
        "--authority-signer",
        authoritySigner,
        "--yes",
        "treasury",
        "set",
        treasury.toBase58(),
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
        "--authority-signer",
        authoritySigner,
        "--yes",
        "minters",
        "add",
        minter.toBase58(),
        "--quota",
        "5000",
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
        "--authority-signer",
        authoritySigner,
        "--yes",
        "minters",
        "remove",
        minter.toBase58(),
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
        "minters",
        "get",
        minter.toBase58(),
      ]);
    } finally {
      (SolanaStablecoin as any).load = originalLoad;
    }

    expect(calls.treasury).to.have.length(1);
    expect((calls.treasury[0].treasuryTokenAccount as PublicKey).toBase58()).to.equal(treasury.toBase58());
    expect(calls.add).to.have.length(1);
    expect(calls.add[0].quota).to.equal(5000n);
    expect(calls.remove).to.have.length(1);
    expect((calls.remove[0].minter as PublicKey).toBase58()).to.equal(minter.toBase58());
    expect(calls.get).to.have.length(1);
    expect((calls.get[0].minterAddress as PublicKey).toBase58()).to.equal(minter.toBase58());
  });
});
