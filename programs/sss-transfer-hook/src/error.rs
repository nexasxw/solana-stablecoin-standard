//! Transfer hook error codes.

use anchor_lang::prelude::*;

#[error_code]
pub enum HookError {
    #[msg("Sender is blacklisted")]
    SenderBlacklisted,

    #[msg("Recipient is blacklisted")]
    RecipientBlacklisted,
}
