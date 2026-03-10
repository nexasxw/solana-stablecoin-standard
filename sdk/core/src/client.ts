import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import sss1Idl from "../../../target/idl/sss_1.json";
import sss2Idl from "../../../target/idl/sss_2.json";
import { ValidationError } from "./errors";
import { StablecoinVariant } from "./types";

interface ProgramVariantDefinition {
  idl: Idl;
  programId: PublicKey;
}

const PROGRAM_VARIANTS: Record<StablecoinVariant, ProgramVariantDefinition> = {
  SSS_1: {
    idl: sss1Idl as Idl,
    programId: new PublicKey(sss1Idl.address),
  },
  SSS_2: {
    idl: sss2Idl as Idl,
    programId: new PublicKey(sss2Idl.address),
  },
};

export interface SdkProgramClient {
  variant: StablecoinVariant;
  program: Program<Idl>;
  programId: PublicKey;
}

export interface LoadVariantOptions {
  variant?: StablecoinVariant;
  isSSS2?: boolean;
  authority?: Keypair;
  extensions?: {
    permanentDelegate?: boolean;
    transferHook?: boolean;
  };
}

export function resolveVariantFromExtensions(input: {
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
}): StablecoinVariant {
  if (input.enablePermanentDelegate !== input.enableTransferHook) {
    throw new ValidationError(
      "Invalid compliance extension config: enablePermanentDelegate and enableTransferHook must both be true or both be false"
    );
  }

  return input.enablePermanentDelegate ? "SSS_2" : "SSS_1";
}

export function resolveLoadVariant(options?: LoadVariantOptions): StablecoinVariant {
  if (options?.variant) {
    return options.variant;
  }

  if (typeof options?.isSSS2 === "boolean") {
    return options.isSSS2 ? "SSS_2" : "SSS_1";
  }

  if (options?.extensions) {
    const permanentDelegate = options.extensions.permanentDelegate;
    const transferHook = options.extensions.transferHook;

    if (typeof permanentDelegate !== "boolean" || typeof transferHook !== "boolean") {
      throw new ValidationError(
        "Load options extensions must provide both permanentDelegate and transferHook booleans"
      );
    }

    return resolveVariantFromExtensions({
      enablePermanentDelegate: permanentDelegate,
      enableTransferHook: transferHook,
    });
  }

  throw new ValidationError(
    "Unable to resolve stablecoin variant for load(). Provide variant, isSSS2, or extensions flags."
  );
}

export function createProgramClient(
  connection: Connection,
  authority: Keypair,
  variant: StablecoinVariant
): SdkProgramClient {
  const definition = PROGRAM_VARIANTS[variant];
  const provider = new AnchorProvider(
    connection,
    new Wallet(authority),
    AnchorProvider.defaultOptions()
  );

  return {
    variant,
    programId: definition.programId,
    program: new Program(definition.idl, provider),
  };
}
