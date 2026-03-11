import { randomUUID } from "node:crypto";

import { StableServiceError } from "../../../shared/dist/contracts/errors";

export type WebhookSubscriptionStatus = "active" | "paused" | "disabled";
export type WebhookDeliveryState =
  | "queued"
  | "delivering"
  | "retry_scheduled"
  | "succeeded"
  | "dead_lettered";

export interface WebhookSubscriptionRecord {
  id: string;
  tenant_id: string;
  endpoint_url: string;
  event_filters: string[];
  status: WebhookSubscriptionStatus;
  primary_secret: string;
  secondary_secret: string | null;
  secondary_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  tenant_id: string;
  subscription_id: string;
  event_id: string;
  event_type: string;
  event_version: string;
  request_id: string;
  entity_key: string;
  payload: Record<string, unknown>;
  state: WebhookDeliveryState;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  last_response_status: number | null;
  last_error_code: string | null;
  last_error_message: string | null;
  last_signature_kid: "primary" | "secondary" | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface WebhookDeliveryAttemptRecord {
  id: string;
  tenant_id: string;
  delivery_id: string;
  attempt_number: number;
  status: "succeeded" | "failed";
  response_status: number | null;
  error_code: string | null;
  error_message: string | null;
  signature_kid: "primary" | "secondary";
  occurred_at: string;
}

export interface WebhookDeadLetterRecord {
  id: string;
  tenant_id: string;
  delivery_id: string;
  subscription_id: string;
  event_id: string;
  event_type: string;
  entity_key: string;
  request_id: string;
  payload: Record<string, unknown>;
  final_error_code: string;
  final_error_message: string;
  failed_at: string;
  expires_at: string;
}

export interface CreateWebhookSubscriptionInput {
  tenant_id: string;
  endpoint_url: string;
  event_filters: string[];
  status?: WebhookSubscriptionStatus;
  primary_secret: string;
}

export interface UpdateWebhookSubscriptionInput {
  endpoint_url?: string;
  event_filters?: string[];
  status?: WebhookSubscriptionStatus;
}

export interface RotateWebhookSecretInput {
  next_primary_secret: string;
  grace_seconds: number;
}

export interface EnqueueDeliveryInput {
  tenant_id: string;
  subscription_id: string;
  event_id: string;
  event_type: string;
  event_version: string;
  request_id: string;
  entity_key: string;
  payload: Record<string, unknown>;
  max_attempts?: number;
}

export interface DeliveryListQuery {
  subscription_id?: string;
  state?: WebhookDeliveryState;
  entity_key?: string;
  limit?: number;
}

export interface DeadLetterListQuery {
  subscription_id?: string;
  limit?: number;
}

export interface DeliveryExecutionSelection {
  subscription: WebhookSubscriptionRecord;
  delivery: WebhookDeliveryRecord;
}

const MAX_ATTEMPTS_DEFAULT = 5;
const MAX_ATTEMPTS_UPPER_BOUND = 10;
const RETRY_BASE_DELAY_SECONDS = 5;
const RETRY_MAX_DELAY_SECONDS = 300;

export const DELIVERY_RETENTION_DAYS = 90;
export const DEAD_LETTER_RETENTION_DAYS = 180;

const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ensurePositiveInt = (value: number, field: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new StableServiceError("INVALID_ARGUMENT", `Invalid ${field}`, { field, value });
  }
  return value;
};

const sortByCreatedAt = <T extends { created_at: string }>(items: T[]): T[] => {
  return [...items].sort((left, right) => {
    const timeDelta = Date.parse(left.created_at) - Date.parse(right.created_at);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return 0;
  });
};

const calculateRetryDelaySeconds = (attemptNumber: number): number => {
  const delay = RETRY_BASE_DELAY_SECONDS * 2 ** Math.max(0, attemptNumber - 1);
  return Math.min(delay, RETRY_MAX_DELAY_SECONDS);
};

const addSeconds = (isoTimestamp: string, seconds: number): string => {
  return new Date(Date.parse(isoTimestamp) + seconds * MS_PER_SECOND).toISOString();
};

const addDays = (isoTimestamp: string, days: number): string => {
  return new Date(Date.parse(isoTimestamp) + days * MS_PER_DAY).toISOString();
};

const assertUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    return parsed.toString();
  } catch {
    throw new StableServiceError("INVALID_ARGUMENT", "Invalid webhook endpoint URL", {
      endpoint_url: value,
    });
  }
};

const assertStateTransition = (from: WebhookDeliveryState, to: WebhookDeliveryState): void => {
  const allowed: Record<WebhookDeliveryState, WebhookDeliveryState[]> = {
    queued: ["delivering"],
    delivering: ["succeeded", "retry_scheduled", "dead_lettered"],
    retry_scheduled: ["delivering"],
    succeeded: [],
    dead_lettered: [],
  };

  if (!allowed[from].includes(to)) {
    throw new StableServiceError("INVALID_STATE", "Invalid webhook delivery state transition", {
      from,
      to,
    });
  }
};

export class WebhookRepository {
  private readonly subscriptions = new Map<string, WebhookSubscriptionRecord>();

  private readonly tenantSubscriptions = new Map<string, string[]>();

  private readonly deliveries = new Map<string, WebhookDeliveryRecord>();

  private readonly tenantDeliveries = new Map<string, string[]>();

  private readonly deliveryAttempts = new Map<string, WebhookDeliveryAttemptRecord[]>();

  private readonly deadLetters = new Map<string, WebhookDeadLetterRecord>();

  private readonly tenantDeadLetters = new Map<string, string[]>();

  createSubscription(
    input: CreateWebhookSubscriptionInput,
    now: () => Date = () => new Date()
  ): WebhookSubscriptionRecord {
    const timestamp = now().toISOString();

    const record: WebhookSubscriptionRecord = {
      id: randomUUID(),
      tenant_id: input.tenant_id,
      endpoint_url: assertUrl(input.endpoint_url),
      event_filters: [...input.event_filters],
      status: input.status ?? "active",
      primary_secret: input.primary_secret,
      secondary_secret: null,
      secondary_expires_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    this.subscriptions.set(record.id, record);

    const tenantIndex = this.tenantSubscriptions.get(record.tenant_id) ?? [];
    tenantIndex.unshift(record.id);
    this.tenantSubscriptions.set(record.tenant_id, tenantIndex);

    return clone(record);
  }

  listSubscriptions(tenantId: string, status?: WebhookSubscriptionStatus): WebhookSubscriptionRecord[] {
    const ids = this.tenantSubscriptions.get(tenantId) ?? [];
    return ids
      .map((id) => this.subscriptions.get(id))
      .filter((entry): entry is WebhookSubscriptionRecord => Boolean(entry))
      .filter((entry) => (status ? entry.status === status : true))
      .map((entry) => clone(entry));
  }

  getSubscription(tenantId: string, subscriptionId: string): WebhookSubscriptionRecord {
    const found = this.subscriptions.get(subscriptionId);
    if (!found || found.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook subscription not found", {
        tenant_id: tenantId,
        subscription_id: subscriptionId,
      });
    }

    return clone(found);
  }

  updateSubscription(
    tenantId: string,
    subscriptionId: string,
    update: UpdateWebhookSubscriptionInput,
    now: () => Date = () => new Date()
  ): WebhookSubscriptionRecord {
    const live = this.subscriptions.get(subscriptionId);
    if (!live || live.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook subscription not found", {
        tenant_id: tenantId,
        subscription_id: subscriptionId,
      });
    }

    if (update.endpoint_url !== undefined) {
      live.endpoint_url = assertUrl(update.endpoint_url);
    }
    if (update.event_filters !== undefined) {
      live.event_filters = [...update.event_filters];
    }
    if (update.status !== undefined) {
      live.status = update.status;
    }

    live.updated_at = now().toISOString();

    return clone(live);
  }

  rotateSubscriptionSecret(
    tenantId: string,
    subscriptionId: string,
    input: RotateWebhookSecretInput,
    now: () => Date = () => new Date()
  ): WebhookSubscriptionRecord {
    ensurePositiveInt(input.grace_seconds, "grace_seconds");

    const live = this.subscriptions.get(subscriptionId);
    if (!live || live.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook subscription not found", {
        tenant_id: tenantId,
        subscription_id: subscriptionId,
      });
    }

    const rotatedAt = now().toISOString();
    live.secondary_secret = live.primary_secret;
    live.secondary_expires_at = addSeconds(rotatedAt, input.grace_seconds);
    live.primary_secret = input.next_primary_secret;
    live.updated_at = rotatedAt;

    return clone(live);
  }

  enqueueDelivery(input: EnqueueDeliveryInput, now: () => Date = () => new Date()): WebhookDeliveryRecord {
    this.getSubscription(input.tenant_id, input.subscription_id);

    const attempts = input.max_attempts ?? MAX_ATTEMPTS_DEFAULT;
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > MAX_ATTEMPTS_UPPER_BOUND) {
      throw new StableServiceError("INVALID_ARGUMENT", "Invalid max_attempts", {
        max_attempts: input.max_attempts,
      });
    }

    const timestamp = now().toISOString();
    const record: WebhookDeliveryRecord = {
      id: randomUUID(),
      tenant_id: input.tenant_id,
      subscription_id: input.subscription_id,
      event_id: input.event_id,
      event_type: input.event_type,
      event_version: input.event_version,
      request_id: input.request_id,
      entity_key: input.entity_key,
      payload: clone(input.payload),
      state: "queued",
      attempt_count: 0,
      max_attempts: attempts,
      next_attempt_at: timestamp,
      last_attempt_at: null,
      last_response_status: null,
      last_error_code: null,
      last_error_message: null,
      last_signature_kid: null,
      created_at: timestamp,
      updated_at: timestamp,
      completed_at: null,
    };

    this.deliveries.set(record.id, record);

    const tenantIndex = this.tenantDeliveries.get(record.tenant_id) ?? [];
    tenantIndex.push(record.id);
    this.tenantDeliveries.set(record.tenant_id, tenantIndex);

    return clone(record);
  }

  getDelivery(tenantId: string, deliveryId: string): WebhookDeliveryRecord {
    const found = this.deliveries.get(deliveryId);
    if (!found || found.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook delivery not found", {
        tenant_id: tenantId,
        delivery_id: deliveryId,
      });
    }

    return clone(found);
  }

  listDeliveries(tenantId: string, query: DeliveryListQuery = {}): WebhookDeliveryRecord[] {
    const ids = this.tenantDeliveries.get(tenantId) ?? [];
    const limit = query.limit ?? 50;

    const rows = ids
      .map((id) => this.deliveries.get(id))
      .filter((entry): entry is WebhookDeliveryRecord => Boolean(entry))
      .filter((entry) => (query.subscription_id ? entry.subscription_id === query.subscription_id : true))
      .filter((entry) => (query.state ? entry.state === query.state : true))
      .filter((entry) => (query.entity_key ? entry.entity_key === query.entity_key : true));

    return sortByCreatedAt(rows).slice(0, limit).map((row) => clone(row));
  }

  listDeliveryAttempts(tenantId: string, deliveryId: string): WebhookDeliveryAttemptRecord[] {
    this.getDelivery(tenantId, deliveryId);

    return (this.deliveryAttempts.get(deliveryId) ?? []).map((attempt) => clone(attempt));
  }

  listDeadLetters(tenantId: string, query: DeadLetterListQuery = {}): WebhookDeadLetterRecord[] {
    const ids = this.tenantDeadLetters.get(tenantId) ?? [];
    const limit = query.limit ?? 50;

    const rows = ids
      .map((id) => this.deadLetters.get(id))
      .filter((entry): entry is WebhookDeadLetterRecord => Boolean(entry))
      .filter((entry) => (query.subscription_id ? entry.subscription_id === query.subscription_id : true));

    return sortByCreatedAt(rows.map((entry) => ({ ...entry, created_at: entry.failed_at })))
      .map((entry) => {
        const { created_at: _ignored, ...rest } = entry;
        return rest;
      })
      .slice(0, limit)
      .map((entry) => clone(entry));
  }

  takeNextDelivery(
    tenantId: string,
    now: () => Date = () => new Date()
  ): DeliveryExecutionSelection | null {
    const dueAt = now().toISOString();

    const candidateRows = this.listDeliveries(tenantId, { limit: 10_000 })
      .filter((delivery) => delivery.state === "queued" || delivery.state === "retry_scheduled")
      .filter((delivery) => delivery.next_attempt_at <= dueAt);

    for (const candidate of candidateRows) {
      const subscription = this.getSubscription(tenantId, candidate.subscription_id);
      if (subscription.status !== "active") {
        continue;
      }

      const blocking = this.listDeliveries(tenantId, {
        entity_key: candidate.entity_key,
        limit: 10_000,
      }).find((delivery) => {
        if (delivery.id === candidate.id) {
          return false;
        }

        const isEarlier =
          Date.parse(delivery.created_at) < Date.parse(candidate.created_at) ||
          (delivery.created_at === candidate.created_at && delivery.id < candidate.id);

        const inFlight =
          delivery.state === "queued" ||
          delivery.state === "delivering" ||
          delivery.state === "retry_scheduled";

        return isEarlier && inFlight;
      });

      if (blocking) {
        continue;
      }

      return {
        subscription,
        delivery: candidate,
      };
    }

    return null;
  }

  markDeliveryRunning(
    tenantId: string,
    deliveryId: string,
    signatureKid: "primary" | "secondary",
    now: () => Date = () => new Date()
  ): WebhookDeliveryRecord {
    const live = this.deliveries.get(deliveryId);
    if (!live || live.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook delivery not found", {
        tenant_id: tenantId,
        delivery_id: deliveryId,
      });
    }

    assertStateTransition(live.state, "delivering");

    const timestamp = now().toISOString();
    live.state = "delivering";
    live.attempt_count += 1;
    live.last_attempt_at = timestamp;
    live.last_signature_kid = signatureKid;
    live.updated_at = timestamp;

    return clone(live);
  }

  markDeliverySucceeded(
    tenantId: string,
    deliveryId: string,
    responseStatus: number,
    now: () => Date = () => new Date()
  ): WebhookDeliveryRecord {
    const live = this.deliveries.get(deliveryId);
    if (!live || live.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook delivery not found", {
        tenant_id: tenantId,
        delivery_id: deliveryId,
      });
    }

    assertStateTransition(live.state, "succeeded");

    const timestamp = now().toISOString();
    live.state = "succeeded";
    live.last_response_status = responseStatus;
    live.last_error_code = null;
    live.last_error_message = null;
    live.updated_at = timestamp;
    live.completed_at = timestamp;

    this.appendAttempt(tenantId, {
      delivery_id: deliveryId,
      attempt_number: live.attempt_count,
      status: "succeeded",
      response_status: responseStatus,
      error_code: null,
      error_message: null,
      signature_kid: live.last_signature_kid ?? "primary",
      occurred_at: timestamp,
    });

    return clone(live);
  }

  markDeliveryFailed(
    tenantId: string,
    deliveryId: string,
    failure: {
      response_status: number | null;
      error_code: string;
      error_message: string;
    },
    now: () => Date = () => new Date()
  ): WebhookDeliveryRecord {
    const live = this.deliveries.get(deliveryId);
    if (!live || live.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook delivery not found", {
        tenant_id: tenantId,
        delivery_id: deliveryId,
      });
    }

    if (live.state !== "delivering") {
      throw new StableServiceError("INVALID_STATE", "Delivery must be delivering before failure handling", {
        state: live.state,
        delivery_id: live.id,
      });
    }

    const timestamp = now().toISOString();

    this.appendAttempt(tenantId, {
      delivery_id: deliveryId,
      attempt_number: live.attempt_count,
      status: "failed",
      response_status: failure.response_status,
      error_code: failure.error_code,
      error_message: failure.error_message,
      signature_kid: live.last_signature_kid ?? "primary",
      occurred_at: timestamp,
    });

    live.last_response_status = failure.response_status;
    live.last_error_code = failure.error_code;
    live.last_error_message = failure.error_message;
    live.updated_at = timestamp;

    if (live.attempt_count >= live.max_attempts) {
      assertStateTransition(live.state, "dead_lettered");

      live.state = "dead_lettered";
      live.completed_at = timestamp;

      const deadLetter: WebhookDeadLetterRecord = {
        id: randomUUID(),
        tenant_id: live.tenant_id,
        delivery_id: live.id,
        subscription_id: live.subscription_id,
        event_id: live.event_id,
        event_type: live.event_type,
        entity_key: live.entity_key,
        request_id: live.request_id,
        payload: clone(live.payload),
        final_error_code: failure.error_code,
        final_error_message: failure.error_message,
        failed_at: timestamp,
        expires_at: addDays(timestamp, DEAD_LETTER_RETENTION_DAYS),
      };

      this.deadLetters.set(deadLetter.id, deadLetter);
      const tenantDeadLetterIds = this.tenantDeadLetters.get(live.tenant_id) ?? [];
      tenantDeadLetterIds.push(deadLetter.id);
      this.tenantDeadLetters.set(live.tenant_id, tenantDeadLetterIds);

      return clone(live);
    }

    assertStateTransition(live.state, "retry_scheduled");

    const retryDelay = calculateRetryDelaySeconds(live.attempt_count);
    live.state = "retry_scheduled";
    live.next_attempt_at = addSeconds(timestamp, retryDelay);

    return clone(live);
  }

  purgeExpiredRecords(now: () => Date = () => new Date()): {
    purged_deliveries: number;
    purged_dead_letters: number;
  } {
    const nowEpoch = now().getTime();
    const deliveryCutoffEpoch = nowEpoch - DELIVERY_RETENTION_DAYS * MS_PER_DAY;
    const deadLetterCutoffEpoch = nowEpoch - DEAD_LETTER_RETENTION_DAYS * MS_PER_DAY;

    let purgedDeliveries = 0;
    for (const [deliveryId, delivery] of this.deliveries.entries()) {
      const terminal = delivery.state === "succeeded" || delivery.state === "dead_lettered";
      if (!terminal || !delivery.completed_at) {
        continue;
      }

      if (Date.parse(delivery.completed_at) >= deliveryCutoffEpoch) {
        continue;
      }

      this.deliveries.delete(deliveryId);
      this.deliveryAttempts.delete(deliveryId);
      const tenantIndex = this.tenantDeliveries.get(delivery.tenant_id) ?? [];
      this.tenantDeliveries.set(
        delivery.tenant_id,
        tenantIndex.filter((id) => id !== deliveryId)
      );
      purgedDeliveries += 1;
    }

    let purgedDeadLetters = 0;
    for (const [deadLetterId, deadLetter] of this.deadLetters.entries()) {
      if (Date.parse(deadLetter.failed_at) >= deadLetterCutoffEpoch) {
        continue;
      }

      this.deadLetters.delete(deadLetterId);
      const tenantIndex = this.tenantDeadLetters.get(deadLetter.tenant_id) ?? [];
      this.tenantDeadLetters.set(
        deadLetter.tenant_id,
        tenantIndex.filter((id) => id !== deadLetterId)
      );
      purgedDeadLetters += 1;
    }

    return {
      purged_deliveries: purgedDeliveries,
      purged_dead_letters: purgedDeadLetters,
    };
  }

  private appendAttempt(
    tenantId: string,
    input: Omit<WebhookDeliveryAttemptRecord, "id" | "tenant_id">
  ): WebhookDeliveryAttemptRecord {
    const delivery = this.deliveries.get(input.delivery_id);
    if (!delivery || delivery.tenant_id !== tenantId) {
      throw new StableServiceError("NOT_FOUND", "Webhook delivery not found for attempt", {
        tenant_id: tenantId,
        delivery_id: input.delivery_id,
      });
    }

    const attempt: WebhookDeliveryAttemptRecord = {
      id: randomUUID(),
      tenant_id: tenantId,
      ...input,
    };

    const attempts = this.deliveryAttempts.get(input.delivery_id) ?? [];
    attempts.push(attempt);
    this.deliveryAttempts.set(input.delivery_id, attempts);

    return clone(attempt);
  }
}
