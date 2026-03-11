import type { FinalizedChainEvent } from "../ingest/event-normalizer";
import { FinalizedConsumer } from "../ingest/finalized-consumer";
import { IndexerRepository } from "../store/indexer-repository";

export type BackfillStatus = "queued" | "running" | "succeeded" | "failed";

export interface BackfillRequest {
  job_id: string;
  tenant_id: string;
  stream_id: string;
  start_slot: number;
  end_slot: number;
}

export interface BackfillJobState {
  job_id: string;
  tenant_id: string;
  stream_id: string;
  start_slot: number;
  end_slot: number;
  status: BackfillStatus;
  accepted_events: number;
  duplicate_events: number;
  last_checkpoint: number | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface BackfillControllerOptions {
  max_slot_span: number;
}

export class BackfillController {
  private readonly consumer: FinalizedConsumer;

  private readonly jobs = new Map<string, BackfillJobState>();

  constructor(
    private readonly repository: IndexerRepository,
    private readonly options: BackfillControllerOptions = { max_slot_span: 5_000 }
  ) {
    this.consumer = new FinalizedConsumer(repository);
  }

  startBackfill(request: BackfillRequest, events: FinalizedChainEvent[]): BackfillJobState {
    if (request.end_slot < request.start_slot) {
      throw new Error("Backfill range is invalid: end_slot must be >= start_slot");
    }
    const span = request.end_slot - request.start_slot;
    if (span > this.options.max_slot_span) {
      throw new Error(`Backfill range exceeds max span of ${this.options.max_slot_span} slots`);
    }

    const startedAt = new Date().toISOString();
    const state: BackfillJobState = {
      job_id: request.job_id,
      tenant_id: request.tenant_id,
      stream_id: request.stream_id,
      start_slot: request.start_slot,
      end_slot: request.end_slot,
      status: "running",
      accepted_events: 0,
      duplicate_events: 0,
      last_checkpoint: this.repository.getCheckpoint(request.tenant_id, request.stream_id)?.slot ?? null,
      started_at: startedAt,
      completed_at: null,
      error: null,
    };
    this.jobs.set(request.job_id, state);

    try {
      const boundedEvents = events.filter(
        (event) =>
          event.tenant_id === request.tenant_id &&
          event.slot >= request.start_slot &&
          event.slot <= request.end_slot
      );

      const result = this.consumer.ingestBatch({
        tenant_id: request.tenant_id,
        stream_id: request.stream_id,
        events: boundedEvents,
      });

      const completed: BackfillJobState = {
        ...state,
        status: "succeeded",
        accepted_events: result.accepted,
        duplicate_events: result.duplicates,
        last_checkpoint: result.latest_checkpoint,
        completed_at: new Date().toISOString(),
      };
      this.jobs.set(request.job_id, completed);
      return completed;
    } catch (error) {
      const failed: BackfillJobState = {
        ...state,
        status: "failed",
        error: error instanceof Error ? error.message : "Unexpected backfill error",
        completed_at: new Date().toISOString(),
      };
      this.jobs.set(request.job_id, failed);
      return failed;
    }
  }

  getBackfillStatus(jobId: string): BackfillJobState | null {
    return this.jobs.get(jobId) ?? null;
  }
}
