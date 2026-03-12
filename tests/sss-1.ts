import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Keypair } from "@solana/web3.js";
import { expect } from "chai";

import {
  RENT_SYSVAR,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  airdrop,
  confirmSignature,
  createToken2022Ata,
  expectAnchorError,
  fetchToken2022Account,
  fetchToken2022Mint,
  findMinterPda,
  findStablecoinPda,
  newKeypair,
  toSignerArray,
} from "./helpers";

describe("SSS-1: Minimal Stablecoin", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sss1 as Program<any>;
  const authority = newKeypair();
  const minter = newKeypair();
  const user = newKeypair();
  const newAuthority = newKeypair();
  const mint = newKeypair();

  let stablecoinPda: anchor.web3.PublicKey;
  let minterPda: anchor.web3.PublicKey;
  let userAta: anchor.web3.PublicKey;
  let initialUserBalance = 0n;

  const config = {
    name: "Stable Real",
    symbol: "SRL",
    uri: "https://example.com/srl.json",
    decimals: 6,
    enablePermanentDelegate: false,
    enableTransferHook: false,
  };

  before(async () => {
    await Promise.all([
      airdrop(provider.connection, authority.publicKey),
      airdrop(provider.connection, minter.publicKey),
      airdrop(provider.connection, user.publicKey),
      airdrop(provider.connection, newAuthority.publicKey),
    ]);

    [stablecoinPda] = findStablecoinPda(mint.publicKey, program.programId);
    [minterPda] = findMinterPda(stablecoinPda, minter.publicKey, program.programId);
  });

  it("initializes with the finalized mint-derived PDA model", async () => {
    const signature = await program.methods
      .initialize(config)
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM,
        systemProgram: SYSTEM_PROGRAM,
        rent: RENT_SYSVAR,
      })
      .signers(toSignerArray(authority, mint as Keypair))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const stablecoin = await program.account.stablecoin.fetch(stablecoinPda);
    const mintAccount = await fetchToken2022Mint(provider.connection, mint.publicKey);

    expect(stablecoin.authority.toBase58()).to.eq(authority.publicKey.toBase58());
    expect(stablecoin.mint.toBase58()).to.eq(mint.publicKey.toBase58());
    expect(stablecoin.pauser.toBase58()).to.eq(authority.publicKey.toBase58());
    expect(stablecoin.burner.toBase58()).to.eq(authority.publicKey.toBase58());
    expect(stablecoin.paused).to.eq(false);
    expect(stablecoin.permanentDelegateEnabled).to.eq(false);
    expect(stablecoin.transferHookEnabled).to.eq(false);
    expect(mintAccount.mintAuthority?.toBase58()).to.eq(stablecoinPda.toBase58());
    expect(mintAccount.freezeAuthority?.toBase58()).to.eq(stablecoinPda.toBase58());
  });

  it("creates and persists the minter quota PDA", async () => {
    const signature = await program.methods
      .updateMinter(new anchor.BN(1_500_000))
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
        minter: minter.publicKey,
        minterConfig: minterPda,
        systemProgram: SYSTEM_PROGRAM,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const minterConfig = await program.account.minterConfig.fetch(minterPda);
    expect(minterConfig.stablecoin.toBase58()).to.eq(stablecoinPda.toBase58());
    expect(minterConfig.minter.toBase58()).to.eq(minter.publicKey.toBase58());
    expect(minterConfig.quota.toNumber()).to.eq(1_500_000);
    expect(minterConfig.minted.toNumber()).to.eq(0);
  });

  it("mints to a Token-2022 recipient and tracks quota usage", async () => {
    userAta = await createToken2022Ata(
      provider.connection,
      authority,
      mint.publicKey,
      user.publicKey
    );

    const signature = await program.methods
      .mint(new anchor.BN(1_000_000))
      .accounts({
        minter: minter.publicKey,
        stablecoin: stablecoinPda,
        minterConfig: minterPda,
        mint: mint.publicKey,
        recipientTokenAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(minter))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const tokenAccount = await fetchToken2022Account(provider.connection, userAta);
    const minterConfig = await program.account.minterConfig.fetch(minterPda);

    initialUserBalance = tokenAccount.amount;
    expect(tokenAccount.amount).to.eq(1_000_000n);
    expect(minterConfig.minted.toNumber()).to.eq(1_000_000);
  });

  it("freezes and thaws the recipient account through the authority default pauser role", async () => {
    let signature = await program.methods
      .freezeAccount()
      .accounts({
        pauser: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        targetAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    let tokenAccount = await fetchToken2022Account(provider.connection, userAta);
    expect(tokenAccount.isFrozen).to.eq(true);

    signature = await program.methods
      .thawAccount()
      .accounts({
        pauser: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        targetAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    tokenAccount = await fetchToken2022Account(provider.connection, userAta);
    expect(tokenAccount.isFrozen).to.eq(false);
  });

  it("updates roles and burns through the configured burner", async () => {
    await expectAnchorError(
      program.methods
        .updateRoles(null, null)
        .accounts({
          authority: authority.publicKey,
          stablecoin: stablecoinPda,
        })
        .signers(toSignerArray(authority))
        .rpc(),
      "NoRoleChanges"
    );

    let signature = await program.methods
      .updateRoles(null, user.publicKey)
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    signature = await program.methods
      .burn(new anchor.BN(250_000))
      .accounts({
        burner: user.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        burnerTokenAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(user))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const stablecoin = await program.account.stablecoin.fetch(stablecoinPda);
    const tokenAccount = await fetchToken2022Account(provider.connection, userAta);
    const mintAccount = await fetchToken2022Mint(provider.connection, mint.publicKey);

    expect(stablecoin.burner.toBase58()).to.eq(user.publicKey.toBase58());
    expect(tokenAccount.amount).to.eq(initialUserBalance - 250_000n);
    expect(mintAccount.supply).to.eq(initialUserBalance - 250_000n);
  });

  it("blocks paused operations and rejects zero-amount or quota-overflow mints", async () => {
    await expectAnchorError(
      program.methods
        .pause()
        .accounts({
          authority: minter.publicKey,
          stablecoin: stablecoinPda,
        })
        .signers(toSignerArray(minter))
        .rpc(),
      "Unauthorized"
    );

    let signature = await program.methods
      .pause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      program.methods
        .mint(new anchor.BN(1))
        .accounts({
          minter: minter.publicKey,
          stablecoin: stablecoinPda,
          minterConfig: minterPda,
          mint: mint.publicKey,
          recipientTokenAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(minter))
        .rpc(),
      "Paused"
    );

    signature = await program.methods
      .unpause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      program.methods
        .mint(new anchor.BN(0))
        .accounts({
          minter: minter.publicKey,
          stablecoin: stablecoinPda,
          minterConfig: minterPda,
          mint: mint.publicKey,
          recipientTokenAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(minter))
        .rpc(),
      "ZeroAmount"
    );

    await expectAnchorError(
      program.methods
        .mint(new anchor.BN(600_000))
        .accounts({
          minter: minter.publicKey,
          stablecoin: stablecoinPda,
          minterConfig: minterPda,
          mint: mint.publicKey,
          recipientTokenAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(minter))
        .rpc(),
      "QuotaExceeded"
    );
  });

  it("rejects role mismatch and invalid account-state transitions", async () => {
    await expectAnchorError(
      program.methods
        .updateRoles(user.publicKey, null)
        .accounts({
          authority: user.publicKey,
          stablecoin: stablecoinPda,
        })
        .signers(toSignerArray(user))
        .rpc(),
      "Unauthorized"
    );

    let signature = await program.methods
      .freezeAccount()
      .accounts({
        pauser: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        targetAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      program.methods
        .freezeAccount()
        .accounts({
          pauser: authority.publicKey,
          stablecoin: stablecoinPda,
          mint: mint.publicKey,
          targetAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(authority))
        .rpc(),
      "AccountAlreadyFrozen"
    );

    await expectAnchorError(
      program.methods
        .mint(new anchor.BN(1))
        .accounts({
          minter: minter.publicKey,
          stablecoin: stablecoinPda,
          minterConfig: minterPda,
          mint: mint.publicKey,
          recipientTokenAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(minter))
        .rpc(),
      "AccountFrozen"
    );

    signature = await program.methods
      .thawAccount()
      .accounts({
        pauser: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        targetAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      program.methods
        .thawAccount()
        .accounts({
          pauser: authority.publicKey,
          stablecoin: stablecoinPda,
          mint: mint.publicKey,
          targetAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(authority))
        .rpc(),
      "AccountNotFrozen"
    );
  });

  it("enforces burn pause gates and quota boundary behavior deterministically", async () => {
    let signature = await program.methods
      .pause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      program.methods
        .burn(new anchor.BN(1))
        .accounts({
          burner: user.publicKey,
          stablecoin: stablecoinPda,
          mint: mint.publicKey,
          burnerTokenAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(user))
        .rpc(),
      "Paused"
    );

    signature = await program.methods
      .unpause()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const minterConfigBefore = await program.account.minterConfig.fetch(minterPda);
    const remaining = minterConfigBefore.quota.toNumber() - minterConfigBefore.minted.toNumber();
    expect(remaining).to.be.greaterThan(0);

    signature = await program.methods
      .mint(new anchor.BN(remaining))
      .accounts({
        minter: minter.publicKey,
        stablecoin: stablecoinPda,
        minterConfig: minterPda,
        mint: mint.publicKey,
        recipientTokenAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(minter))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      program.methods
        .mint(new anchor.BN(1))
        .accounts({
          minter: minter.publicKey,
          stablecoin: stablecoinPda,
          minterConfig: minterPda,
          mint: mint.publicKey,
          recipientTokenAccount: userAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(minter))
        .rpc(),
      "QuotaExceeded"
    );
  });

  it("handles authority-transfer edge cases without changing the stablecoin PDA", async () => {
    await expectAnchorError(
      program.methods
        .transferAuthority(authority.publicKey)
        .accounts({
          authority: authority.publicKey,
          stablecoin: stablecoinPda,
        })
        .signers(toSignerArray(authority))
        .rpc(),
      "InvalidAuthorityTransfer"
    );

    const signature = await program.methods
      .transferAuthority(newAuthority.publicKey)
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const [derivedAfterTransfer] = findStablecoinPda(mint.publicKey, program.programId);
    const stablecoin = await program.account.stablecoin.fetch(stablecoinPda);

    expect(derivedAfterTransfer.toBase58()).to.eq(stablecoinPda.toBase58());
    expect(stablecoin.authority.toBase58()).to.eq(newAuthority.publicKey.toBase58());

    await expectAnchorError(
      program.methods
        .pause()
        .accounts({
          authority: authority.publicKey,
          stablecoin: stablecoinPda,
        })
        .signers(toSignerArray(authority))
        .rpc(),
      "Unauthorized"
    );
  });

  it("keeps the minter PDA derivation stable for later phases", async () => {
    const [derivedMinterPda] = findMinterPda(
      stablecoinPda,
      minter.publicKey,
      program.programId
    );
    expect(derivedMinterPda.toBase58()).to.eq(minterPda.toBase58());
  });
});
