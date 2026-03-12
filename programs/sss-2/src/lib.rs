//! SSS-2: Compliant Stablecoin Standard
//!
//! SSS-1 + permanent delegate + transfer hook + blacklist enforcement.
//! For regulated stablecoins — USDC/USDT-class tokens where regulators expect
//! on-chain blacklist enforcement and token seizure capabilities.
//!
//! Transfer hook checks every transfer against the blacklist — no gaps.
//! Permanent delegate enables token seizure (seize instruction).

use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("SSS2222222222222222222222222222222222222222");
pub const SSS_TRANSFER_HOOK_PROGRAM_ID: Pubkey =
    anchor_lang::pubkey!("SSSHook111111111111111111111111111111111111");

#[program]
pub mod sss_2 {
    use super::*;

    /// Initialize a new SSS-2 stablecoin with compliance extensions enabled
    pub fn initialize(
        ctx: Context<Initialize>,
        config: crate::state::StablecoinConfig,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, config)
    }

    /// Mint tokens to a recipient
    pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
        instructions::mint::handler(ctx, amount)
    }

    /// Burn tokens
    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        instructions::burn::handler(ctx, amount)
    }

    /// Freeze a token account
    pub fn freeze_account(ctx: Context<FreezeAccount>) -> Result<()> {
        instructions::freeze_account::handler(ctx)
    }

    /// Thaw a frozen token account
    pub fn thaw_account(ctx: Context<ThawAccount>) -> Result<()> {
        instructions::thaw_account::handler(ctx)
    }

    /// Pause all mint/burn operations
    pub fn pause(ctx: Context<Admin>) -> Result<()> {
        instructions::admin::pause(ctx)
    }

    /// Unpause operations
    pub fn unpause(ctx: Context<Admin>) -> Result<()> {
        instructions::admin::unpause(ctx)
    }

    /// Add or update a minter with optional quota
    pub fn update_minter(ctx: Context<UpdateMinter>, quota: u64) -> Result<()> {
        instructions::admin::update_minter(ctx, quota)
    }

    /// Remove a minter
    pub fn remove_minter(ctx: Context<RemoveMinter>) -> Result<()> {
        instructions::admin::remove_minter(ctx)
    }

    /// Update role assignments
    pub fn update_roles(
        ctx: Context<UpdateRoles>,
        new_pauser: Option<Pubkey>,
        new_burner: Option<Pubkey>,
        new_blacklister: Option<Pubkey>,
        new_seizer: Option<Pubkey>,
    ) -> Result<()> {
        instructions::admin::update_roles(ctx, new_pauser, new_burner, new_blacklister, new_seizer)
    }

    /// Transfer master authority
    pub fn transfer_authority(ctx: Context<Admin>, new_authority: Pubkey) -> Result<()> {
        instructions::admin::transfer_authority(ctx, new_authority)
    }

    /// Set or rotate the designated treasury token account used for seizure.
    pub fn set_treasury(ctx: Context<SetTreasury>) -> Result<()> {
        instructions::admin::set_treasury(ctx)
    }

    // ============ SSS-2 Compliance Instructions ============

    /// Add an address to the blacklist (blacklister role required)
    pub fn add_to_blacklist(ctx: Context<AddToBlacklist>, reason: String) -> Result<()> {
        instructions::compliance::add_to_blacklist(ctx, reason)
    }

    /// Remove an address from the blacklist (blacklister role required)
    pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
        instructions::compliance::remove_from_blacklist(ctx)
    }

    /// Seize tokens from a frozen/blacklisted account to treasury via permanent delegate
    pub fn seize(ctx: Context<Seize>) -> Result<()> {
        instructions::compliance::seize(ctx)
    }
}

#[cfg(test)]
mod tests {
    use super::constants::{BLACKLIST_SEED, MAX_BLACKLIST_REASON_LEN, MINTER_SEED, STABLECOIN_SEED};
    use super::state::{BlacklistEntry, MinterConfig, Stablecoin};

    #[test]
    fn stablecoin_layout_len_stays_canonical() {
        let expected = 8 + 32 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 1 + 32 + 1 + 32;
        assert_eq!(Stablecoin::LEN, expected);
    }

    #[test]
    fn minter_and_blacklist_layout_lens_stay_canonical() {
        let minter_expected = 8 + 32 + 32 + 8 + 8 + 1;
        let blacklist_expected = 8 + 32 + 32 + 32 + 8 + (4 + MAX_BLACKLIST_REASON_LEN) + 1;
        assert_eq!(MinterConfig::LEN, minter_expected);
        assert_eq!(BlacklistEntry::LEN, blacklist_expected);
    }

    #[test]
    fn pda_seed_prefixes_and_reason_cap_match_contract_invariants() {
        assert_eq!(Stablecoin::SEED_PREFIX, STABLECOIN_SEED);
        assert_eq!(MinterConfig::SEED_PREFIX, MINTER_SEED);
        assert_eq!(BlacklistEntry::SEED_PREFIX, BLACKLIST_SEED);
        assert_eq!(MAX_BLACKLIST_REASON_LEN, 128);
    }
}
