use std::collections::BTreeSet;
use std::collections::HashMap;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BaselineOperation {
    AuthorizedMint { to: AccountId, amount: u64 },
    AuthorizedBurn { from: AccountId, amount: u64 },
    UnauthorizedMintAttempt { to: AccountId, amount: u64 },
    UnauthorizedBurnAttempt { from: AccountId, amount: u64 },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Sss1Operation {
    AuthorizedMint { to: AccountId, amount: u64 },
    AuthorizedBurn { from: AccountId, amount: u64 },
    AuthorizedTransferAuthority,
    UnauthorizedAdminMutationAttempt,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Sss2Operation {
    AuthorizedMint { to: AccountId, amount: u64 },
    AuthorizedBurn { from: AccountId, amount: u64 },
    AddToBlacklist { account: AccountId },
    RemoveFromBlacklist { account: AccountId },
    TransferAttempt {
        from: AccountId,
        to: AccountId,
        amount: u64,
    },
    SeizeAttempt { target: AccountId, amount: u64 },
    UnauthorizedComplianceMutationAttempt,
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum AccountId {
    Alice,
    Bob,
    Carol,
    Treasury,
}

impl AccountId {
    pub fn from_index(index: u64) -> Self {
        match index % 4 {
            0 => Self::Alice,
            1 => Self::Bob,
            2 => Self::Carol,
            _ => Self::Treasury,
        }
    }
}

#[derive(Debug, Default)]
pub struct InvariantModel {
    total_supply: u64,
    balances: HashMap<AccountId, u64>,
    blacklisted: BTreeSet<AccountId>,
    unauthorized_mutation_attempts: u64,
    unauthorized_mutation_successes: u64,
    transfer_rejections: u64,
}

impl InvariantModel {
    pub fn new() -> Self {
        let mut balances = HashMap::new();
        balances.insert(AccountId::Alice, 0);
        balances.insert(AccountId::Bob, 0);
        balances.insert(AccountId::Carol, 0);
        balances.insert(AccountId::Treasury, 0);

        Self {
            total_supply: 0,
            balances,
            blacklisted: BTreeSet::new(),
            unauthorized_mutation_attempts: 0,
            unauthorized_mutation_successes: 0,
            transfer_rejections: 0,
        }
    }

    pub fn apply_baseline(&mut self, op: BaselineOperation) -> Result<(), &'static str> {
        match op {
            BaselineOperation::AuthorizedMint { to, amount } => self.mint(to, amount),
            BaselineOperation::AuthorizedBurn { from, amount } => self.burn(from, amount),
            BaselineOperation::UnauthorizedMintAttempt { .. }
            | BaselineOperation::UnauthorizedBurnAttempt { .. } => {
                self.unauthorized_mutation_attempts =
                    self.unauthorized_mutation_attempts.saturating_add(1);
                Err("unauthorized mutation rejected")
            }
        }
    }

    pub fn apply_sss1(&mut self, op: Sss1Operation) -> Result<(), &'static str> {
        match op {
            Sss1Operation::AuthorizedMint { to, amount } => self.mint(to, amount),
            Sss1Operation::AuthorizedBurn { from, amount } => self.burn(from, amount),
            Sss1Operation::AuthorizedTransferAuthority => Ok(()),
            Sss1Operation::UnauthorizedAdminMutationAttempt => {
                self.unauthorized_mutation_attempts =
                    self.unauthorized_mutation_attempts.saturating_add(1);
                Err("unauthorized admin mutation rejected")
            }
        }
    }

    pub fn apply_sss2(&mut self, op: Sss2Operation) -> Result<(), &'static str> {
        match op {
            Sss2Operation::AuthorizedMint { to, amount } => self.mint(to, amount),
            Sss2Operation::AuthorizedBurn { from, amount } => self.burn(from, amount),
            Sss2Operation::AddToBlacklist { account } => {
                self.blacklisted.insert(account);
                Ok(())
            }
            Sss2Operation::RemoveFromBlacklist { account } => {
                self.blacklisted.remove(&account);
                Ok(())
            }
            Sss2Operation::TransferAttempt { from, to, amount } => {
                if self.blacklisted.contains(&from) || self.blacklisted.contains(&to) {
                    self.transfer_rejections = self.transfer_rejections.saturating_add(1);
                    return Err("transfer hook rejected blacklisted account");
                }

                self.transfer(from, to, amount)
            }
            Sss2Operation::SeizeAttempt { target, amount } => {
                if !self.blacklisted.contains(&target) {
                    return Err("seize requires blacklisted target");
                }

                self.transfer(target, AccountId::Treasury, amount)
            }
            Sss2Operation::UnauthorizedComplianceMutationAttempt => {
                self.unauthorized_mutation_attempts =
                    self.unauthorized_mutation_attempts.saturating_add(1);
                Err("unauthorized compliance mutation rejected")
            }
        }
    }

    pub fn assert_invariants(&self) {
        self.assert_no_unauthorized_mutation_success();
        self.assert_supply_consistency();
    }

    pub fn transfer_rejections(&self) -> u64 {
        self.transfer_rejections
    }

    pub fn unauthorized_attempts(&self) -> u64 {
        self.unauthorized_mutation_attempts
    }

    fn mint(&mut self, to: AccountId, amount: u64) -> Result<(), &'static str> {
        if amount == 0 {
            return Ok(());
        }

        self.total_supply = self
            .total_supply
            .checked_add(amount)
            .ok_or("total supply overflow")?;
        let entry = self.balances.entry(to).or_insert(0);
        *entry = entry.checked_add(amount).ok_or("balance overflow")?;
        Ok(())
    }

    fn burn(&mut self, from: AccountId, amount: u64) -> Result<(), &'static str> {
        if amount == 0 {
            return Ok(());
        }

        let entry = self.balances.entry(from).or_insert(0);
        *entry = entry
            .checked_sub(amount)
            .ok_or("insufficient balance")?;
        self.total_supply = self
            .total_supply
            .checked_sub(amount)
            .ok_or("total supply underflow")?;
        Ok(())
    }

    fn transfer(&mut self, from: AccountId, to: AccountId, amount: u64) -> Result<(), &'static str> {
        if amount == 0 || from == to {
            return Ok(());
        }

        let from_entry = self.balances.entry(from).or_insert(0);
        *from_entry = from_entry
            .checked_sub(amount)
            .ok_or("insufficient balance")?;
        let to_entry = self.balances.entry(to).or_insert(0);
        *to_entry = to_entry.checked_add(amount).ok_or("balance overflow")?;
        Ok(())
    }

    fn assert_no_unauthorized_mutation_success(&self) {
        assert_eq!(
            self.unauthorized_mutation_successes, 0,
            "unauthorized mutation was applied"
        );
    }

    fn assert_supply_consistency(&self) {
        let reconstructed_supply = self
            .balances
            .values()
            .copied()
            .fold(0u64, |acc, value| acc.saturating_add(value));
        assert_eq!(
            self.total_supply, reconstructed_supply,
            "supply/accounting invariant failed"
        );
    }
}

#[derive(Clone, Debug)]
pub struct DeterministicGenerator {
    state: u64,
}

impl DeterministicGenerator {
    pub fn new(seed: u64) -> Self {
        Self { state: seed.max(1) }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        self.state
    }

    pub fn next_amount(&mut self, cap: u64) -> u64 {
        let bound = cap.max(1);
        self.next_u64() % bound
    }

    pub fn next_account(&mut self) -> AccountId {
        AccountId::from_index(self.next_u64())
    }
}
