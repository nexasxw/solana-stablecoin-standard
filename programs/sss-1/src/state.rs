//! SSS-1 state account definitions.

use anchor_lang::prelude::*;

use crate::constants::*;

/// Initialization config shared by the Phase 2 lifecycle baseline.
/// Carries mint metadata plus immutable extension requests only.
/// Default-account-state is deferred until a later phase instead of living here
/// as an unsupported flag.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StablecoinConfig {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    /// Requested permanent delegate extension. SSS-1 leaves this disabled.
    pub enable_permanent_delegate: bool,
    /// Requested transfer hook extension. SSS-1 leaves this disabled.
    pub enable_transfer_hook: bool,
}

/// Primary stablecoin state account for the shared lifecycle surface.
/// Seeds: `[STABLECOIN_SEED, mint]`
#[account]
pub struct Stablecoin {
    /// Current master authority. Mutable, so it is never part of PDA derivation.
    pub authority: Pubkey,
    /// Immutable Token-2022 mint and canonical stablecoin PDA identity.
    pub mint: Pubkey,
    /// Optional pauser (can freeze/thaw accounts and pause globally)
    pub pauser: Pubkey,
    /// Optional burner role
    pub burner: Pubkey,
    /// Global pause flag for Phase 2 lifecycle operations.
    pub paused: bool,
    /// Whether the mint was initialized with a permanent delegate.
    pub permanent_delegate_enabled: bool,
    /// Whether the mint was initialized with a transfer hook.
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
/// Seeds: `[MINTER_SEED, stablecoin, minter_pubkey]`
#[account]
pub struct MinterConfig {
    /// Associated stablecoin
    pub stablecoin: Pubkey,
    /// Minter address
    pub minter: Pubkey,
    /// Max tokens this minter can mint (0 = unlimited)
    pub quota: u64,
    /// Lifetime tokens minted against this quota. Burning does not restore it.
    pub minted: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl MinterConfig {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
    pub const SEED_PREFIX: &'static [u8] = MINTER_SEED;
}
