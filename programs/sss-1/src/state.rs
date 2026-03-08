//! SSS-1 state account definitions.

use anchor_lang::prelude::*;

use crate::constants::*;

/// Initialization config passed to `initialize`.
/// Determines which Token-2022 extensions are enabled.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StablecoinConfig {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    // SSS-1 always false — extensions live in SSS-2
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub default_account_frozen: bool,
}

/// Primary stablecoin state account.
/// Seeds: [STABLECOIN_SEED, authority]
#[account]
pub struct Stablecoin {
    /// Master authority — can pause, transfer authority, update roles
    pub authority: Pubkey,
    /// Token-2022 mint
    pub mint: Pubkey,
    /// Optional pauser (can freeze/thaw accounts and pause globally)
    pub pauser: Pubkey,
    /// Optional burner role
    pub burner: Pubkey,
    /// Global pause flag — blocks mint and burn
    pub paused: bool,
    /// Whether permanent delegate extension was enabled at init
    pub permanent_delegate_enabled: bool,
    /// Whether transfer hook extension was enabled at init
    pub transfer_hook_enabled: bool,
    /// PDA bump seed
    pub bump: u8,
    /// Reserved for future upgrades
    pub _reserved: [u8; 64],
}

impl Stablecoin {
    pub const LEN: usize = 8  // discriminator
        + 32  // authority
        + 32  // mint
        + 32  // pauser
        + 32  // burner
        + 1   // paused
        + 1   // permanent_delegate_enabled
        + 1   // transfer_hook_enabled
        + 1   // bump
        + 64; // _reserved

    pub const SEED_PREFIX: &'static [u8] = STABLECOIN_SEED;
}

/// Per-minter quota account.
/// Seeds: [MINTER_SEED, stablecoin, minter_pubkey]
#[account]
pub struct MinterConfig {
    /// Associated stablecoin
    pub stablecoin: Pubkey,
    /// Minter address
    pub minter: Pubkey,
    /// Max tokens this minter can mint (0 = unlimited)
    pub quota: u64,
    /// Tokens minted so far against quota
    pub minted: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl MinterConfig {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
    pub const SEED_PREFIX: &'static [u8] = MINTER_SEED;
}
