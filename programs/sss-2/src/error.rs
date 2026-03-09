//! SSS-2 error codes.

use anchor_lang::prelude::*;

#[error_code]
pub enum StablecoinError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,

    #[msg("Initialize requires the Token-2022 program")]
    InvalidTokenProgram,

    #[msg("SSS-2 initialize requires both permanent delegate and transfer hook enabled")]
    InvalidExtensionConfig,

    #[msg("Token name, symbol, and URI must all be non-empty")]
    InvalidMetadata,

    #[msg("Stablecoin is paused")]
    Paused,

    #[msg("Stablecoin is not paused")]
    NotPaused,

    #[msg("Arithmetic overflow")]
    MathOverflow,

    #[msg("Unauthorized — caller does not have required role")]
    Unauthorized,

    #[msg("Minter quota exceeded")]
    QuotaExceeded,

    #[msg("Account is frozen")]
    AccountFrozen,

    #[msg("Token account is not initialized for this mint")]
    InvalidTokenAccount,

    #[msg("Token account owner does not match the expected authority")]
    InvalidTokenAccountOwner,

    #[msg("Account is already frozen")]
    AccountAlreadyFrozen,

    #[msg("Account is not frozen")]
    AccountNotFrozen,

    #[msg("Token account has insufficient balance")]
    InsufficientFunds,

    #[msg("Authority transfer requires a new, non-default authority")]
    InvalidAuthorityTransfer,

    #[msg("Role update must change at least one role")]
    NoRoleChanges,

    #[msg("Address is blacklisted")]
    Blacklisted,

    #[msg("Compliance module not enabled — initialize with enable_transfer_hook = true")]
    ComplianceNotEnabled,

    #[msg("Permanent delegate not enabled — initialize with enable_permanent_delegate = true")]
    PermanentDelegateNotEnabled,

    #[msg("Blacklist reason must be non-empty and within the allowed length")]
    InvalidBlacklistReason,

    #[msg("Treasury token account is not configured")]
    TreasuryNotConfigured,

    #[msg("Treasury token account does not match the configured treasury")]
    InvalidTreasuryAccount,

    #[msg("Seize target owner is not blacklisted")]
    SeizeTargetNotBlacklisted,

    #[msg("Seize target token account must be frozen")]
    SeizeTargetNotFrozen,
}
