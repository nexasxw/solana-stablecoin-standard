#[path = "../invariants.rs"]
mod invariants;

use invariants::BaselineOperation;
use invariants::DeterministicGenerator;
use invariants::InvariantModel;

fn main() {
    let iterations = read_env_u64("SSS_FUZZ_SMOKE_ITERS", 64);
    let ops_per_iteration = read_env_u64("SSS_FUZZ_SMOKE_OPS", 128);

    for iteration in 0..iterations {
        let mut generator = DeterministicGenerator::new(iteration + 1);
        let mut model = InvariantModel::new();

        for _ in 0..ops_per_iteration {
            let op = generate_operation(&mut generator);
            let exec = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let _ = model.apply_baseline(op);
            }));
            assert!(exec.is_ok(), "panic-free invariant violated for baseline harness");
            model.assert_invariants();
        }
    }

    println!(
        "fuzz_0 baseline smoke passed (iterations={}, ops_per_iteration={})",
        iterations, ops_per_iteration
    );
}

fn generate_operation(generator: &mut DeterministicGenerator) -> BaselineOperation {
    let amount = generator.next_amount(10_000);
    let account = generator.next_account();
    match generator.next_u64() % 4 {
        0 => BaselineOperation::AuthorizedMint {
            to: account,
            amount,
        },
        1 => BaselineOperation::AuthorizedBurn {
            from: account,
            amount,
        },
        2 => BaselineOperation::UnauthorizedMintAttempt {
            to: account,
            amount,
        },
        _ => BaselineOperation::UnauthorizedBurnAttempt {
            from: account,
            amount,
        },
    }
}

fn read_env_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(default)
}
