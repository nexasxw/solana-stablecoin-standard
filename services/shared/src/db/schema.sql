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
