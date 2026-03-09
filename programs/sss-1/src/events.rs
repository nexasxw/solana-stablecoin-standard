//! SSS-1 events emitted on state changes.

use anchor_lang::prelude::*;

#[event]
pub struct StablecoinInitialized {
    pub stablecoin: Pubkey,
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub permanent_delegate_enabled: bool,
    pub transfer_hook_enabled: bool,
}

#[event]
pub struct TokensMinted {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TokensBurned {
    pub stablecoin: Pubkey,
    pub burner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AccountFrozen {
    pub stablecoin: Pubkey,
    pub account: Pubkey,
    pub frozen_by: Pubkey,
}

#[event]
pub struct AccountThawed {
    pub stablecoin: Pubkey,
    pub account: Pubkey,
    pub thawed_by: Pubkey,
}

#[event]
pub struct StatusChanged {
    pub stablecoin: Pubkey,
    pub paused: bool,
}

#[event]
pub struct AuthorityTransferred {
    pub stablecoin: Pubkey,
    pub previous_authority: Pubkey,
    pub new_authority: Pubkey,
}

#[event]
pub struct MinterUpdated {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
    pub quota: u64,
}

#[event]
pub struct MinterRemoved {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
}
