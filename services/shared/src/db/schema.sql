-- Shared persistence baseline for Phase 7 service contracts.
-- Tables here are intentionally minimal and cross-service only.

CREATE TABLE IF NOT EXISTS service_jobs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  request_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  result JSONB,
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CHECK ((state IN ('succeeded', 'failed', 'canceled') AND completed_at IS NOT NULL) OR (state IN ('queued', 'running') AND completed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_service_jobs_tenant_created_at
  ON service_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_jobs_tenant_state_created_at
  ON service_jobs (tenant_id, state, created_at DESC);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  first_response JSONB NOT NULL,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, idempotency_key, request_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_tenant_created_at
  ON idempotency_keys (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS issuance_jobs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('mint', 'burn')),
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  request_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  result JSONB,
  error JSONB,
  requester_id TEXT NOT NULL,
  approver_id TEXT,
  executor_service_id TEXT NOT NULL,
  intent_signature JSONB NOT NULL,
  transaction_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CHECK ((state IN ('succeeded', 'failed', 'canceled') AND completed_at IS NOT NULL) OR (state IN ('queued', 'running') AND completed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_issuance_jobs_tenant_created_at
  ON issuance_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issuance_jobs_tenant_state_created_at
  ON issuance_jobs (tenant_id, state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issuance_jobs_tenant_type_created_at
  ON issuance_jobs (tenant_id, job_type, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_issuance_jobs_tenant_idempotency_key
  ON issuance_jobs (tenant_id, idempotency_key);

CREATE TABLE IF NOT EXISTS issuance_internal_events (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES issuance_jobs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_version TEXT NOT NULL,
  request_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_issuance_internal_events_tenant_job_created_at
  ON issuance_internal_events (tenant_id, job_id, created_at DESC);

-- Indexer persistence tables (SRV-02)
CREATE TABLE IF NOT EXISTS indexer_checkpoints (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  slot BIGINT NOT NULL,
  tx_signature TEXT,
  event_id TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, stream_id)
);

CREATE TABLE IF NOT EXISTS indexer_events (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_version TEXT NOT NULL,
  request_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  slot BIGINT NOT NULL,
  tx_signature TEXT NOT NULL,
  log_index INT NOT NULL,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, dedupe_key),
  UNIQUE (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_indexer_events_tenant_slot
  ON indexer_events (tenant_id, slot DESC, log_index DESC);

CREATE INDEX IF NOT EXISTS idx_indexer_events_tenant_occurred_at
  ON indexer_events (tenant_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS stablecoin_projections (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  stablecoin_id TEXT NOT NULL,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, stablecoin_id)
);

CREATE TABLE IF NOT EXISTS holder_balances (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  stablecoin_id TEXT NOT NULL,
  holder TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, stablecoin_id, holder)
);

CREATE INDEX IF NOT EXISTS idx_holder_balances_tenant_stablecoin
  ON holder_balances (tenant_id, stablecoin_id, balance DESC);

-- Compliance persistence tables (SRV-03)
CREATE TABLE IF NOT EXISTS compliance_screenings (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  stablecoin_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('blacklist_add', 'blacklist_remove', 'seize')),
  subject TEXT NOT NULL,
  amount TEXT,
  onchain_blacklisted BOOLEAN NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny', 'review_required')),
  reason_code TEXT NOT NULL,
  reason_details JSONB,
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((decision = 'review_required' AND review_status IS NOT NULL) OR (decision <> 'review_required' AND review_status IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_tenant_created_at
  ON compliance_screenings (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_lookup
  ON compliance_screenings (tenant_id, stablecoin_id, operation, subject, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_mutation_jobs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('blacklist_add', 'blacklist_remove', 'seize')),
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  payload JSONB NOT NULL,
  screening_id UUID NOT NULL REFERENCES compliance_screenings(id) ON DELETE RESTRICT,
  screening_reason_code TEXT NOT NULL,
  result JSONB,
  error JSONB,
  requester_id TEXT NOT NULL,
  approver_id TEXT,
  executor_service_id TEXT NOT NULL,
  intent_signature JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (tenant_id, idempotency_key),
  CHECK ((state IN ('succeeded', 'failed', 'canceled') AND completed_at IS NOT NULL) OR (state IN ('queued', 'running') AND completed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_compliance_mutation_jobs_tenant_created_at
  ON compliance_mutation_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_mutation_jobs_tenant_state_created_at
  ON compliance_mutation_jobs (tenant_id, state, created_at DESC);
