//! SSS-2 state account definitions.

use anchor_lang::prelude::*;

use crate::constants::*;

/// Initialization config shared by the Phase 2 lifecycle layer.
/// Carries mint metadata plus immutable extension requests only so SSS-2 can
/// extend the shared baseline without changing the core account shape again.
/// Default-account-state is intentionally deferred until a later phase.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StablecoinConfig {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    /// Requested permanent delegate extension.
    /// SSS-2 requires this so seizure flows can layer on top in Phase 3.
    pub enable_permanent_delegate: bool,
    /// Requested transfer hook extension.
    /// SSS-2 requires this so blacklist enforcement can layer on top in Phase 3.
    pub enable_transfer_hook: bool,
}

/// Primary stablecoin state account.
/// Extends the shared lifecycle baseline with compliance operator roles.
/// Seeds: `[STABLECOIN_SEED, mint]` to keep the address stable after authority
/// transfer and across every lifecycle instruction.
#[account]
pub struct Stablecoin {
    /// Current master authority. Mutable, so it is never part of PDA derivation.
    pub authority: Pubkey,
    /// Immutable Token-2022 mint and canonical stablecoin PDA identity.
    pub mint: Pubkey,
    pub pauser: Pubkey,
    pub burner: Pubkey,
    /// SSS-2 operator that can add or remove blacklist entries.
    pub blacklister: Pubkey,
    /// SSS-2 operator that can execute seize operations.
    pub seizer: Pubkey,
    pub paused: bool,
    /// Immutable record of whether the mint was initialized with a permanent
    /// delegate extension. Valid SSS-2 mints set this to `true`.
    pub permanent_delegate_enabled: bool,
    /// Immutable record of whether the mint was initialized with a transfer
    /// hook extension. Valid SSS-2 mints set this to `true`.
    pub transfer_hook_enabled: bool,
    /// Designated treasury token account for seized funds.
    /// `Pubkey::default()` means no treasury configured yet.
    pub treasury_token_account: Pubkey,
    pub bump: u8,
    pub _reserved: [u8; 32],
}

impl Stablecoin {
    pub const LEN: usize = 8  // discriminator
        + 32  // authority
        + 32  // mint
        + 32  // pauser
        + 32  // burner
        + 32  // blacklister
        + 32  // seizer
        + 1   // paused
        + 1   // permanent_delegate_enabled
        + 1   // transfer_hook_enabled
        + 32  // treasury_token_account
        + 1   // bump
        + 32; // _reserved

    pub const SEED_PREFIX: &'static [u8] = STABLECOIN_SEED;
}

/// Per-minter quota account.
/// Seeds: `[MINTER_SEED, stablecoin, minter]` so quotas follow the stablecoin
/// PDA rather than any mutable operator key.
#[account]
pub struct MinterConfig {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
    /// Max tokens this minter can mint over its lifetime (0 = unlimited).
    pub quota: u64,
    /// Lifetime tokens minted against this quota. Burning does not restore it.
    pub minted: u64,
    pub bump: u8,
}

impl MinterConfig {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
    pub const SEED_PREFIX: &'static [u8] = MINTER_SEED;
}

/// Blacklist entry PDA.
/// Seeds: `[BLACKLIST_SEED, stablecoin, address]`
#[account]
pub struct BlacklistEntry {
    pub stablecoin: Pubkey,
    /// Blacklisted address
    pub address: Pubkey,
    /// Operator who added this entry
    pub added_by: Pubkey,
    /// Unix timestamp when added
    pub added_at: i64,
    /// Reason (e.g. "OFAC match", "Sanctions screening")
    pub reason: String,
    pub bump: u8,
}

impl BlacklistEntry {
    // reason max 128 bytes
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + (4 + MAX_BLACKLIST_REASON_LEN) + 1;
    pub const SEED_PREFIX: &'static [u8] = BLACKLIST_SEED;
}
