import { CliSignerError } from "./errors";

export type SignerRole =
  | "default"
  | "authority"
  | "minter"
  | "burner"
  | "pauser"
  | "blacklister"
  | "seizer";

export interface SignerConfigInput {
  defaultSigner?: string;
  authoritySigner?: string;
  minterSigner?: string;
  burnerSigner?: string;
  pauserSigner?: string;
  blacklisterSigner?: string;
  seizerSigner?: string;
}

export interface ResolvedSignerConfig {
  defaultSigner: string | null;
  byRole: Record<Exclude<SignerRole, "default">, string | null>;
}

export interface ResolveSignerOptions {
  flags: SignerConfigInput;
  env: NodeJS.ProcessEnv;
  file: SignerConfigInput;
  requiredRoles?: Exclude<SignerRole, "default">[];
}

const ROLE_KEYS: Array<Exclude<SignerRole, "default">> = [
  "authority",
  "minter",
  "burner",
  "pauser",
  "blacklister",
  "seizer",
];

function normalizePath(value?: string): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new CliSignerError("Signer path cannot be empty.");
  }

  return normalized;
}

function envRoleKey(role: Exclude<SignerRole, "default">): string {
  return `SSS_TOKEN_${role.toUpperCase()}_SIGNER`;
}

export function resolveSignerConfig(input: ResolveSignerOptions): ResolvedSignerConfig {
  const defaultSigner =
    normalizePath(input.flags.defaultSigner) ??
    normalizePath(input.env.SSS_TOKEN_SIGNER) ??
    normalizePath(input.file.defaultSigner) ??
    null;

  const byRole = ROLE_KEYS.reduce((accumulator, role) => {
    const roleSigner =
      normalizePath(input.flags[`${role}Signer`]) ??
      normalizePath(input.env[envRoleKey(role)]) ??
      normalizePath(input.file[`${role}Signer`]) ??
      defaultSigner;

    accumulator[role] = roleSigner;
    return accumulator;
  }, {} as Record<Exclude<SignerRole, "default">, string | null>);

  for (const role of input.requiredRoles ?? []) {
    if (!byRole[role]) {
      throw new CliSignerError(`Missing signer for required role: ${role}.`, { role });
    }
  }

  return { defaultSigner, byRole };
}
