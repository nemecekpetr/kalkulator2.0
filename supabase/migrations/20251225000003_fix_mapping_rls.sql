-- Migration: Fix RLS policies for product_mapping_rules and pool_base_prices
-- Purpose: Allow authenticated users to modify mapping rules and pool prices

-- =============================================================================
-- Drop existing restrictive policies
-- =============================================================================

DROP POLICY IF EXISTS "Allow read for authenticated users" ON product_mapping_rules;
DROP POLICY IF EXISTS "Allow all for service role" ON product_mapping_rules;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON pool_base_prices;
DROP POLICY IF EXISTS "Allow all for service role" ON pool_base_prices;

-- =============================================================================
-- Create new policies for product_mapping_rules
-- =============================================================================

-- Allow all operations for authenticated users (admin panel users)
CREATE POLICY "Allow all for authenticated users" ON product_mapping_rules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Keep service role policy for backend operations
CREATE POLICY "Allow all for service role" ON product_mapping_rules
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Create new policies for pool_base_prices
-- =============================================================================

-- Allow all operations for authenticated users (admin panel users)
CREATE POLICY "Allow all for authenticated users" ON pool_base_prices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Keep service role policy for backend operations
CREATE POLICY "Allow all for service role" ON pool_base_prices
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
