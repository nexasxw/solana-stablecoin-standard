//! SSS-2 program constants.

/// Stablecoin PDA prefix. Full seeds: `[STABLECOIN_SEED, mint]`.
pub const STABLECOIN_SEED: &[u8] = b"stablecoin";
/// Minter quota PDA prefix. Full seeds: `[MINTER_SEED, stablecoin, minter]`.
pub const MINTER_SEED: &[u8] = b"minter";
/// Blacklist PDA prefix. Full seeds: `[BLACKLIST_SEED, stablecoin, address]`.
pub const BLACKLIST_SEED: &[u8] = b"blacklist";
