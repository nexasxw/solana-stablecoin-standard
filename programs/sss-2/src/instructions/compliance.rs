//! SSS-2 compliance instructions: blacklist management and seize.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::{BLACKLIST_SEED, STABLECOIN_SEED},
    error::StablecoinError,
    events::{AddedToBlacklist, RemovedFromBlacklist, TokensSeized},
    state::{BlacklistEntry, Stablecoin},
};

// ============ Accounts ============

#[derive(Accounts)]
pub struct AddToBlacklist<'info> {
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.authority.as_ref()],
        bump = stablecoin.bump,
        constraint = blacklister.key() == stablecoin.blacklister
            || blacklister.key() == stablecoin.authority
            @ StablecoinError::Unauthorized,
        constraint = stablecoin.transfer_hook_enabled @ StablecoinError::ComplianceNotEnabled,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: address to blacklist
    pub address: UncheckedAccount<'info>,

    #[account(
        init,
        payer = blacklister,
        space = BlacklistEntry::LEN,
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), address.key().as_ref()],
        bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFromBlacklist<'info> {
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.authority.as_ref()],
        bump = stablecoin.bump,
        constraint = blacklister.key() == stablecoin.blacklister
            || blacklister.key() == stablecoin.authority
            @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: address to remove from blacklist
    pub address: UncheckedAccount<'info>,

    #[account(
        mut,
        close = blacklister,
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), address.key().as_ref()],
        bump = blacklist_entry.bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
}

#[derive(Accounts)]
pub struct Seize<'info> {
    pub seizer: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.authority.as_ref()],
        bump = stablecoin.bump,
        constraint = seizer.key() == stablecoin.seizer
            || seizer.key() == stablecoin.authority
            @ StablecoinError::Unauthorized,
        constraint = stablecoin.permanent_delegate_enabled @ StablecoinError::PermanentDelegateNotEnabled,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut, address = stablecoin.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Token account to seize from (must be frozen or blacklisted)
    #[account(mut, token::mint = mint)]
    pub from_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Treasury token account to receive seized tokens
    #[account(mut, token::mint = mint)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

// ============ Handlers ============

pub fn add_to_blacklist(ctx: Context<AddToBlacklist>, reason: String) -> Result<()> {
    let entry = &mut ctx.accounts.blacklist_entry;
    entry.stablecoin = ctx.accounts.stablecoin.key();
    entry.address = ctx.accounts.address.key();
    entry.added_by = ctx.accounts.blacklister.key();
    entry.added_at = Clock::get()?.unix_timestamp;
    entry.reason = reason.clone();
    entry.bump = ctx.bumps.blacklist_entry;

    emit!(AddedToBlacklist {
        stablecoin: ctx.accounts.stablecoin.key(),
        address: ctx.accounts.address.key(),
        added_by: ctx.accounts.blacklister.key(),
        reason,
    });

    Ok(())
}

pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
    emit!(RemovedFromBlacklist {
        stablecoin: ctx.accounts.stablecoin.key(),
        address: ctx.accounts.address.key(),
        removed_by: ctx.accounts.blacklister.key(),
    });
    Ok(())
}

pub fn seize(ctx: Context<Seize>) -> Result<()> {
    let amount = ctx.accounts.from_token_account.amount;
    require!(amount > 0, StablecoinError::ZeroAmount);

    let stablecoin = &ctx.accounts.stablecoin;
    let authority_key = stablecoin.authority;
    let seeds = &[STABLECOIN_SEED, authority_key.as_ref(), &[stablecoin.bump]];
    let signer_seeds = &[&seeds[..]];

    // Transfer via permanent delegate (stablecoin PDA is the permanent delegate)
    anchor_spl::token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::TransferChecked {
                from: ctx.accounts.from_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;

    emit!(TokensSeized {
        stablecoin: ctx.accounts.stablecoin.key(),
        from: ctx.accounts.from_token_account.key(),
        to: ctx.accounts.treasury_token_account.key(),
        amount,
        seized_by: ctx.accounts.seizer.key(),
    });

    Ok(())
}
