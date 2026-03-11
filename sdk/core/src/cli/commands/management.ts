import { Command } from "commander";
import { UnsupportedOperationError } from "../../errors";

function deferredManagementError(command: "holders" | "audit-log"): UnsupportedOperationError {
  return new UnsupportedOperationError(
    `${command} is deferred to the backend indexer/compliance service workflow.`,
    {
      command,
      deferredTo: "phase-07-backend-services",
    }
  );
}

export function registerManagementCommands(program: Command): void {
  program
    .command("holders")
    .description("List token holders (deferred to backend indexer service)")
    .action(() => {
      throw deferredManagementError("holders");
    });

  program
    .command("audit-log")
    .description("Fetch compliance audit log (deferred to backend compliance service)")
    .action(() => {
      throw deferredManagementError("audit-log");
    });
}
