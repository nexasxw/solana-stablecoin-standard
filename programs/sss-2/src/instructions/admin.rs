//! SSS-2 admin instruction handlers (extends SSS-1 with blacklister/seizer roles).

use anchor_lang::prelude::*;

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
        seeds = [STABLECOIN_SEED, authority.key().as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

#[derive(Accounts)]
pub struct UpdateMinter<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, authority.key().as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: minter address
    pub minter: UncheckedAccount<'info>,

    #[account(
        init_or_reuse,
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
        seeds = [STABLECOIN_SEED, authority.key().as_ref()],
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
        seeds = [STABLECOIN_SEED, authority.key().as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ StablecoinError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

pub fn pause(ctx: Context<Admin>) -> Result<()> {
    require!(!ctx.accounts.stablecoin.paused, StablecoinError::Paused);
    ctx.accounts.stablecoin.paused = true;
    emit!(StatusChanged { stablecoin: ctx.accounts.stablecoin.key(), paused: true });
    Ok(())
}

pub fn unpause(ctx: Context<Admin>) -> Result<()> {
    require!(ctx.accounts.stablecoin.paused, StablecoinError::NotPaused);
    ctx.accounts.stablecoin.paused = false;
    emit!(StatusChanged { stablecoin: ctx.accounts.stablecoin.key(), paused: false });
    Ok(())
}

pub fn update_minter(ctx: Context<UpdateMinter>, quota: u64) -> Result<()> {
    let minter_config = &mut ctx.accounts.minter_config;
    minter_config.stablecoin = ctx.accounts.stablecoin.key();
    minter_config.minter = ctx.accounts.minter.key();
    minter_config.quota = quota;
    minter_config.bump = ctx.bumps.minter_config;
    emit!(MinterUpdated {
        stablecoin: ctx.accounts.stablecoin.key(),
        minter: ctx.accounts.minter.key(),
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
    if let Some(v) = new_pauser      { stablecoin.pauser = v; }
    if let Some(v) = new_burner      { stablecoin.burner = v; }
    if let Some(v) = new_blacklister { stablecoin.blacklister = v; }
    if let Some(v) = new_seizer      { stablecoin.seizer = v; }
    Ok(())
}

pub fn transfer_authority(ctx: Context<Admin>, new_authority: Pubkey) -> Result<()> {
    let previous = ctx.accounts.stablecoin.authority;
    ctx.accounts.stablecoin.authority = new_authority;
    emit!(AuthorityTransferred {
        stablecoin: ctx.accounts.stablecoin.key(),
        previous_authority: previous,
        new_authority,
    });
    Ok(())
}
