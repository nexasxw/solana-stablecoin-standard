//! Initialize a new SSS-2 stablecoin with compliance extensions.

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenInterface}};

use crate::{
    constants::STABLECOIN_SEED,
    error::StablecoinError,
    events::StablecoinInitialized,
    state::{Stablecoin, StablecoinConfig},
};

#[derive(Accounts)]
#[instruction(config: StablecoinConfig)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Stablecoin::LEN,
        seeds = [STABLECOIN_SEED, authority.key().as_ref()],
        bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub mint: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>, config: StablecoinConfig) -> Result<()> {
    // SSS-2 requires both compliance extensions
    require!(
        config.enable_permanent_delegate && config.enable_transfer_hook,
        StablecoinError::ComplianceNotEnabled
    );

    let stablecoin = &mut ctx.accounts.stablecoin;
    stablecoin.authority = ctx.accounts.authority.key();
    stablecoin.mint = ctx.accounts.mint.key();
    stablecoin.pauser = ctx.accounts.authority.key();
    stablecoin.burner = ctx.accounts.authority.key();
    stablecoin.blacklister = ctx.accounts.authority.key();
    stablecoin.seizer = ctx.accounts.authority.key();
    stablecoin.paused = false;
    stablecoin.permanent_delegate_enabled = true;
    stablecoin.transfer_hook_enabled = true;
    stablecoin.bump = ctx.bumps.stablecoin;
    stablecoin._reserved = [0u8; 64];

    // TODO: CPI to Token-2022 to create mint with:
    // - MintCloseAuthority
    // - MetadataPointer + TokenMetadata
    // - PermanentDelegate set to stablecoin PDA
    // - TransferHook set to sss_transfer_hook program
    // - FreezeAuthority set to stablecoin PDA

    emit!(StablecoinInitialized {
        stablecoin: stablecoin.key(),
        authority: ctx.accounts.authority.key(),
        mint: ctx.accounts.mint.key(),
        name: config.name,
        symbol: config.symbol,
        decimals: config.decimals,
        compliance_enabled: true,
    });

    Ok(())
}
