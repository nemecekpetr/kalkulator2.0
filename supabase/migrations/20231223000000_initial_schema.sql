-- Rentmil Konfigurator - Initial Schema
-- This migration creates all necessary tables for the pool configurator

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurations table (main table for pool configurations)
CREATE TABLE configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

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

  -- Accessories
  lighting TEXT NOT NULL CHECK (lighting IN ('none', 'led')),
  counterflow TEXT NOT NULL CHECK (counterflow IN ('none', 'with_counterflow')),
  water_treatment TEXT NOT NULL CHECK (water_treatment IN ('chlorine', 'salt')),

  -- Extras
  heating TEXT NOT NULL CHECK (heating IN ('none', 'preparation', 'heat_pump')),
  roofing TEXT NOT NULL CHECK (roofing IN ('none', 'with_roofing')),

  -- Additional fields
  message TEXT,
  notes TEXT,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'manual', 'phone')),

  -- Pipedrive integration
  pipedrive_status TEXT DEFAULT 'pending' CHECK (pipedrive_status IN ('pending', 'success', 'error')),
  pipedrive_deal_id TEXT,
  pipedrive_error TEXT,
  pipedrive_synced_at TIMESTAMPTZ
);

-- Sync log table (for tracking Pipedrive sync attempts)
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  configuration_id UUID REFERENCES configurations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  response JSONB,
  error_message TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_configurations_created_at ON configurations(created_at DESC);
CREATE INDEX idx_configurations_contact_email ON configurations(contact_email);
CREATE INDEX idx_configurations_pipedrive_status ON configurations(pipedrive_status);
CREATE INDEX idx_sync_log_configuration_id ON sync_log(configuration_id);
CREATE INDEX idx_sync_log_created_at ON sync_log(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to configurations table
CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admin)
CREATE POLICY "Allow authenticated users full access to configurations"
  ON configurations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to sync_log"
  ON sync_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for anonymous users (public form submission)
CREATE POLICY "Allow anonymous users to insert configurations"
  ON configurations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role bypass (for webhooks and server actions)
CREATE POLICY "Allow service role full access to configurations"
  ON configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to sync_log"
  ON sync_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
