#[path = "../invariants.rs"]
mod invariants;

use invariants::DeterministicGenerator;
use invariants::InvariantModel;
use invariants::Sss2Operation;

fn main() {
    let iterations = read_env_u64("SSS2_FUZZ_SMOKE_ITERS", 64);
    let ops_per_iteration = read_env_u64("SSS2_FUZZ_SMOKE_OPS", 128);

    for iteration in 0..iterations {
        let mut generator = DeterministicGenerator::new(0x22 + iteration);
        let mut model = InvariantModel::new();

        for _ in 0..ops_per_iteration {
            let op = generate_sss2_operation(&mut generator);
            let exec = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let _ = model.apply_sss2(op);
            }));
            assert!(exec.is_ok(), "panic-free invariant violated for SSS-2 harness");
            model.assert_invariants();
        }

        // Transfer-hook risk signal: at least one blocked transfer should occur in a mixed campaign.
        assert!(
            model.transfer_rejections() > 0 || model.unauthorized_attempts() > 0,
            "SSS-2 campaign did not exercise rejection paths"
        );
    }

    println!(
        "fuzz_sss2 smoke passed (iterations={}, ops_per_iteration={})",
        iterations, ops_per_iteration
    );
}

fn generate_sss2_operation(generator: &mut DeterministicGenerator) -> Sss2Operation {
    let from = generator.next_account();
    let to = generator.next_account();
    let amount = generator.next_amount(25_000);
    let account = generator.next_account();

    match generator.next_u64() % 7 {
        0 => Sss2Operation::AuthorizedMint {
            to: account,
            amount,
        },
        1 => Sss2Operation::AuthorizedBurn {
            from: account,
            amount,
        },
        2 => Sss2Operation::AddToBlacklist { account },
        3 => Sss2Operation::RemoveFromBlacklist { account },
        4 => Sss2Operation::TransferAttempt { from, to, amount },
        5 => Sss2Operation::SeizeAttempt {
            target: account,
            amount,
        },
        _ => Sss2Operation::UnauthorizedComplianceMutationAttempt,
    }
}

fn read_env_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(default)
}
