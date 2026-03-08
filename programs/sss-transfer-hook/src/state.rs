//! Transfer hook state accounts.

use anchor_lang::prelude::*;

/// Blacklist entry — same seed derivation as sss-2 program for shared lookup.
/// Seeds: [BLACKLIST_SEED, stablecoin_pubkey, address]
#[account]
pub struct BlacklistEntry {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub added_by: Pubkey,
    pub added_at: i64,
    pub reason: String,
    pub bump: u8,
}
