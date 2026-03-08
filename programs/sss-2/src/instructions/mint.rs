//! Mint tokens to a recipient (SSS-2).

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::{MINTER_SEED, STABLECOIN_SEED},
    error::StablecoinError,
    events::TokensMinted,
    state::{MinterConfig, Stablecoin},
};

#[derive(Accounts)]
pub struct Mint<'info> {
    pub minter: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.authority.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(
        mut,
        seeds = [MINTER_SEED, stablecoin.key().as_ref(), minter.key().as_ref()],
        bump = minter_config.bump,
    )]
    pub minter_config: Account<'info, MinterConfig>,

    #[account(mut, address = stablecoin.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<Mint>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.stablecoin.paused, StablecoinError::Paused);
    require!(amount > 0, StablecoinError::ZeroAmount);

    let minter_config = &mut ctx.accounts.minter_config;
    if minter_config.quota > 0 {
        let new_minted = minter_config
            .minted
            .checked_add(amount)
            .ok_or(StablecoinError::MathOverflow)?;
        require!(new_minted <= minter_config.quota, StablecoinError::QuotaExceeded);
        minter_config.minted = new_minted;
    }

    let stablecoin = &ctx.accounts.stablecoin;
    let authority_key = stablecoin.authority;
    let seeds = &[STABLECOIN_SEED, authority_key.as_ref(), &[stablecoin.bump]];
    let signer_seeds = &[&seeds[..]];

    anchor_spl::token_interface::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    emit!(TokensMinted {
        stablecoin: ctx.accounts.stablecoin.key(),
        minter: ctx.accounts.minter.key(),
        recipient: ctx.accounts.recipient_token_account.key(),
        amount,
    });

    Ok(())
}
