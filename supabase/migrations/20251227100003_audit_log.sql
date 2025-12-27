-- Migration: Audit logging
-- Date: 2025-12-27
-- Description: Track important changes to key tables

-- =============================================================================
-- Audit Log Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Who made the change
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,

  -- What was changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),

  -- The actual changes
  old_data JSONB,
  new_data JSONB,

  -- Additional context
  ip_address TEXT,
  user_agent TEXT
);

-- Index for querying by table and record
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record
  ON audit_log(table_name, record_id);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON audit_log(user_id);

-- Index for querying by date
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log(created_at DESC);

-- RLS: Only admins can view audit logs
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit_log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (is_admin());

-- No INSERT/UPDATE/DELETE policies for users - only triggers can write

-- =============================================================================
-- Audit Function
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  user_email_var TEXT;
BEGIN
  -- Get user email if authenticated
  SELECT email INTO user_email_var
  FROM auth.users
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, user_email, table_name, record_id, action, new_data)
    VALUES (auth.uid(), user_email_var, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if something actually changed
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO audit_log (user_id, user_email, table_name, record_id, action, old_data, new_data)
      VALUES (auth.uid(), user_email_var, TG_TABLE_NAME, OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, user_email, table_name, record_id, action, old_data)
    VALUES (auth.uid(), user_email_var, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Audit Triggers for Key Tables
-- =============================================================================

-- Quotes
DROP TRIGGER IF EXISTS audit_quotes ON quotes;
CREATE TRIGGER audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Orders
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Production Orders
DROP TRIGGER IF EXISTS audit_production_orders ON production_orders;
CREATE TRIGGER audit_production_orders
  AFTER INSERT OR UPDATE OR DELETE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Products (track price changes, etc.)
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- User Profiles (track role changes)
DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Product Mapping Rules
DROP TRIGGER IF EXISTS audit_product_mapping_rules ON product_mapping_rules;
CREATE TRIGGER audit_product_mapping_rules
  AFTER INSERT OR UPDATE OR DELETE ON product_mapping_rules
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =============================================================================
-- Cleanup old audit logs (optional - run periodically)
-- =============================================================================

-- Function to delete audit logs older than X days
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to admins
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO authenticated;

