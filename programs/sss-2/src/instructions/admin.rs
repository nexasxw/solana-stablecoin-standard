//! SSS-2 admin instruction handlers (extends SSS-1 with blacklister/seizer roles).

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

use crate::{
    constants::{MINTER_SEED, STABLECOIN_SEED},
    error::StablecoinError,
    events::*,
    state::{MinterConfig, Stablecoin},
};

#[derive(Accounts)]
pub struct Admin<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

#[derive(Accounts)]
pub struct UpdateMinter<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: minter address
    pub minter: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = MinterConfig::LEN,
        seeds = [MINTER_SEED, stablecoin.key().as_ref(), minter.key().as_ref()],
        bump,
    )]
    pub minter_config: Account<'info, MinterConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveMinter<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: minter to remove
    pub minter: UncheckedAccount<'info>,

    #[account(
        mut,
        close = authority,
        seeds = [MINTER_SEED, stablecoin.key().as_ref(), minter.key().as_ref()],
        bump = minter_config.bump,
    )]
    pub minter_config: Account<'info, MinterConfig>,
}

#[derive(Accounts)]
pub struct UpdateRoles<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

#[derive(Accounts)]
pub struct SetTreasury<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(address = stablecoin.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(token::mint = mint)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn pause(ctx: Context<Admin>) -> Result<()> {
    require!(!ctx.accounts.stablecoin.paused, StablecoinError::Paused);
    ctx.accounts.stablecoin.paused = true;
    emit!(StatusChanged {
        stablecoin: ctx.accounts.stablecoin.key(),
        paused: true
    });
    Ok(())
}

pub fn unpause(ctx: Context<Admin>) -> Result<()> {
    require!(ctx.accounts.stablecoin.paused, StablecoinError::NotPaused);
    ctx.accounts.stablecoin.paused = false;
    emit!(StatusChanged {
        stablecoin: ctx.accounts.stablecoin.key(),
        paused: false
    });
    Ok(())
}

pub fn update_minter(ctx: Context<UpdateMinter>, quota: u64) -> Result<()> {
    let minter_config = &mut ctx.accounts.minter_config;
    let stablecoin_key = ctx.accounts.stablecoin.key();
    let minter_key = ctx.accounts.minter.key();
    let is_new_config = minter_config.stablecoin == Pubkey::default()
        && minter_config.minter == Pubkey::default()
        && minter_config.minted == 0
        && minter_config.quota == 0;

    if !is_new_config {
        require_keys_eq!(
            minter_config.stablecoin,
            stablecoin_key,
            StablecoinError::Unauthorized
        );
        require_keys_eq!(
            minter_config.minter,
            minter_key,
            StablecoinError::Unauthorized
        );
    }

    minter_config.stablecoin = stablecoin_key;
    minter_config.minter = minter_key;
    minter_config.quota = quota;
    minter_config.bump = ctx.bumps.minter_config;
    emit!(MinterUpdated {
        stablecoin: stablecoin_key,
        minter: minter_key,
        quota,
    });
    Ok(())
}

pub fn remove_minter(ctx: Context<RemoveMinter>) -> Result<()> {
    emit!(MinterRemoved {
        stablecoin: ctx.accounts.stablecoin.key(),
        minter: ctx.accounts.minter.key(),
    });
    Ok(())
}

pub fn update_roles(
    ctx: Context<UpdateRoles>,
    new_pauser: Option<Pubkey>,
    new_burner: Option<Pubkey>,
    new_blacklister: Option<Pubkey>,
    new_seizer: Option<Pubkey>,
) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;
    let previous_pauser = stablecoin.pauser;
    let previous_burner = stablecoin.burner;
    let previous_blacklister = stablecoin.blacklister;
    let previous_seizer = stablecoin.seizer;

    if let Some(v) = new_pauser {
        stablecoin.pauser = v;
    }
    if let Some(v) = new_burner {
        stablecoin.burner = v;
    }
    if let Some(v) = new_blacklister {
        stablecoin.blacklister = v;
    }
    if let Some(v) = new_seizer {
        stablecoin.seizer = v;
    }

    require!(
        stablecoin.pauser != previous_pauser
            || stablecoin.burner != previous_burner
            || stablecoin.blacklister != previous_blacklister
            || stablecoin.seizer != previous_seizer,
        StablecoinError::NoRoleChanges
    );

    emit!(RolesUpdated {
        stablecoin: stablecoin.key(),
        authority: ctx.accounts.authority.key(),
        previous_pauser,
        new_pauser: stablecoin.pauser,
        previous_burner,
        new_burner: stablecoin.burner,
        previous_blacklister,
        new_blacklister: stablecoin.blacklister,
        previous_seizer,
        new_seizer: stablecoin.seizer,
    });

    Ok(())
}

pub fn transfer_authority(ctx: Context<Admin>, new_authority: Pubkey) -> Result<()> {
    let previous = ctx.accounts.stablecoin.authority;
    require!(
        new_authority != Pubkey::default() && new_authority != previous,
        StablecoinError::InvalidAuthorityTransfer
    );
    ctx.accounts.stablecoin.authority = new_authority;
    emit!(AuthorityTransferred {
        stablecoin: ctx.accounts.stablecoin.key(),
        previous_authority: previous,
        new_authority,
    });
    Ok(())
}

pub fn set_treasury(ctx: Context<SetTreasury>) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;
    let previous_treasury = stablecoin.treasury_token_account;
    let new_treasury = ctx.accounts.treasury_token_account.key();

    require!(
        new_treasury != Pubkey::default() && new_treasury != previous_treasury,
        StablecoinError::InvalidTreasuryAccount
    );

    stablecoin.treasury_token_account = new_treasury;

    emit!(TreasuryUpdated {
        stablecoin: stablecoin.key(),
        authority: ctx.accounts.authority.key(),
        previous_treasury,
        new_treasury,
    });

    Ok(())
}
