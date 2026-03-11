import type { NormalizedIndexerEvent } from "../ingest/event-normalizer";
import type { IndexerStablecoinProjectionState } from "../store/indexer-repository";

const asString = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const asBigInt = (value: unknown): bigint | null => {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  return null;
};

const uniqueAddressList = (addresses: Iterable<string>): string[] => {
  return [...new Set(addresses)];
};

export const createEmptyStablecoinProjection = (
  tenantId: string,
  stablecoinId: string
): IndexerStablecoinProjectionState => {
  return {
    tenant_id: tenantId,
    stablecoin_id: stablecoinId,
    total_supply: 0n,
    paused: false,
    roles: {},
    minter_quotas: {},
    blacklist: [],
    last_event_id: null,
    updated_at: new Date(0).toISOString(),
  };
};

export const applyStablecoinProjectionEvent = (
  current: IndexerStablecoinProjectionState,
  event: NormalizedIndexerEvent
): IndexerStablecoinProjectionState => {
  const payload = event.body.payload;
  const next: IndexerStablecoinProjectionState = {
    ...current,
    roles: { ...current.roles },
    minter_quotas: { ...current.minter_quotas },
    blacklist: [...current.blacklist],
    last_event_id: event.event_id,
    updated_at: event.occurred_at,
  };

  if (event.event_type === "mint.executed") {
    const amount = asBigInt(payload.amount);
    if (amount !== null && amount >= 0n) {
      next.total_supply = current.total_supply + amount;
    }
    return next;
  }

  if (event.event_type === "burn.executed") {
    const amount = asBigInt(payload.amount);
    if (amount !== null && amount >= 0n) {
      next.total_supply = current.total_supply > amount ? current.total_supply - amount : 0n;
    }
    return next;
  }

  if (event.event_type === "pause.updated") {
    if (typeof payload.paused === "boolean") {
      next.paused = payload.paused;
    }
    return next;
  }

  if (event.event_type === "role.updated") {
    const role = asString(payload.role);
    const address = asString(payload.address);
    if (role && address) {
      next.roles[role] = address;
    }
    return next;
  }

  if (event.event_type === "quota.updated") {
    const minter = asString(payload.minter);
    const quota = asBigInt(payload.quota);
    if (minter && quota !== null && quota >= 0n) {
      next.minter_quotas[minter] = quota;
    }
    return next;
  }

  if (event.event_type === "blacklist.updated") {
    const address = asString(payload.address);
    const listed = payload.listed;
    if (address && typeof listed === "boolean") {
      if (listed) {
        next.blacklist = uniqueAddressList([...next.blacklist, address]);
      } else {
        next.blacklist = next.blacklist.filter((entry) => entry !== address);
      }
    }
    return next;
  }

  return next;
};
