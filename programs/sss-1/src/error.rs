//! SSS-1 error codes.

use anchor_lang::prelude::*;

#[error_code]
pub enum StablecoinError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,

    #[msg("Initialize requires the Token-2022 program")]
    InvalidTokenProgram,

    #[msg("SSS-1 initialize does not support permanent delegate or transfer hook in Phase 2")]
    UnsupportedExtensionConfig,

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

    #[msg("Compliance module not enabled — initialize with enable_transfer_hook = true")]
    ComplianceNotEnabled,

    #[msg("Permanent delegate not enabled — initialize with enable_permanent_delegate = true")]
    PermanentDelegateNotEnabled,
}
