//! SSS-1: Minimal Stablecoin Standard
//!
//! The simplest viable stablecoin on Solana using Token-2022. Provides
//! mint/freeze/metadata with role-based access control. No compliance
//! module — compliance is reactive (freeze accounts as needed).
//!
//! Use cases: internal tokens, DAO treasuries, ecosystem settlement.

use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("SSS1111111111111111111111111111111111111111");

#[program]
pub mod sss_1 {
    use super::*;

    /// Initialize a new SSS-1 stablecoin mint with Token-2022 extensions
    pub fn initialize(ctx: Context<Initialize>, config: crate::state::StablecoinConfig) -> Result<()> {
        instructions::initialize::handler(ctx, config)
    }

    /// Mint tokens to a recipient (minter role required, respects quota)
    pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
        instructions::mint::handler(ctx, amount)
    }

    /// Burn tokens from caller's account
    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        instructions::burn::handler(ctx, amount)
    }

    /// Freeze a token account (pauser role required)
    pub fn freeze_account(ctx: Context<FreezeAccount>) -> Result<()> {
        instructions::freeze_account::handler(ctx)
    }

    /// Thaw a frozen token account (pauser role required)
    pub fn thaw_account(ctx: Context<ThawAccount>) -> Result<()> {
        instructions::thaw_account::handler(ctx)
    }

    /// Pause all mint/burn operations globally
    pub fn pause(ctx: Context<Admin>) -> Result<()> {
        instructions::admin::pause(ctx)
    }

    /// Unpause operations
    pub fn unpause(ctx: Context<Admin>) -> Result<()> {
        instructions::admin::unpause(ctx)
    }

    /// Add or update a minter with an optional quota (0 = unlimited)
    pub fn update_minter(ctx: Context<UpdateMinter>, quota: u64) -> Result<()> {
        instructions::admin::update_minter(ctx, quota)
    }

    /// Remove a minter
    pub fn remove_minter(ctx: Context<RemoveMinter>) -> Result<()> {
        instructions::admin::remove_minter(ctx)
    }

    /// Update role assignments (pauser, burner)
    pub fn update_roles(ctx: Context<UpdateRoles>, new_pauser: Option<Pubkey>, new_burner: Option<Pubkey>) -> Result<()> {
        instructions::admin::update_roles(ctx, new_pauser, new_burner)
    }

    /// Transfer master authority to a new address
    pub fn transfer_authority(ctx: Context<Admin>, new_authority: Pubkey) -> Result<()> {
        instructions::admin::transfer_authority(ctx, new_authority)
    }
}

#[cfg(test)]
mod tests {
    use super::constants::{MINTER_SEED, STABLECOIN_SEED};
    use super::state::{MinterConfig, Stablecoin};

    #[test]
    fn stablecoin_layout_len_stays_canonical() {
        let expected = 8 + 32 + 32 + 32 + 32 + 1 + 1 + 1 + 1 + 64;
        assert_eq!(Stablecoin::LEN, expected);
    }

    #[test]
    fn minter_config_layout_len_stays_canonical() {
        let expected = 8 + 32 + 32 + 8 + 8 + 1;
        assert_eq!(MinterConfig::LEN, expected);
    }

    #[test]
    fn pda_seed_prefixes_match_documented_values() {
        assert_eq!(Stablecoin::SEED_PREFIX, STABLECOIN_SEED);
        assert_eq!(MinterConfig::SEED_PREFIX, MINTER_SEED);
    }
}
