import type { NormalizedIndexerEvent } from "../ingest/event-normalizer";
import type { HolderBalanceProjection } from "../store/indexer-repository";

const parseAmount = (value: unknown): bigint | null => {
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

const nextBalance = (
  current: HolderBalanceProjection,
  delta: bigint,
  occurredAt: string
): HolderBalanceProjection => {
  const balance = current.balance + delta;
  return {
    ...current,
    balance: balance >= 0n ? balance : 0n,
    updated_at: occurredAt,
  };
};

export const createEmptyHolderBalance = (
  tenantId: string,
  stablecoinId: string,
  holder: string
): HolderBalanceProjection => {
  return {
    tenant_id: tenantId,
    stablecoin_id: stablecoinId,
    holder,
    balance: 0n,
    updated_at: new Date(0).toISOString(),
  };
};

export const reduceHolderBalancesFromEvent = (
  event: NormalizedIndexerEvent
): Array<{ holder: string; delta: bigint }> => {
  const payload = event.body.payload;

  if (event.event_type === "mint.executed") {
    const to = typeof payload.to === "string" ? payload.to : null;
    const amount = parseAmount(payload.amount);
    if (to && amount !== null && amount > 0n) {
      return [{ holder: to, delta: amount }];
    }
    return [];
  }

  if (event.event_type === "burn.executed") {
    const from = typeof payload.from === "string" ? payload.from : null;
    const amount = parseAmount(payload.amount);
    if (from && amount !== null && amount > 0n) {
      return [{ holder: from, delta: -amount }];
    }
    return [];
  }

  if (event.event_type === "transfer.executed") {
    const from = typeof payload.from === "string" ? payload.from : null;
    const to = typeof payload.to === "string" ? payload.to : null;
    const amount = parseAmount(payload.amount);
    if (from && to && amount !== null && amount > 0n) {
      return [
        { holder: from, delta: -amount },
        { holder: to, delta: amount },
      ];
    }
  }

  if (event.event_type === "seize.executed") {
    const from = typeof payload.from === "string" ? payload.from : null;
    const to = typeof payload.to === "string" ? payload.to : null;
    const amount = parseAmount(payload.amount);
    if (from && to && amount !== null && amount > 0n) {
      return [
        { holder: from, delta: -amount },
        { holder: to, delta: amount },
      ];
    }
  }

  return [];
};

export const applyHolderBalanceDelta = (
  current: HolderBalanceProjection,
  delta: bigint,
  occurredAt: string
): HolderBalanceProjection => {
  return nextBalance(current, delta, occurredAt);
};
