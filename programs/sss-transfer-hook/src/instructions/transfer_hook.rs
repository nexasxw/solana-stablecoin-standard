//! Transfer hook execution — checks blacklist on every transfer.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

use crate::{
    constants::{BLACKLIST_SEED, EXTRA_ACCOUNT_METAS_SEED, SSS_2_PROGRAM_ID, STABLECOIN_SEED},
    error::HookError,
};

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
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump,
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    /// CHECK: fixed account used to resolve the SSS-2 stablecoin PDA
    #[account(address = SSS_2_PROGRAM_ID)]
    pub sss_2_program: UncheckedAccount<'info>,

    /// CHECK: stablecoin state PDA (passed as extra account meta)
    #[account(
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        seeds::program = sss_2_program.key(),
        bump,
    )]
    pub stablecoin: UncheckedAccount<'info>,

    /// CHECK: blacklist PDA derived in the SSS-2 program; may be uninitialized.
    #[account(
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), owner.key().as_ref()],
        seeds::program = sss_2_program.key(),
        bump,
    )]
    pub sender_blacklist_entry: UncheckedAccount<'info>,

    /// CHECK: blacklist PDA derived in the SSS-2 program; may be uninitialized.
    #[account(
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), destination_token.owner.as_ref()],
        seeds::program = sss_2_program.key(),
        bump,
    )]
    pub recipient_blacklist_entry: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
    require!(
        !is_initialized_blacklist_entry(&ctx.accounts.sender_blacklist_entry),
        HookError::SenderBlacklisted
    );
    require!(
        !is_initialized_blacklist_entry(&ctx.accounts.recipient_blacklist_entry),
        HookError::RecipientBlacklisted
    );
    Ok(())
}

fn is_initialized_blacklist_entry(account: &UncheckedAccount) -> bool {
    account.owner == &SSS_2_PROGRAM_ID && !account.data_is_empty()
}
