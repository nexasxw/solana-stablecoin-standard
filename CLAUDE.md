# Solana Stablecoin Standard

Open-source SDK and standards for stablecoins on Solana. SSS-1 (minimal) and SSS-2 (compliant, with blacklist/seize).

**Stack**: Anchor 0.31+, Rust 1.82+, Token-2022, TypeScript
**Reference**: `../solana-vault-standard/` for patterns and code quality bar

## Standards

- **SSS-1**: Minimal stablecoin — mint + freeze + metadata
- **SSS-2**: Compliant stablecoin — SSS-1 + permanent delegate + transfer hook + blacklist

## Anti-Patterns — NEVER

**Security:**
- `unwrap()` in program code
- Unchecked arithmetic — use `checked_add`, `checked_sub`
- Recalculate PDA bumps — store canonical bumps
- Skip account validation (owner, signer, PDA derivation)
- Deploy devnet program IDs to mainnet without explicit confirmation

**Code Quality:**
- Comments stating the obvious
- Defensive try/catch abnormal for the codebase
- Import unused dependencies
- Abstractions for one-time operations

## Lessons Learned

**Token-2022 Transfer Hook:**
- Extra accounts must be resolved before CPI, not during
- Use `get_extra_account_metas_address` for hook state PDA
- Blacklist PDAs use Option accounts — missing PDA = not blacklisted (no error)

**Permanent Delegate:**
- PDA must be set as delegate at mint creation time — cannot be added later
- Use `transfer_checked` (not `transfer`) when using permanent delegate

## Review Checklist

- No AI slop introduced
- All arithmetic uses checked operations
- PDA bumps stored and reused (not recalculated)
- SSS-2 instructions fail gracefully if compliance not enabled
- Events emitted for all state changes
