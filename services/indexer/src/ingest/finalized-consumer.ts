import {
  normalizeFinalizedEvent,
  type FinalizedChainEvent,
  type NormalizedIndexerEvent,
} from "./event-normalizer";
import { IndexerRepository } from "../store/indexer-repository";

export interface FinalizedIngestBatchInput {
  tenant_id: string;
  stream_id: string;
  events: FinalizedChainEvent[];
}

export interface FinalizedIngestBatchResult {
  accepted: number;
  duplicates: number;
  latest_checkpoint: number | null;
  normalized_events: NormalizedIndexerEvent[];
}

export class FinalizedConsumer {
  constructor(private readonly repository: IndexerRepository) {}

  ingestBatch(input: FinalizedIngestBatchInput): FinalizedIngestBatchResult {
    const checkpoint = this.repository.getCheckpoint(input.tenant_id, input.stream_id);
    const finalizedEvents = input.events.filter((event) => event.finalized);

    const monotonicEvents = finalizedEvents.filter((event) => {
      if (!checkpoint) {
        return true;
      }
      return event.slot >= checkpoint.slot;
    });

    const normalized = monotonicEvents.map((event) => normalizeFinalizedEvent(event));
    const inserted = this.repository.appendNormalizedEvents(normalized);

    const latest = monotonicEvents.reduce<number | null>((current, event) => {
      if (current === null || event.slot > current) {
        return event.slot;
      }
      return current;
    }, checkpoint?.slot ?? null);

    if (latest !== null) {
      const latestEvent = monotonicEvents
        .filter((event) => event.slot === latest)
        .sort((a, b) => b.log_index - a.log_index)[0];

      this.repository.advanceCheckpoint({
        tenant_id: input.tenant_id,
        stream_id: input.stream_id,
        slot: latest,
        tx_signature: latestEvent.tx_signature,
        event_id: normalizeFinalizedEvent(latestEvent).event_id,
        processed_at: new Date().toISOString(),
      });
    }

    return {
      accepted: inserted.length,
      duplicates: normalized.length - inserted.length,
      latest_checkpoint: latest,
      normalized_events: inserted,
    };
  }
}
