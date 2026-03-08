//! Initialize a new SSS-1 stablecoin mint.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenInterface},
};

use crate::{
    constants::STABLECOIN_SEED,
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

    /// Token-2022 mint — created via CPI in handler
    #[account(mut)]
    pub mint: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>, config: StablecoinConfig) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;

    stablecoin.authority = ctx.accounts.authority.key();
    stablecoin.mint = ctx.accounts.mint.key();
    stablecoin.pauser = ctx.accounts.authority.key();
    stablecoin.burner = ctx.accounts.authority.key();
    stablecoin.paused = false;
    stablecoin.permanent_delegate_enabled = config.enable_permanent_delegate;
    stablecoin.transfer_hook_enabled = config.enable_transfer_hook;
    stablecoin.bump = ctx.bumps.stablecoin;
    stablecoin._reserved = [0u8; 64];

    // TODO: CPI to Token-2022 to create mint with:
    // - MintCloseAuthority extension
    // - MetadataPointer extension
    // - TokenMetadata extension (name, symbol, uri)
    // - FreezeAuthority set to stablecoin PDA

    emit!(StablecoinInitialized {
        stablecoin: stablecoin.key(),
        authority: ctx.accounts.authority.key(),
        mint: ctx.accounts.mint.key(),
        name: config.name,
        symbol: config.symbol,
        decimals: config.decimals,
    });

    Ok(())
}
