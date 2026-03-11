import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

import {
  ASSOCIATED_TOKEN_PROGRAM,
  RENT_SYSVAR,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  airdrop,
  confirmSignature,
  createToken2022Ata,
  expectAnchorError,
  fetchToken2022Account,
  fetchToken2022Mint,
  findBlacklistPda,
  findExtraAccountMetasPda,
  findMinterPda,
  findStablecoinPda,
  newKeypair,
  toSignerArray,
  transferWithHook,
} from "./helpers";

describe("SSS-2: Compliant Stablecoin", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const sss2 = anchor.workspace.Sss2 as Program<any>;
  const sss1 = anchor.workspace.Sss1 as Program<any>;
  const authority = newKeypair();
  const minter = newKeypair();
  const blacklister = newKeypair();
  const seizer = newKeypair();
  const user = newKeypair();
  const cleanUser = newKeypair();
  const recipient = newKeypair();
  const treasuryOwner = newKeypair();
  const mint = newKeypair();
  const sss1Mint = newKeypair();

  const config = {
    name: "Compliance Dollar",
    symbol: "CDL",
    uri: "https://example.com/cdl.json",
    decimals: 6,
    enablePermanentDelegate: true,
    enableTransferHook: true,
  };

  let stablecoinPda: PublicKey;
  let minterPda: PublicKey;
  let blacklistPda: PublicKey;
  let recipientBlacklistPda: PublicKey;
  let hookExtraMetasPda: PublicKey;
  let userAta: PublicKey;
  let cleanUserAta: PublicKey;
  let recipientAta: PublicKey;
  let treasuryAta: PublicKey;

  before(async () => {
    await Promise.all([
      airdrop(provider.connection, authority.publicKey),
      airdrop(provider.connection, minter.publicKey),
      airdrop(provider.connection, blacklister.publicKey),
      airdrop(provider.connection, seizer.publicKey),
      airdrop(provider.connection, user.publicKey),
      airdrop(provider.connection, cleanUser.publicKey),
      airdrop(provider.connection, recipient.publicKey),
      airdrop(provider.connection, treasuryOwner.publicKey),
    ]);

    [stablecoinPda] = findStablecoinPda(mint.publicKey, sss2.programId);
    [minterPda] = findMinterPda(stablecoinPda, minter.publicKey, sss2.programId);
    [blacklistPda] = findBlacklistPda(stablecoinPda, user.publicKey, sss2.programId);
    [recipientBlacklistPda] = findBlacklistPda(
      stablecoinPda,
      recipient.publicKey,
      sss2.programId
    );
    hookExtraMetasPda = findExtraAccountMetasPda(
      mint.publicKey,
      anchor.workspace.SssTransferHook.programId
    );
  });

  it("initializes with compliance extensions and hook configuration", async () => {
    const signature = await sss2.methods
      .initialize(config)
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
      ])
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        extraAccountMetaList: hookExtraMetasPda,
        transferHookProgram: anchor.workspace.SssTransferHook.programId,
        tokenProgram: TOKEN_2022_PROGRAM,
        systemProgram: SYSTEM_PROGRAM,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
        rent: RENT_SYSVAR,
      })
      .signers(toSignerArray(authority, mint as Keypair))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const stablecoin = await sss2.account.stablecoin.fetch(stablecoinPda);
    const mintAccount = await fetchToken2022Mint(provider.connection, mint.publicKey);
    const extraMetaAccount = await provider.connection.getAccountInfo(hookExtraMetasPda);

    expect(stablecoin.authority.toBase58()).to.eq(authority.publicKey.toBase58());
    expect(stablecoin.blacklister.toBase58()).to.eq(authority.publicKey.toBase58());
    expect(stablecoin.seizer.toBase58()).to.eq(authority.publicKey.toBase58());
    expect(stablecoin.transferHookEnabled).to.eq(true);
    expect(stablecoin.permanentDelegateEnabled).to.eq(true);
    expect(stablecoin.treasuryTokenAccount.toBase58()).to.eq(
      PublicKey.default.toBase58()
    );
    expect(mintAccount.freezeAuthority?.toBase58()).to.eq(stablecoinPda.toBase58());
    expect(extraMetaAccount).to.not.eq(null);
  });

  it("rejects initialize without both compliance extensions", async () => {
    const invalidMint = newKeypair();
    const [invalidStablecoin] = findStablecoinPda(invalidMint.publicKey, sss2.programId);
    const invalidExtraMetaPda = findExtraAccountMetasPda(
      invalidMint.publicKey,
      anchor.workspace.SssTransferHook.programId
    );

    await expectAnchorError(
      sss2.methods
        .initialize({
          ...config,
          enableTransferHook: false,
        })
        .accounts({
          authority: authority.publicKey,
          stablecoin: invalidStablecoin,
          mint: invalidMint.publicKey,
          extraAccountMetaList: invalidExtraMetaPda,
          transferHookProgram: anchor.workspace.SssTransferHook.programId,
          tokenProgram: TOKEN_2022_PROGRAM,
          systemProgram: SYSTEM_PROGRAM,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
          rent: RENT_SYSVAR,
        })
        .signers(toSignerArray(authority, invalidMint as Keypair))
        .rpc(),
      "InvalidExtensionConfig"
    );
  });

  it("supports compliance role rotation while preserving authority override", async () => {
    let signature = await sss2.methods
      .updateRoles(null, null, blacklister.publicKey, seizer.publicKey)
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const stablecoin = await sss2.account.stablecoin.fetch(stablecoinPda);
    expect(stablecoin.blacklister.toBase58()).to.eq(blacklister.publicKey.toBase58());
    expect(stablecoin.seizer.toBase58()).to.eq(seizer.publicKey.toBase58());

    signature = await sss2.methods
      .updateMinter(new anchor.BN(5_000_000))
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
  });

  it("mints to real Token-2022 accounts for later hook tests", async () => {
    userAta = await createToken2022Ata(
      provider.connection,
      authority,
      mint.publicKey,
      user.publicKey
    );
    cleanUserAta = await createToken2022Ata(
      provider.connection,
      authority,
      mint.publicKey,
      cleanUser.publicKey
    );
    recipientAta = await createToken2022Ata(
      provider.connection,
      authority,
      mint.publicKey,
      recipient.publicKey
    );
    treasuryAta = await createToken2022Ata(
      provider.connection,
      authority,
      mint.publicKey,
      treasuryOwner.publicKey
    );

    let signature = await sss2.methods
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

    signature = await sss2.methods
      .mint(new anchor.BN(500_000))
      .accounts({
        minter: minter.publicKey,
        stablecoin: stablecoinPda,
        minterConfig: minterPda,
        mint: mint.publicKey,
        recipientTokenAccount: cleanUserAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(minter))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const userAccount = await fetchToken2022Account(provider.connection, userAta);
    const cleanAccount = await fetchToken2022Account(provider.connection, cleanUserAta);
    expect(userAccount.amount).to.eq(1_000_000n);
    expect(cleanAccount.amount).to.eq(500_000n);
  });

  it("configures and rotates the designated treasury", async () => {
    let signature = await sss2.methods
      .setTreasury()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        treasuryTokenAccount: treasuryAta,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    let stablecoin = await sss2.account.stablecoin.fetch(stablecoinPda);
    expect(stablecoin.treasuryTokenAccount.toBase58()).to.eq(treasuryAta.toBase58());

    const rotatedTreasury = await createToken2022Ata(
      provider.connection,
      authority,
      mint.publicKey,
      authority.publicKey
    );

    signature = await sss2.methods
      .setTreasury()
      .accounts({
        authority: authority.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        treasuryTokenAccount: rotatedTreasury,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    stablecoin = await sss2.account.stablecoin.fetch(stablecoinPda);
    expect(stablecoin.treasuryTokenAccount.toBase58()).to.eq(rotatedTreasury.toBase58());

    treasuryAta = rotatedTreasury;
  });

  it("adds blacklist entries with required reasons and rejects duplicates", async () => {
    await expectAnchorError(
      sss2.methods
        .addToBlacklist("   ")
        .accounts({
          blacklister: blacklister.publicKey,
          stablecoin: stablecoinPda,
          address: user.publicKey,
          blacklistEntry: blacklistPda,
          systemProgram: SYSTEM_PROGRAM,
        })
        .signers(toSignerArray(blacklister))
        .rpc(),
      "InvalidBlacklistReason"
    );

    const signature = await sss2.methods
      .addToBlacklist("OFAC match")
      .accounts({
        blacklister: blacklister.publicKey,
        stablecoin: stablecoinPda,
        address: user.publicKey,
        blacklistEntry: blacklistPda,
        systemProgram: SYSTEM_PROGRAM,
      })
      .signers(toSignerArray(blacklister))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const blacklistEntry = await sss2.account.blacklistEntry.fetch(blacklistPda);
    expect(blacklistEntry.address.toBase58()).to.eq(user.publicKey.toBase58());
    expect(blacklistEntry.reason).to.eq("OFAC match");

    await expectAnchorError(
      sss2.methods
        .addToBlacklist("updated reason")
        .accounts({
          blacklister: blacklister.publicKey,
          stablecoin: stablecoinPda,
          address: user.publicKey,
          blacklistEntry: blacklistPda,
          systemProgram: SYSTEM_PROGRAM,
        })
        .signers(toSignerArray(blacklister))
        .rpc(),
      "already in use"
    );
  });

  it("rejects transfers from blacklisted senders via the transfer hook", async () => {
    await expectAnchorError(
      transferWithHook(
        provider.connection,
        authority,
        userAta,
        mint.publicKey,
        recipientAta,
        user,
        1n,
        config.decimals
      ),
      "SenderBlacklisted"
    );
  });

  it("rejects transfers to blacklisted recipients via the transfer hook", async () => {
    const signature = await sss2.methods
      .addToBlacklist("court order")
      .accounts({
        blacklister: authority.publicKey,
        stablecoin: stablecoinPda,
        address: recipient.publicKey,
        blacklistEntry: recipientBlacklistPda,
        systemProgram: SYSTEM_PROGRAM,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      transferWithHook(
        provider.connection,
        authority,
        cleanUserAta,
        mint.publicKey,
        recipientAta,
        cleanUser,
        1n,
        config.decimals
      ),
      "RecipientBlacklisted"
    );
  });

  it("requires treasury, freeze, and blacklist for seizure", async () => {
    const noTreasuryMint = newKeypair();
    const [noTreasuryStablecoin] = findStablecoinPda(noTreasuryMint.publicKey, sss2.programId);
    const [noTreasuryMinter] = findMinterPda(
      noTreasuryStablecoin,
      minter.publicKey,
      sss2.programId
    );
    const [noTreasuryBlacklist] = findBlacklistPda(
      noTreasuryStablecoin,
      user.publicKey,
      sss2.programId
    );
    const noTreasuryMeta = findExtraAccountMetasPda(
      noTreasuryMint.publicKey,
      anchor.workspace.SssTransferHook.programId
    );
    let noTreasuryUserAta: PublicKey;
    let noTreasuryTreasuryAta: PublicKey;

    let signature = await sss2.methods
      .initialize(config)
      .accounts({
        authority: authority.publicKey,
        stablecoin: noTreasuryStablecoin,
        mint: noTreasuryMint.publicKey,
        extraAccountMetaList: noTreasuryMeta,
        transferHookProgram: anchor.workspace.SssTransferHook.programId,
        tokenProgram: TOKEN_2022_PROGRAM,
        systemProgram: SYSTEM_PROGRAM,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
        rent: RENT_SYSVAR,
      })
      .signers(toSignerArray(authority, noTreasuryMint as Keypair))
      .rpc();
    await confirmSignature(provider.connection, signature);

    noTreasuryUserAta = await createToken2022Ata(
      provider.connection,
      authority,
      noTreasuryMint.publicKey,
      user.publicKey
    );
    noTreasuryTreasuryAta = await createToken2022Ata(
      provider.connection,
      authority,
      noTreasuryMint.publicKey,
      treasuryOwner.publicKey
    );

    signature = await sss2.methods
      .updateMinter(new anchor.BN(100))
      .accounts({
        authority: authority.publicKey,
        stablecoin: noTreasuryStablecoin,
        minter: minter.publicKey,
        minterConfig: noTreasuryMinter,
        systemProgram: SYSTEM_PROGRAM,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    signature = await sss2.methods
      .mint(new anchor.BN(10))
      .accounts({
        minter: minter.publicKey,
        stablecoin: noTreasuryStablecoin,
        minterConfig: noTreasuryMinter,
        mint: noTreasuryMint.publicKey,
        recipientTokenAccount: noTreasuryUserAta,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(minter))
      .rpc();
    await confirmSignature(provider.connection, signature);

    await expectAnchorError(
      sss2.methods
        .seize()
        .accounts({
          seizer: authority.publicKey,
          stablecoin: noTreasuryStablecoin,
          mint: noTreasuryMint.publicKey,
          fromTokenAccount: noTreasuryUserAta,
          targetOwner: user.publicKey,
          treasuryTokenAccount: noTreasuryTreasuryAta,
          blacklistEntry: noTreasuryBlacklist,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(authority))
        .rpc(),
      "TreasuryNotConfigured"
    );

    await expectAnchorError(
      sss2.methods
        .seize()
        .accounts({
          seizer: seizer.publicKey,
          stablecoin: stablecoinPda,
          mint: mint.publicKey,
          fromTokenAccount: userAta,
          targetOwner: user.publicKey,
          treasuryTokenAccount: treasuryAta,
          blacklistEntry: blacklistPda,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(seizer))
        .rpc(),
      "SeizeTargetNotFrozen"
    );

    const cleanOwnerBlacklistPda = findBlacklistPda(
      stablecoinPda,
      cleanUser.publicKey,
      sss2.programId
    )[0];

    await expectAnchorError(
      sss2.methods
        .freezeAccount()
        .accounts({
          pauser: authority.publicKey,
          stablecoin: stablecoinPda,
          mint: mint.publicKey,
          targetAccount: cleanUserAta,
          tokenProgram: TOKEN_2022_PROGRAM,
        })
        .signers(toSignerArray(authority))
        .rpc()
        .then(async (sig: string) => {
          await confirmSignature(provider.connection, sig);
          return sss2.methods
            .seize()
            .accounts({
              seizer: seizer.publicKey,
              stablecoin: stablecoinPda,
              mint: mint.publicKey,
              fromTokenAccount: cleanUserAta,
              targetOwner: cleanUser.publicKey,
              treasuryTokenAccount: treasuryAta,
              blacklistEntry: cleanOwnerBlacklistPda,
              tokenProgram: TOKEN_2022_PROGRAM,
            })
            .signers(toSignerArray(seizer))
            .rpc();
        }),
      "SeizeTargetNotBlacklisted"
    );

    const cleanBlacklistInfo = await provider.connection.getAccountInfo(cleanOwnerBlacklistPda);
    expect(cleanBlacklistInfo).to.eq(null);
  });

  it("seizes full balance after freeze and blacklist", async () => {
    let signature = await sss2.methods
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

    signature = await sss2.methods
      .seize()
      .accounts({
        seizer: seizer.publicKey,
        stablecoin: stablecoinPda,
        mint: mint.publicKey,
        fromTokenAccount: userAta,
        targetOwner: user.publicKey,
        treasuryTokenAccount: treasuryAta,
        blacklistEntry: blacklistPda,
        tokenProgram: TOKEN_2022_PROGRAM,
      })
      .signers(toSignerArray(seizer))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const userAccount = await fetchToken2022Account(provider.connection, userAta);
    const treasuryAccount = await fetchToken2022Account(provider.connection, treasuryAta);

    expect(userAccount.amount).to.eq(0n);
    expect(treasuryAccount.amount).to.eq(1_000_000n);
  });

  it("removes blacklist PDAs and restores transfers", async () => {
    let signature = await sss2.methods
      .removeFromBlacklist()
      .accounts({
        blacklister: blacklister.publicKey,
        stablecoin: stablecoinPda,
        address: user.publicKey,
        blacklistEntry: blacklistPda,
      })
      .signers(toSignerArray(blacklister))
      .rpc();
    await confirmSignature(provider.connection, signature);

    signature = await sss2.methods
      .removeFromBlacklist()
      .accounts({
        blacklister: authority.publicKey,
        stablecoin: stablecoinPda,
        address: recipient.publicKey,
        blacklistEntry: recipientBlacklistPda,
      })
      .signers(toSignerArray(authority))
      .rpc();
    await confirmSignature(provider.connection, signature);

    const accountInfo = await provider.connection.getAccountInfo(blacklistPda);
    expect(accountInfo).to.eq(null);

    signature = await sss2.methods
      .mint(new anchor.BN(50))
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

    const transferSig = await transferWithHook(
      provider.connection,
      authority,
      userAta,
      mint.publicKey,
      recipientAta,
      user,
      25n,
      config.decimals
    );
    await confirmSignature(provider.connection, transferSig);

    const userAccount = await fetchToken2022Account(provider.connection, userAta);
    const recipientAccount = await fetchToken2022Account(provider.connection, recipientAta);

    expect(userAccount.amount).to.eq(25n);
    expect(recipientAccount.amount).to.eq(25n);
  });

  it("keeps compliance instructions gated off for SSS-1 deployments", async () => {
    await expectAnchorError(
      sss1.methods
        .initialize({
          name: "Minimal Dollar",
          symbol: "MDL",
          uri: "https://example.com/mdl.json",
          decimals: 6,
          enablePermanentDelegate: true,
          enableTransferHook: true,
        })
        .accounts({
          authority: authority.publicKey,
          stablecoin: findStablecoinPda(sss1Mint.publicKey, sss1.programId)[0],
          mint: sss1Mint.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM,
          systemProgram: SYSTEM_PROGRAM,
          rent: RENT_SYSVAR,
        })
        .signers(toSignerArray(authority, sss1Mint as Keypair))
        .rpc(),
      "UnsupportedExtensionConfig"
    );
  });
});
