//! SSS-2 program constants.

/// Stablecoin PDA prefix.
/// Full seeds: `[STABLECOIN_SEED, mint]` so authority rotation never changes
/// the canonical state address.
pub const STABLECOIN_SEED: &[u8] = b"stablecoin";
/// Minter quota PDA prefix.
/// Full seeds: `[MINTER_SEED, stablecoin, minter]` so quota records stay bound
/// to the stablecoin PDA instead of any mutable authority role.
pub const MINTER_SEED: &[u8] = b"minter";
/// Blacklist PDA prefix. Full seeds: `[BLACKLIST_SEED, stablecoin, address]`.
pub const BLACKLIST_SEED: &[u8] = b"blacklist";
/// Maximum length for an on-chain blacklist reason.
pub const MAX_BLACKLIST_REASON_LEN: usize = 128;
