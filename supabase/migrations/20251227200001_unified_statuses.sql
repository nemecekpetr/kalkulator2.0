-- Migration: Unified status system for all entities
-- Date: 2025-12-27
-- Description: Simplify and unify statuses across configurations, quotes, orders, and production

-- =============================================================================
-- 1. CONFIGURATIONS: Add status column
-- =============================================================================

-- Add status column to configurations
ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';

-- Create check constraint for configuration status
ALTER TABLE configurations
ADD CONSTRAINT configurations_status_check
CHECK (status IN ('new', 'processed'));

-- Migrate existing data: configurations with quote_id are 'processed', others are 'new'
UPDATE configurations
SET status = CASE
  WHEN quote_id IS NOT NULL THEN 'processed'
  ELSE 'new'
END;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_configurations_status ON configurations(status);

-- =============================================================================
-- 2. QUOTES: Update status enum (remove expired, converted)
-- =============================================================================

-- First, update any existing 'expired' or 'converted' to appropriate states
UPDATE quotes SET status = 'rejected' WHERE status = 'expired';
UPDATE quotes SET status = 'accepted' WHERE status = 'converted';

-- Drop the old enum and create new one
-- Note: PostgreSQL doesn't allow removing values from enum, so we recreate
ALTER TABLE quotes ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS quote_status;

-- Add check constraint for the new status values
ALTER TABLE quotes
DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes
ADD CONSTRAINT quotes_status_check
CHECK (status IN ('draft', 'sent', 'accepted', 'rejected'));

-- =============================================================================
-- 3. ORDERS: Update status enum (simplify to 3 states)
-- =============================================================================

-- Migrate existing statuses to new simplified model
UPDATE orders SET status = 'created' WHERE status IN ('created');
UPDATE orders SET status = 'sent' WHERE status IN ('confirmed');
UPDATE orders SET status = 'in_production' WHERE status IN ('in_production', 'ready', 'delivered', 'completed');
-- Note: 'cancelled' orders will be deleted or kept as is (we'll handle separately)

-- Convert to TEXT first
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;
DROP TYPE IF EXISTS order_status;

-- Add check constraint for the new status values
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (status IN ('created', 'sent', 'in_production'));

-- =============================================================================
-- 4. PRODUCTION: Keep as is (pending, in_progress, completed, cancelled)
-- =============================================================================
-- No changes needed - current statuses match the plan

-- =============================================================================
-- 5. Create trigger to auto-update configuration status when quote is created
-- =============================================================================

CREATE OR REPLACE FUNCTION update_configuration_status_on_quote()
RETURNS TRIGGER AS $$
BEGIN
  -- When a quote is created with a configuration_id, mark configuration as processed
  IF NEW.configuration_id IS NOT NULL THEN
    UPDATE configurations
    SET status = 'processed'
    WHERE id = NEW.configuration_id AND status = 'new';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_configuration_status ON quotes;
CREATE TRIGGER trigger_update_configuration_status
  AFTER INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_configuration_status_on_quote();

-- =============================================================================
-- 6. Create function to auto-create production order when order status changes
-- =============================================================================

CREATE OR REPLACE FUNCTION create_production_on_order_status()
RETURNS TRIGGER AS $$
DECLARE
  new_production_number TEXT;
  pool_cfg JSONB;
BEGIN
  -- When order status changes to 'in_production', create production order if not exists
  IF NEW.status = 'in_production' AND OLD.status != 'in_production' THEN
    -- Check if production order already exists
    IF NOT EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      -- Generate production number
      new_production_number := generate_production_number();

      -- Get pool config
      pool_cfg := NEW.pool_config;

      -- Create production order
      INSERT INTO production_orders (
        production_number,
        order_id,
        status,
        pool_shape,
        pool_type,
        pool_dimensions,
        pool_color,
        pool_depth
      ) VALUES (
        new_production_number,
        NEW.id,
        'pending',
        pool_cfg->>'pool_shape',
        pool_cfg->>'pool_type',
        CONCAT(
          COALESCE(pool_cfg->'dimensions'->>'width', ''),
          CASE WHEN pool_cfg->'dimensions'->>'width' IS NOT NULL THEN 'x' ELSE '' END,
          COALESCE(pool_cfg->'dimensions'->>'length', ''),
          CASE WHEN pool_cfg->'dimensions'->>'diameter' IS NOT NULL THEN 'Ø' || (pool_cfg->'dimensions'->>'diameter') ELSE '' END
        ),
        pool_cfg->>'color',
        pool_cfg->'dimensions'->>'depth'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_production_on_order_status ON orders;
CREATE TRIGGER trigger_create_production_on_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_production_on_order_status();
