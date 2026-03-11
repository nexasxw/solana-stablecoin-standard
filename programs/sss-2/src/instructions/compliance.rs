//! SSS-2 compliance instructions: blacklist management and seize.

use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::spl_token_2022::state::AccountState,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{
    constants::{BLACKLIST_SEED, MAX_BLACKLIST_REASON_LEN, STABLECOIN_SEED},
    error::StablecoinError,
    events::{AddedToBlacklist, RemovedFromBlacklist, TokensSeized},
    state::{BlacklistEntry, Stablecoin},
};

// ============ Accounts ============

#[derive(Accounts)]
pub struct AddToBlacklist<'info> {
    #[account(mut)]
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
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
    #[account(mut)]
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        constraint = blacklister.key() == stablecoin.blacklister
            || blacklister.key() == stablecoin.authority
            @ StablecoinError::Unauthorized,
        constraint = stablecoin.transfer_hook_enabled @ StablecoinError::ComplianceNotEnabled,
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
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        constraint = seizer.key() == stablecoin.seizer
            || seizer.key() == stablecoin.authority
            @ StablecoinError::Unauthorized,
        constraint = stablecoin.transfer_hook_enabled @ StablecoinError::ComplianceNotEnabled,
        constraint = stablecoin.permanent_delegate_enabled @ StablecoinError::PermanentDelegateNotEnabled,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut, address = stablecoin.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// Token account to seize from (must be frozen or blacklisted)
    #[account(mut, token::mint = mint)]
    pub from_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: owner of `from_token_account`; must match token account owner field.
    #[account(
        constraint = target_owner.key() == from_token_account.owner
            @ StablecoinError::InvalidTokenAccountOwner
    )]
    pub target_owner: UncheckedAccount<'info>,

    /// Treasury token account to receive seized tokens
    #[account(mut, token::mint = mint)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: blacklist PDA for `target_owner`. May be uninitialized.
    #[account(
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), target_owner.key().as_ref()],
        bump,
    )]
    pub blacklist_entry: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

// ============ Handlers ============

pub fn add_to_blacklist(ctx: Context<AddToBlacklist>, reason: String) -> Result<()> {
    let normalized_reason = reason.trim();
    require!(
        !normalized_reason.is_empty() && normalized_reason.len() <= MAX_BLACKLIST_REASON_LEN,
        StablecoinError::InvalidBlacklistReason
    );

    let entry = &mut ctx.accounts.blacklist_entry;
    entry.stablecoin = ctx.accounts.stablecoin.key();
    entry.address = ctx.accounts.address.key();
    entry.added_by = ctx.accounts.blacklister.key();
    entry.added_at = Clock::get()?.unix_timestamp;
    entry.reason = normalized_reason.to_string();
    entry.bump = ctx.bumps.blacklist_entry;

    emit!(AddedToBlacklist {
        stablecoin: ctx.accounts.stablecoin.key(),
        address: ctx.accounts.address.key(),
        added_by: ctx.accounts.blacklister.key(),
        reason: normalized_reason.to_string(),
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
    require!(
        ctx.accounts.stablecoin.treasury_token_account != Pubkey::default(),
        StablecoinError::TreasuryNotConfigured
    );
    require_keys_eq!(
        ctx.accounts.treasury_token_account.key(),
        ctx.accounts.stablecoin.treasury_token_account,
        StablecoinError::InvalidTreasuryAccount
    );

    require!(
        is_initialized_blacklist_entry(&ctx.accounts.blacklist_entry),
        StablecoinError::SeizeTargetNotBlacklisted
    );
    require!(
        ctx.accounts.from_token_account.state == AccountState::Frozen,
        StablecoinError::SeizeTargetNotFrozen
    );

    let amount = ctx.accounts.from_token_account.amount;
    require!(amount > 0, StablecoinError::ZeroAmount);

    let stablecoin = &ctx.accounts.stablecoin;
    let seeds = &[
        STABLECOIN_SEED,
        stablecoin.mint.as_ref(),
        &[stablecoin.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Thaw first because frozen accounts reject delegate-authorized burns.
    // The stablecoin PDA is also the freeze authority.
    anchor_spl::token_interface::thaw_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_interface::ThawAccount {
            account: ctx.accounts.from_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.stablecoin.to_account_info(),
        },
        signer_seeds,
    ))?;

    // Seizure preserves supply but bypasses the transfer hook by burning the
    // frozen user's balance under the permanent delegate, then reminting the
    // same amount to the designated treasury.
    anchor_spl::token_interface::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.from_token_account.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    anchor_spl::token_interface::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    emit!(TokensSeized {
        stablecoin: ctx.accounts.stablecoin.key(),
        from: ctx.accounts.from_token_account.key(),
        to: ctx.accounts.treasury_token_account.key(),
        owner: ctx.accounts.from_token_account.owner,
        amount,
        seized_by: ctx.accounts.seizer.key(),
    });

    Ok(())
}

fn is_initialized_blacklist_entry(account: &UncheckedAccount) -> bool {
    account.owner == &crate::ID && !account.data_is_empty()
}
