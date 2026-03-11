export const INDEXER_EVENT_VERSION = "1.0";

export interface EventEnvelope<TBody = unknown> {
  event_id: string;
  event_type: string;
  event_version: string;
  request_id: string;
  occurred_at: string;
  body: TBody;
}

export type IndexerEventType =
  | "mint.executed"
  | "burn.executed"
  | "transfer.executed"
  | "pause.updated"
  | "quota.updated"
  | "role.updated"
  | "blacklist.updated"
  | "seize.executed";

export interface FinalizedChainEvent {
  tenant_id: string;
  program_id: string;
  stablecoin_id: string;
  tx_signature: string;
  slot: number;
  log_index: number;
  request_id: string;
  occurred_at: string;
  event_type: IndexerEventType;
  finalized: boolean;
  body: Record<string, unknown>;
}

export interface NormalizedIndexerEventBody {
  tenant_id: string;
  stablecoin_id: string;
  program_id: string;
  slot: number;
  tx_signature: string;
  log_index: number;
  payload: Record<string, unknown>;
}

export interface NormalizedIndexerEvent extends EventEnvelope<NormalizedIndexerEventBody> {
  tenant_id: string;
  dedupe_key: string;
}

export const deriveDedupeKey = (event: Pick<
  FinalizedChainEvent,
  "tenant_id" | "program_id" | "slot" | "tx_signature" | "log_index"
>): string => {
  return [
    event.tenant_id,
    event.program_id,
    String(event.slot),
    event.tx_signature,
    String(event.log_index),
  ].join(":");
};

const deriveEventId = (event: FinalizedChainEvent): string => {
  return [
    "evt",
    event.program_id,
    String(event.slot),
    event.tx_signature,
    String(event.log_index),
  ].join(":");
};

export const normalizeFinalizedEvent = (event: FinalizedChainEvent): NormalizedIndexerEvent => {
  if (!event.finalized) {
    throw new Error("Only finalized events can be normalized");
  }

  return {
    tenant_id: event.tenant_id,
    dedupe_key: deriveDedupeKey(event),
    event_id: deriveEventId(event),
    event_type: event.event_type,
    event_version: INDEXER_EVENT_VERSION,
    request_id: event.request_id,
    occurred_at: event.occurred_at,
    body: {
      tenant_id: event.tenant_id,
      stablecoin_id: event.stablecoin_id,
      program_id: event.program_id,
      slot: event.slot,
      tx_signature: event.tx_signature,
      log_index: event.log_index,
      payload: event.body,
    },
  };
};
