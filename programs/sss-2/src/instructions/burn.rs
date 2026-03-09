//! Burn tokens from caller's account.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::STABLECOIN_SEED, error::StablecoinError, events::TokensBurned, state::Stablecoin,
};

#[derive(Accounts)]
pub struct Burn<'info> {
    pub burner: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        constraint = burner.key() == stablecoin.burner
            || burner.key() == stablecoin.authority
            @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut, address = stablecoin.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = burner,
    )]
    pub burner_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<Burn>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.stablecoin.paused, StablecoinError::Paused);
    require!(amount > 0, StablecoinError::ZeroAmount);
    require_keys_eq!(
        ctx.accounts.burner_token_account.mint,
        ctx.accounts.mint.key(),
        StablecoinError::InvalidTokenAccount
    );
    require_keys_eq!(
        ctx.accounts.burner_token_account.owner,
        ctx.accounts.burner.key(),
        StablecoinError::InvalidTokenAccountOwner
    );
    require!(
        !ctx.accounts.burner_token_account.is_frozen(),
        StablecoinError::AccountFrozen
    );
    require!(
        ctx.accounts.burner_token_account.amount >= amount,
        StablecoinError::InsufficientFunds
    );

    anchor_spl::token_interface::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.burner_token_account.to_account_info(),
                authority: ctx.accounts.burner.to_account_info(),
            },
        ),
        amount,
    )?;

    emit!(TokensBurned {
        stablecoin: ctx.accounts.stablecoin.key(),
        burner: ctx.accounts.burner.key(),
        amount,
    });

    Ok(())
}
