import { expect } from "chai";
import { SdkErrorCode, StablecoinSdkError } from "../src/errors";
import { CliError, CliErrorCode, CliUsageError, resolveCliFailure } from "../src/cli/errors";
import { buildFailureEnvelope, buildSuccessEnvelope, renderFailure, renderSuccess } from "../src/cli/output";

describe("CLI output and exit-code contract", () => {
  it("renders stable json envelope for success output", () => {
    const envelope = buildSuccessEnvelope("init create", { mint: "mint-123" });
    expect(envelope).to.deep.equal({
      ok: true,
      command: "init create",
      data: { mint: "mint-123" },
      error: null,
    });

    const rendered = renderSuccess("init create", { mint: "mint-123" }, true);
    const parsed = JSON.parse(rendered);
    expect(parsed.ok).to.equal(true);
    expect(parsed.command).to.equal("init create");
    expect(parsed.data.mint).to.equal("mint-123");
  });

  it("renders stable json envelope for failures with deterministic code", () => {
    const cliError = new CliUsageError("Missing required argument: mint");
    const envelope = buildFailureEnvelope("lifecycle mint", cliError);

    expect(envelope).to.deep.equal({
      ok: false,
      command: "lifecycle mint",
      data: null,
      error: {
        code: "CLI_USAGE",
        message: "Missing required argument: mint",
      },
    });

    const rendered = renderFailure("lifecycle mint", cliError, true);
    const parsed = JSON.parse(rendered);
    expect(parsed.ok).to.equal(false);
    expect(parsed.error.code).to.equal("CLI_USAGE");
    expect(parsed.error.message).to.match(/Missing required argument/);
  });

  it("maps SDK failures to deterministic non-zero exits and preserves sdk error code", () => {
    const sdkError = new StablecoinSdkError(
      SdkErrorCode.UNSUPPORTED_OPERATION,
      "Compliance not supported for SSS-1."
    );

    const resolved = resolveCliFailure(sdkError);
    expect(resolved).to.be.instanceOf(CliError);
    expect(resolved.code).to.equal(CliErrorCode.SDK);
    expect(resolved.exitCode).to.equal(3);
    expect(resolved.details?.sdkCode).to.equal(SdkErrorCode.UNSUPPORTED_OPERATION);
  });

  it("maps local usage failures to exit code 2", () => {
    const resolved = resolveCliFailure(new CliUsageError("Missing --mint"));
    expect(resolved.exitCode).to.equal(2);
    expect(resolved.code).to.equal(CliErrorCode.USAGE);
  });
});
