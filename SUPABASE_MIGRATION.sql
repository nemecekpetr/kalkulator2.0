-- ============================================================================
-- RENTMIL - MIGRACE PRO SUPABASE
-- ============================================================================
-- Spusť tento SQL v Supabase Dashboard → SQL Editor
-- Datum: 2025-12-27
-- ============================================================================

-- ============================================================================
-- ČÁST 1: VÝROBNÍ ZADÁNÍ (production_orders)
-- ============================================================================
-- Toto je hlavní migrace, která chybí pro funkci "Vytvořit výrobák"

-- Production order status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_status') THEN
    CREATE TYPE production_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
  END IF;
END$$;

-- Production orders table
CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_number TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status production_status NOT NULL DEFAULT 'pending',

  -- Assignment
  assigned_to TEXT,

  -- Dates
  production_start_date DATE,
  production_end_date DATE,
  assembly_date DATE,

  -- Pool specifications (copied from order for quick reference)
  pool_shape TEXT,
  pool_type TEXT,
  pool_dimensions TEXT,
  pool_color TEXT,
  pool_depth TEXT,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Production order items (materiálový kusovník)
CREATE TABLE IF NOT EXISTS production_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,

  -- Material info
  material_code TEXT,
  material_name TEXT NOT NULL,
  description TEXT,

  -- Quantity
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ks',

  -- Tracking
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES user_profiles(id),

  -- Order for display
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Category for grouping
  category TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_orders_order_id ON production_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_production_number ON production_orders(production_number);
CREATE INDEX IF NOT EXISTS idx_production_order_items_production_order_id ON production_order_items(production_order_id);

-- Updated at trigger
DROP TRIGGER IF EXISTS set_production_orders_updated_at ON production_orders;
CREATE TRIGGER set_production_orders_updated_at
  BEFORE UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_items ENABLE ROW LEVEL SECURITY;

-- Production orders policies
DROP POLICY IF EXISTS "Users can view production orders" ON production_orders;
CREATE POLICY "Users can view production orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert production orders" ON production_orders;
CREATE POLICY "Users can insert production orders"
  ON production_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update production orders" ON production_orders;
CREATE POLICY "Users can update production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can delete production orders" ON production_orders;
CREATE POLICY "Admins can delete production orders"
  ON production_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Production order items policies
DROP POLICY IF EXISTS "Users can view production order items" ON production_order_items;
CREATE POLICY "Users can view production order items"
  ON production_order_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert production order items" ON production_order_items;
CREATE POLICY "Users can insert production order items"
  ON production_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update production order items" ON production_order_items;
CREATE POLICY "Users can update production order items"
  ON production_order_items FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can delete production order items" ON production_order_items;
CREATE POLICY "Admins can delete production order items"
  ON production_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Function to generate production number
CREATE OR REPLACE FUNCTION generate_production_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_production_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT COALESCE(MAX(
    CASE
      WHEN production_number ~ ('^VYR-' || current_year || '-[0-9]+$')
      THEN SUBSTRING(production_number FROM '[0-9]+$')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM production_orders;

  new_production_number := 'VYR-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN new_production_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HOTOVO!
-- ============================================================================
-- Po spuštění tohoto SQL by mělo fungovat:
-- 1. Vytvoření výrobního zadání z objednávky
-- 2. Seznam výrobních zadání v /admin/vyroba
-- 3. Detail výrobního zadání s checklistem
-- 4. Generování PDF výrobního zadání
-- ============================================================================
