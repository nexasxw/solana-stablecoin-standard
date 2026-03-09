//! Mint tokens to a recipient.

use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::state::AccountState;
use anchor_spl::token_interface::{Mint as TokenMint, TokenAccount, TokenInterface};

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
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(
        mut,
        seeds = [MINTER_SEED, stablecoin.key().as_ref(), minter.key().as_ref()],
        bump = minter_config.bump,
        constraint = minter_config.stablecoin == stablecoin.key() @ StablecoinError::Unauthorized,
        constraint = minter_config.minter == minter.key() @ StablecoinError::Unauthorized,
    )]
    pub minter_config: Account<'info, MinterConfig>,

    #[account(
        mut,
        address = stablecoin.mint,
    )]
    pub mint: InterfaceAccount<'info, TokenMint>,

    #[account(mut)]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<Mint>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.stablecoin.paused, StablecoinError::Paused);
    require!(amount > 0, StablecoinError::ZeroAmount);
    require_keys_eq!(
        ctx.accounts.recipient_token_account.mint,
        ctx.accounts.mint.key(),
        StablecoinError::InvalidTokenAccount
    );
    require!(
        ctx.accounts.recipient_token_account.state == AccountState::Initialized,
        if ctx.accounts.recipient_token_account.state == AccountState::Frozen {
            StablecoinError::AccountFrozen
        } else {
            StablecoinError::InvalidTokenAccount
        }
    );

    let minter_config = &mut ctx.accounts.minter_config;

    if minter_config.quota > 0 {
        let new_minted = minter_config
            .minted
            .checked_add(amount)
            .ok_or(StablecoinError::MathOverflow)?;
        require!(
            new_minted <= minter_config.quota,
            StablecoinError::QuotaExceeded
        );
        minter_config.minted = new_minted;
    } else {
        minter_config.minted = minter_config
            .minted
            .checked_add(amount)
            .ok_or(StablecoinError::MathOverflow)?;
    }

    // CPI: mint_to via stablecoin PDA signer
    let stablecoin = &ctx.accounts.stablecoin;
    let seeds = &[
        STABLECOIN_SEED,
        stablecoin.mint.as_ref(),
        &[stablecoin.bump],
    ];
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
