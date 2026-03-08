//! Initialize extra account metas for the transfer hook.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: extra account metas PDA — created here
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeExtraAccountMetaList>) -> Result<()> {
    // TODO: populate extra_account_metas with:
    // 1. stablecoin PDA account
    // 2. sender blacklist PDA (derived from source owner)
    // 3. recipient blacklist PDA (derived from destination owner)
    // Use spl_tlv_account_resolution to build the ExtraAccountMetaList
    Ok(())
}
