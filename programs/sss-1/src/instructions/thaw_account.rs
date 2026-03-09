//! Thaw a frozen token account.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::STABLECOIN_SEED, error::StablecoinError, events::AccountThawed, state::Stablecoin,
};

#[derive(Accounts)]
pub struct ThawAccount<'info> {
    pub pauser: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        constraint = pauser.key() == stablecoin.pauser
            || pauser.key() == stablecoin.authority
            @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut, address = stablecoin.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut, token::mint = mint)]
    pub target_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<ThawAccount>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    let seeds = &[
        STABLECOIN_SEED,
        stablecoin.mint.as_ref(),
        &[stablecoin.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    anchor_spl::token_interface::thaw_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_interface::ThawAccount {
            account: ctx.accounts.target_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.stablecoin.to_account_info(),
        },
        signer_seeds,
    ))?;

    emit!(AccountThawed {
        stablecoin: ctx.accounts.stablecoin.key(),
        account: ctx.accounts.target_account.key(),
        thawed_by: ctx.accounts.pauser.key(),
    });

    Ok(())
}
