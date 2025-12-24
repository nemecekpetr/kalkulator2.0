-- Rentmil Konfigurator Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE pipedrive_status AS ENUM ('pending', 'success', 'error');
CREATE TYPE configuration_source AS ENUM ('web', 'manual', 'phone');

-- Main configurations table
CREATE TABLE configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contact information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_address TEXT,

  -- Pool configuration
  pool_shape TEXT NOT NULL CHECK (pool_shape IN ('circle', 'rectangle_rounded', 'rectangle_sharp')),
  pool_type TEXT NOT NULL CHECK (pool_type IN ('skimmer', 'overflow')),
  dimensions JSONB NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('blue', 'white', 'gray', 'combination')),
  stairs TEXT NOT NULL CHECK (stairs IN ('none', 'roman', 'corner_triangle', 'full_width', 'with_bench', 'corner_square')),
  technology TEXT NOT NULL CHECK (technology IN ('shaft', 'wall', 'other')),
  lighting TEXT NOT NULL CHECK (lighting IN ('none', 'led')),
  counterflow TEXT NOT NULL CHECK (counterflow IN ('none', 'with_counterflow')),
  water_treatment TEXT NOT NULL CHECK (water_treatment IN ('chlorine', 'salt')),
  heating TEXT NOT NULL CHECK (heating IN ('none', 'preparation', 'heat_pump')),
  roofing TEXT NOT NULL CHECK (roofing IN ('none', 'with_roofing')),

  -- Pipedrive integration
  pipedrive_status pipedrive_status NOT NULL DEFAULT 'pending',
  pipedrive_deal_id TEXT,
  pipedrive_error TEXT,
  pipedrive_synced_at TIMESTAMPTZ,

  -- Meta
  source configuration_source NOT NULL DEFAULT 'web',
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Sync log table for tracking integration attempts
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  configuration_id UUID NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  response JSONB,
  error_message TEXT
);

-- Indexes for better query performance
CREATE INDEX idx_configurations_created_at ON configurations(created_at DESC);
CREATE INDEX idx_configurations_pipedrive_status ON configurations(pipedrive_status);
CREATE INDEX idx_configurations_is_deleted ON configurations(is_deleted);
CREATE INDEX idx_configurations_contact_email ON configurations(contact_email);
CREATE INDEX idx_sync_log_configuration_id ON sync_log(configuration_id);
CREATE INDEX idx_sync_log_created_at ON sync_log(created_at DESC);

-- Full text search index
CREATE INDEX idx_configurations_search ON configurations
USING gin(to_tsvector('simple', contact_name || ' ' || contact_email || ' ' || COALESCE(contact_phone, '')));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admin)
CREATE POLICY "Authenticated users can view all configurations"
  ON configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert configurations"
  ON configurations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update configurations"
  ON configurations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete configurations"
  ON configurations FOR DELETE
  TO authenticated
  USING (true);

-- Policies for anon users (public configurator)
CREATE POLICY "Anon users can insert configurations"
  ON configurations FOR INSERT
  TO anon
  WITH CHECK (source = 'web');

-- Sync log policies
CREATE POLICY "Authenticated users can view sync logs"
  ON sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sync logs"
  ON sync_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role can do everything (for webhooks/API)
CREATE POLICY "Service role full access configurations"
  ON configurations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access sync_log"
  ON sync_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Views for statistics
CREATE OR REPLACE VIEW configuration_stats AS
SELECT
  COUNT(*) FILTER (WHERE NOT is_deleted) AS total_configurations,
  COUNT(*) FILTER (WHERE NOT is_deleted AND created_at >= CURRENT_DATE) AS today_count,
  COUNT(*) FILTER (WHERE NOT is_deleted AND created_at >= DATE_TRUNC('week', CURRENT_DATE)) AS this_week_count,
  COUNT(*) FILTER (WHERE NOT is_deleted AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS this_month_count,
  COUNT(*) FILTER (WHERE NOT is_deleted AND pipedrive_status = 'success') AS pipedrive_success,
  COUNT(*) FILTER (WHERE NOT is_deleted AND pipedrive_status = 'error') AS pipedrive_error,
  COUNT(*) FILTER (WHERE NOT is_deleted AND pipedrive_status = 'pending') AS pipedrive_pending
FROM configurations;

-- Grant access to the view
GRANT SELECT ON configuration_stats TO authenticated;
