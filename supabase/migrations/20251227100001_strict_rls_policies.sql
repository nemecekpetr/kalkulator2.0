-- Migration: Stricter RLS policies
-- Date: 2025-12-27
-- Description: Restrict write operations to admin users only

-- =============================================================================
-- Helper function to check if user is admin
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
    AND user_profiles.active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Orders - Only admins can insert/update/delete
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;

CREATE POLICY "Admins can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Order Items - Only admins can insert/update/delete
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can create order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can update order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can delete order_items" ON order_items;

CREATE POLICY "Admins can create order_items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update order_items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete order_items"
  ON order_items FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Quotes - Only admins can insert/update/delete
-- =============================================================================

-- First drop old policies if they exist
DROP POLICY IF EXISTS "Users can view quotes" ON quotes;
DROP POLICY IF EXISTS "Users can insert quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update quotes" ON quotes;
DROP POLICY IF EXISTS "Users can delete quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can insert quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can update quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can delete quotes" ON quotes;

-- Ensure RLS is enabled
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Quote Items - Only admins can insert/update/delete
-- =============================================================================

DROP POLICY IF EXISTS "Users can view quote_items" ON quote_items;
DROP POLICY IF EXISTS "Users can insert quote_items" ON quote_items;
DROP POLICY IF EXISTS "Users can update quote_items" ON quote_items;
DROP POLICY IF EXISTS "Users can delete quote_items" ON quote_items;
DROP POLICY IF EXISTS "Authenticated users can view quote_items" ON quote_items;
DROP POLICY IF EXISTS "Authenticated users can insert quote_items" ON quote_items;
DROP POLICY IF EXISTS "Authenticated users can update quote_items" ON quote_items;
DROP POLICY IF EXISTS "Authenticated users can delete quote_items" ON quote_items;

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quote_items"
  ON quote_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create quote_items"
  ON quote_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update quote_items"
  ON quote_items FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete quote_items"
  ON quote_items FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Quote Variants - Only admins can insert/update/delete
-- =============================================================================

DROP POLICY IF EXISTS "Users can view quote_variants" ON quote_variants;
DROP POLICY IF EXISTS "Users can insert quote_variants" ON quote_variants;
DROP POLICY IF EXISTS "Users can update quote_variants" ON quote_variants;
DROP POLICY IF EXISTS "Users can delete quote_variants" ON quote_variants;

ALTER TABLE quote_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quote_variants"
  ON quote_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create quote_variants"
  ON quote_variants FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update quote_variants"
  ON quote_variants FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete quote_variants"
  ON quote_variants FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Products - Only admins can insert/update/delete
-- =============================================================================

DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- User Profiles - Only admins can update other users
-- =============================================================================

DROP POLICY IF EXISTS "Users can view user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can insert new profiles
CREATE POLICY "Admins can create user_profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only admins can delete profiles
CREATE POLICY "Admins can delete user_profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Configurations - Public insert (for form submissions), admin for updates/deletes
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can insert configurations" ON configurations;
DROP POLICY IF EXISTS "Authenticated users can view configurations" ON configurations;
DROP POLICY IF EXISTS "Admins can update configurations" ON configurations;
DROP POLICY IF EXISTS "Admins can delete configurations" ON configurations;

ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Public can create configurations (form submissions)
CREATE POLICY "Anyone can insert configurations"
  ON configurations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can view all configurations
CREATE POLICY "Authenticated users can view configurations"
  ON configurations FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update configurations
CREATE POLICY "Admins can update configurations"
  ON configurations FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Only admins can delete configurations
CREATE POLICY "Admins can delete configurations"
  ON configurations FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Production Orders - Update policies (already partially set)
-- =============================================================================

DROP POLICY IF EXISTS "Users can insert production orders" ON production_orders;
DROP POLICY IF EXISTS "Users can update production orders" ON production_orders;

CREATE POLICY "Admins can insert production orders"
  ON production_orders FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- Production Order Items - Update policies
-- =============================================================================

DROP POLICY IF EXISTS "Users can insert production order items" ON production_order_items;
DROP POLICY IF EXISTS "Users can update production order items" ON production_order_items;

CREATE POLICY "Admins can insert production order items"
  ON production_order_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update production order items"
  ON production_order_items FOR UPDATE
  TO authenticated
  USING (is_admin());
