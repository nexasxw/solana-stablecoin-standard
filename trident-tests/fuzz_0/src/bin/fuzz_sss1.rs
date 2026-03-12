#[path = "../invariants.rs"]
mod invariants;

use invariants::DeterministicGenerator;
use invariants::InvariantModel;
use invariants::Sss1Operation;

fn main() {
    let iterations = read_env_u64("SSS1_FUZZ_SMOKE_ITERS", 64);
    let ops_per_iteration = read_env_u64("SSS1_FUZZ_SMOKE_OPS", 96);

    for iteration in 0..iterations {
        let mut generator = DeterministicGenerator::new(0x11 + iteration);
        let mut model = InvariantModel::new();

        for _ in 0..ops_per_iteration {
            let op = generate_sss1_operation(&mut generator);
            let exec = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let _ = model.apply_sss1(op);
            }));
            assert!(exec.is_ok(), "panic-free invariant violated for SSS-1 harness");
            model.assert_invariants();
        }
    }

    println!(
        "fuzz_sss1 smoke passed (iterations={}, ops_per_iteration={})",
        iterations, ops_per_iteration
    );
}

fn generate_sss1_operation(generator: &mut DeterministicGenerator) -> Sss1Operation {
    let amount = generator.next_amount(25_000);
    let account = generator.next_account();
    match generator.next_u64() % 4 {
        0 => Sss1Operation::AuthorizedMint {
            to: account,
            amount,
        },
        1 => Sss1Operation::AuthorizedBurn {
            from: account,
            amount,
        },
        2 => Sss1Operation::AuthorizedTransferAuthority,
        _ => Sss1Operation::UnauthorizedAdminMutationAttempt,
    }
}

fn read_env_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(default)
}
