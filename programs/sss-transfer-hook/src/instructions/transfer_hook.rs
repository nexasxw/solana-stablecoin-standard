//! Transfer hook execution — checks blacklist on every transfer.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

use crate::{constants::BLACKLIST_SEED, error::HookError, state::BlacklistEntry};

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(token::mint = mint, token::authority = owner)]
    pub source_token: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(token::mint = mint)]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: source token account owner
    pub owner: UncheckedAccount<'info>,

    /// CHECK: extra account metas PDA (required by Token-2022 hook interface)
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    /// CHECK: stablecoin state PDA (passed as extra account meta)
    pub stablecoin: UncheckedAccount<'info>,

    /// Blacklist entry for source owner — if it exists, transfer is rejected
    #[account(
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub sender_blacklist_entry: Option<Account<'info, BlacklistEntry>>,

    /// Blacklist entry for destination owner — if it exists, transfer is rejected
    /// CHECK: destination token account owner
    pub destination_owner: UncheckedAccount<'info>,

    #[account(
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), destination_owner.key().as_ref()],
        bump,
    )]
    pub recipient_blacklist_entry: Option<Account<'info, BlacklistEntry>>,
}

pub fn handler(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
    require!(
        ctx.accounts.sender_blacklist_entry.is_none(),
        HookError::SenderBlacklisted
    );
    require!(
        ctx.accounts.recipient_blacklist_entry.is_none(),
        HookError::RecipientBlacklisted
    );
    Ok(())
}
