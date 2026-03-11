import { expect } from "chai";
import { runCli } from "../src/cli";

describe("CLI management commands", () => {
  it("returns deterministic unsupported response for holders", async () => {
    const originalWrite = process.stderr.write.bind(process.stderr);
    const output: string[] = [];
    (process.stderr.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      output.push(chunk);
      return true;
    };

    try {
      const exitCode = await runCli(["node", "sss-token", "--json", "holders"]);
      expect(exitCode).to.equal(3);
    } finally {
      (process.stderr.write as unknown as (chunk: string) => boolean) = originalWrite as unknown as (chunk: string) => boolean;
    }

    const parsed = JSON.parse(output.join(""));
    expect(parsed.ok).to.equal(false);
    expect(parsed.error.code).to.equal("CLI_SDK");
    expect(parsed.error.details.sdkCode).to.equal("UNSUPPORTED_OPERATION");
    expect(parsed.error.details.command).to.equal("holders");
    expect(parsed.error.details.deferredTo).to.equal("phase-07-backend-services");
  });

  it("returns deterministic unsupported response for audit-log", async () => {
    const originalWrite = process.stderr.write.bind(process.stderr);
    const output: string[] = [];
    (process.stderr.write as unknown as (chunk: string) => boolean) = (chunk: string): boolean => {
      output.push(chunk);
      return true;
    };

    try {
      const exitCode = await runCli(["node", "sss-token", "--json", "audit-log"]);
      expect(exitCode).to.equal(3);
    } finally {
      (process.stderr.write as unknown as (chunk: string) => boolean) = originalWrite as unknown as (chunk: string) => boolean;
    }

    const parsed = JSON.parse(output.join(""));
    expect(parsed.ok).to.equal(false);
    expect(parsed.error.code).to.equal("CLI_SDK");
    expect(parsed.error.details.sdkCode).to.equal("UNSUPPORTED_OPERATION");
    expect(parsed.error.details.command).to.equal("audit-log");
    expect(parsed.error.details.deferredTo).to.equal("phase-07-backend-services");
  });
});
