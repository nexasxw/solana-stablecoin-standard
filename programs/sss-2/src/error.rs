//! SSS-2 error codes.

use anchor_lang::prelude::*;

#[error_code]
pub enum StablecoinError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,

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

    #[msg("Address is blacklisted")]
    Blacklisted,

    #[msg("Compliance module not enabled — initialize with enable_transfer_hook = true")]
    ComplianceNotEnabled,

    #[msg("Permanent delegate not enabled — initialize with enable_permanent_delegate = true")]
    PermanentDelegateNotEnabled,
}
