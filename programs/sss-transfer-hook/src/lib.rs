//! SSS Transfer Hook Program
//!
//! A separate Anchor program that enforces blacklist checks on every Token-2022
//! transfer for SSS-2 stablecoins. The hook is called by the Token-2022 program
//! on every transfer — no gaps.
//!
//! Rejects any transfer where the sender or recipient is on the blacklist.

use anchor_lang::prelude::*;
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("SSSHook111111111111111111111111111111111111");

#[program]
pub mod sss_transfer_hook {
    use super::*;

    /// Called by Token-2022 on every transfer. Checks blacklist for sender and recipient.
    /// Accounts include extra_account_metas PDA resolved at transfer time.
    #[instruction(discriminator = [105, 37, 101, 197, 75, 251, 102, 26])]
    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
        instructions::transfer_hook::handler(ctx, amount)
    }

    /// Initialize the extra account metas for the hook (called once per mint at init).
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        instructions::initialize::handler(ctx)
    }
}
