//! SSS-2 events.

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

#[event]
pub struct RolesUpdated {
    pub stablecoin: Pubkey,
    pub authority: Pubkey,
    pub previous_pauser: Pubkey,
    pub new_pauser: Pubkey,
    pub previous_burner: Pubkey,
    pub new_burner: Pubkey,
    pub previous_blacklister: Pubkey,
    pub new_blacklister: Pubkey,
    pub previous_seizer: Pubkey,
    pub new_seizer: Pubkey,
}

#[event]
pub struct AddedToBlacklist {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub added_by: Pubkey,
    pub reason: String,
}

#[event]
pub struct RemovedFromBlacklist {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub removed_by: Pubkey,
}

#[event]
pub struct TokensSeized {
    pub stablecoin: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub seized_by: Pubkey,
}
