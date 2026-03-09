//! Initialize extra account metas for the transfer hook.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta,
    seeds::Seed,
    state::ExtraAccountMetaList,
};
use std::mem::size_of;

use crate::constants::{
    BLACKLIST_SEED, EXTRA_ACCOUNT_METAS_SEED, SSS_2_PROGRAM_ID, STABLECOIN_SEED,
    TOKEN_ACCOUNT_OWNER_OFFSET,
};

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    /// CHECK: extra account metas PDA — created here
    #[account(
        mut,
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump,
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeExtraAccountMetaList>) -> Result<()> {
    let extra_account_metas = extra_account_metas()?;
    let account_size = ExtraAccountMetaList::size_of(extra_account_metas.len())?;
    let rent_lamports = Rent::get()?.minimum_balance(account_size);
    let extra_account_meta_list = &ctx.accounts.extra_account_meta_list;

    if extra_account_meta_list.data_is_empty() {
        let mint_key = ctx.accounts.mint.key();
        let bump = [ctx.bumps.extra_account_meta_list];
        let seeds = &[
            EXTRA_ACCOUNT_METAS_SEED,
            mint_key.as_ref(),
            &bump,
        ];

        anchor_lang::system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.authority.to_account_info(),
                    to: extra_account_meta_list.to_account_info(),
                },
                &[seeds],
            ),
            rent_lamports,
            account_size as u64,
            &crate::ID,
        )?;
    }

    ExtraAccountMetaList::init::<spl_transfer_hook_interface::instruction::ExecuteInstruction>(
        &mut extra_account_meta_list.try_borrow_mut_data()?,
        &extra_account_metas,
    )?;

    Ok(())
}

fn extra_account_metas() -> Result<Vec<ExtraAccountMeta>> {
    Ok(vec![
        ExtraAccountMeta::new_with_pubkey(&SSS_2_PROGRAM_ID, false, false)?,
        ExtraAccountMeta::new_external_pda_with_seeds(
            5,
            &[
                Seed::Literal {
                    bytes: STABLECOIN_SEED.to_vec(),
                },
                Seed::AccountKey { index: 1 },
            ],
            false,
            false,
        )?,
        ExtraAccountMeta::new_external_pda_with_seeds(
            5,
            &[
                Seed::Literal {
                    bytes: BLACKLIST_SEED.to_vec(),
                },
                Seed::AccountKey { index: 6 },
                Seed::AccountKey { index: 3 },
            ],
            false,
            false,
        )?,
        ExtraAccountMeta::new_external_pda_with_seeds(
            5,
            &[
                Seed::Literal {
                    bytes: BLACKLIST_SEED.to_vec(),
                },
                Seed::AccountKey { index: 6 },
                Seed::AccountData {
                    account_index: 2,
                    data_index: TOKEN_ACCOUNT_OWNER_OFFSET,
                    length: size_of::<Pubkey>() as u8,
                },
            ],
            false,
            false,
        )?,
    ])
}
