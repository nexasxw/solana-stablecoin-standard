//! Initialize a new SSS-1 stablecoin mint.

use anchor_lang::{
    prelude::*,
    solana_program::program::{invoke, invoke_signed},
    system_program::{self, CreateAccount},
};
use anchor_spl::{associated_token::AssociatedToken, token_interface::TokenInterface};
use spl_token_2022::{
    extension::{
        metadata_pointer::instruction::initialize as initialize_metadata_pointer, ExtensionType,
    },
    instruction::{initialize_mint2, initialize_mint_close_authority},
};
use spl_token_metadata_interface::{
    instruction::initialize as initialize_token_metadata, state::TokenMetadata,
};

use crate::{
    constants::STABLECOIN_SEED,
    error::StablecoinError,
    events::StablecoinInitialized,
    state::{Stablecoin, StablecoinConfig},
};

#[derive(Accounts)]
#[instruction(config: StablecoinConfig)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Stablecoin::LEN,
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// Token-2022 mint — created via CPI in handler
    #[account(mut)]
    pub mint: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>, config: StablecoinConfig) -> Result<()> {
    validate_config(&ctx.accounts.token_program, &config)?;
    create_mint_account(&ctx, &config)?;
    initialize_mint(&ctx, &config)?;

    let stablecoin_key = ctx.accounts.stablecoin.key();
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();
    let stablecoin = &mut ctx.accounts.stablecoin;

    stablecoin.authority = authority_key;
    stablecoin.mint = mint_key;
    stablecoin.pauser = authority_key;
    stablecoin.burner = authority_key;
    stablecoin.paused = false;
    stablecoin.permanent_delegate_enabled = false;
    stablecoin.transfer_hook_enabled = false;
    stablecoin.bump = ctx.bumps.stablecoin;
    stablecoin._reserved = [0u8; 64];

    emit!(StablecoinInitialized {
        stablecoin: stablecoin_key,
        authority: authority_key,
        mint: mint_key,
        name: config.name,
        symbol: config.symbol,
        decimals: config.decimals,
        permanent_delegate_enabled: false,
        transfer_hook_enabled: false,
    });

    Ok(())
}

fn validate_config(
    token_program: &Interface<TokenInterface>,
    config: &StablecoinConfig,
) -> Result<()> {
    require_keys_eq!(
        token_program.key(),
        spl_token_2022::id(),
        StablecoinError::InvalidTokenProgram
    );
    require!(
        !(config.enable_permanent_delegate || config.enable_transfer_hook),
        StablecoinError::UnsupportedExtensionConfig
    );
    require!(
        !config.name.trim().is_empty()
            && !config.symbol.trim().is_empty()
            && !config.uri.trim().is_empty(),
        StablecoinError::InvalidMetadata
    );
    Ok(())
}

fn create_mint_account(ctx: &Context<Initialize>, config: &StablecoinConfig) -> Result<()> {
    let mint_space = mint_account_space(config)?;
    let lamports = ctx.accounts.rent.minimum_balance(mint_space);

    system_program::create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.mint.to_account_info(),
            },
        ),
        lamports,
        mint_space as u64,
        &ctx.accounts.token_program.key(),
    )?;

    Ok(())
}

fn initialize_mint(ctx: &Context<Initialize>, config: &StablecoinConfig) -> Result<()> {
    let stablecoin_key = ctx.accounts.stablecoin.key();
    let mint_key = ctx.accounts.mint.key();
    let token_program_key = ctx.accounts.token_program.key();
    let stablecoin_bump = [ctx.bumps.stablecoin];
    let signer_seeds = &[&[STABLECOIN_SEED, mint_key.as_ref(), &stablecoin_bump][..]];

    invoke(
        &initialize_metadata_pointer(
            &token_program_key,
            &mint_key,
            Some(stablecoin_key),
            Some(mint_key),
        )?,
        &[
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.mint.to_account_info(),
        ],
    )?;

    invoke(
        &initialize_mint_close_authority(&token_program_key, &mint_key, Some(&stablecoin_key))?,
        &[
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.mint.to_account_info(),
        ],
    )?;

    invoke(
        &initialize_mint2(
            &token_program_key,
            &mint_key,
            &stablecoin_key,
            Some(&stablecoin_key),
            config.decimals,
        )?,
        &[
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.mint.to_account_info(),
        ],
    )?;

    invoke_signed(
        &initialize_token_metadata(
            &token_program_key,
            &mint_key,
            &stablecoin_key,
            &mint_key,
            &stablecoin_key,
            config.name.clone(),
            config.symbol.clone(),
            config.uri.clone(),
        ),
        &[
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.stablecoin.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.stablecoin.to_account_info(),
        ],
        signer_seeds,
    )?;

    Ok(())
}

fn mint_account_space(config: &StablecoinConfig) -> Result<usize> {
    let metadata = TokenMetadata {
        name: config.name.clone(),
        symbol: config.symbol.clone(),
        uri: config.uri.clone(),
        ..Default::default()
    };
    let metadata_space = metadata.tlv_size_of()?;
    let base_space = ExtensionType::try_calculate_account_len::<spl_token_2022::state::Mint>(&[
        ExtensionType::MetadataPointer,
        ExtensionType::MintCloseAuthority,
    ])?;

    base_space
        .checked_add(metadata_space)
        .ok_or_else(|| StablecoinError::MathOverflow.into())
}
