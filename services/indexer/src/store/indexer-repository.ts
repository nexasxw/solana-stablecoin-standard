import type { NormalizedIndexerEvent } from "../ingest/event-normalizer";

export interface IndexerCheckpoint {
  tenant_id: string;
  stream_id: string;
  slot: number;
  tx_signature: string | null;
  event_id: string | null;
  processed_at: string;
}

export interface IndexerStablecoinProjectionState {
  tenant_id: string;
  stablecoin_id: string;
  total_supply: bigint;
  paused: boolean;
  roles: Record<string, string>;
  minter_quotas: Record<string, bigint>;
  blacklist: string[];
  last_event_id: string | null;
  updated_at: string;
}

export interface HolderBalanceProjection {
  tenant_id: string;
  stablecoin_id: string;
  holder: string;
  balance: bigint;
  updated_at: string;
}

export class IndexerRepository {
  private readonly checkpoints = new Map<string, IndexerCheckpoint>();

  private readonly eventsByTenant = new Map<string, NormalizedIndexerEvent[]>();

  private readonly dedupeKeys = new Set<string>();

  private readonly stablecoinProjections = new Map<string, IndexerStablecoinProjectionState>();

  private readonly holderBalances = new Map<string, HolderBalanceProjection>();

  private checkpointKey(tenantId: string, streamId: string): string {
    return `${tenantId}:${streamId}`;
  }

  private projectionKey(tenantId: string, stablecoinId: string): string {
    return `${tenantId}:${stablecoinId}`;
  }

  private holderKey(tenantId: string, stablecoinId: string, holder: string): string {
    return `${tenantId}:${stablecoinId}:${holder}`;
  }

  hasDedupeKey(tenantId: string, dedupeKey: string): boolean {
    return this.dedupeKeys.has(`${tenantId}:${dedupeKey}`);
  }

  appendNormalizedEvents(events: NormalizedIndexerEvent[]): NormalizedIndexerEvent[] {
    const inserted: NormalizedIndexerEvent[] = [];

    for (const event of events) {
      const dedupeKey = `${event.tenant_id}:${event.dedupe_key}`;
      if (this.dedupeKeys.has(dedupeKey)) {
        continue;
      }

      this.dedupeKeys.add(dedupeKey);
      const tenantEvents = this.eventsByTenant.get(event.tenant_id) ?? [];
      tenantEvents.push(event);
      this.eventsByTenant.set(event.tenant_id, tenantEvents);
      inserted.push(event);
    }

    return inserted;
  }

  getCheckpoint(tenantId: string, streamId: string): IndexerCheckpoint | null {
    return this.checkpoints.get(this.checkpointKey(tenantId, streamId)) ?? null;
  }

  advanceCheckpoint(next: IndexerCheckpoint): void {
    const key = this.checkpointKey(next.tenant_id, next.stream_id);
    const current = this.checkpoints.get(key);
    if (current && next.slot < current.slot) {
      throw new Error(
        `Checkpoint regression for ${next.tenant_id}/${next.stream_id}: ${next.slot} < ${current.slot}`
      );
    }

    this.checkpoints.set(key, next);
  }

  listEvents(tenantId: string): NormalizedIndexerEvent[] {
    return [...(this.eventsByTenant.get(tenantId) ?? [])];
  }

  upsertStablecoinProjection(tenantId: string, state: IndexerStablecoinProjectionState): void {
    if (state.tenant_id !== tenantId) {
      throw new Error("Stablecoin projection tenant mismatch");
    }
    this.stablecoinProjections.set(this.projectionKey(tenantId, state.stablecoin_id), state);
  }

  getStablecoinProjection(
    tenantId: string,
    stablecoinId: string
  ): IndexerStablecoinProjectionState | null {
    return this.stablecoinProjections.get(this.projectionKey(tenantId, stablecoinId)) ?? null;
  }

  upsertHolderBalance(tenantId: string, state: HolderBalanceProjection): void {
    if (state.tenant_id !== tenantId) {
      throw new Error("Holder balance tenant mismatch");
    }
    this.holderBalances.set(this.holderKey(tenantId, state.stablecoin_id, state.holder), state);
  }

  listHolderBalances(tenantId: string, stablecoinId: string): HolderBalanceProjection[] {
    return [...this.holderBalances.values()]
      .filter((entry) => entry.tenant_id === tenantId && entry.stablecoin_id === stablecoinId)
      .sort((a, b) => (a.balance === b.balance ? 0 : a.balance > b.balance ? -1 : 1));
  }
}
