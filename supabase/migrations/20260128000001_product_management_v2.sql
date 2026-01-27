-- Product Management V2
-- Adds support for:
-- - Price types (fixed, percentage, surface_coefficient)
-- - Product groups for quick quote insertion
-- - Price history tracking

-- =============================================
-- 1. EXTEND PRODUCTS TABLE
-- =============================================

-- Price type: how the price is calculated
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed'
  CHECK (price_type IN ('fixed', 'percentage', 'surface_coefficient'));

-- For percentage-based pricing
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_reference_product_id UUID
  REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_percentage DECIMAL(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_minimum DECIMAL(12,2);

-- For surface coefficient pricing (e.g., 650 Kč/m²)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_coefficient DECIMAL(10,2);

-- Products that are automatically added when this product is selected
ALTER TABLE products ADD COLUMN IF NOT EXISTS required_surcharge_ids UUID[];

-- Price version for tracking price changes
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_version INTEGER DEFAULT 1;

-- Tags for flexible filtering
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];

-- =============================================
-- 2. PRODUCT GROUPS (for quick quote insertion)
-- =============================================

CREATE TABLE IF NOT EXISTS product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS product_group_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  group_id UUID NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(group_id, product_id)
);

-- =============================================
-- 3. PRODUCT PRICE HISTORY
-- =============================================

CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(12,2),
  new_price DECIMAL(12,2),
  change_percentage DECIMAL(5,2),
  price_version INTEGER,
  reason TEXT,
  changed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- =============================================
-- 4. INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_products_price_type ON products(price_type);
CREATE INDEX IF NOT EXISTS idx_products_price_reference ON products(price_reference_product_id);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_product_groups_active ON product_groups(active);
CREATE INDEX IF NOT EXISTS idx_product_groups_category ON product_groups(category);

CREATE INDEX IF NOT EXISTS idx_product_group_items_group_id ON product_group_items(group_id);
CREATE INDEX IF NOT EXISTS idx_product_group_items_product_id ON product_group_items(product_id);

CREATE INDEX IF NOT EXISTS idx_product_price_history_product_id ON product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_created_at ON product_price_history(created_at DESC);

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Auto-update updated_at for product_groups
DROP TRIGGER IF EXISTS update_product_groups_updated_at ON product_groups;
CREATE TRIGGER update_product_groups_updated_at
  BEFORE UPDATE ON product_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Track price changes in history
CREATE OR REPLACE FUNCTION track_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if unit_price actually changed
  IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
    INSERT INTO product_price_history (
      product_id,
      old_price,
      new_price,
      change_percentage,
      price_version,
      reason
    ) VALUES (
      NEW.id,
      OLD.unit_price,
      NEW.unit_price,
      CASE
        WHEN OLD.unit_price > 0 THEN
          ROUND(((NEW.unit_price - OLD.unit_price) / OLD.unit_price * 100)::numeric, 2)
        ELSE NULL
      END,
      NEW.price_version,
      NULL
    );

    -- Increment price version
    NEW.price_version := COALESCE(OLD.price_version, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_product_price_change_trigger ON products;
CREATE TRIGGER track_product_price_change_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION track_product_price_change();

-- =============================================
-- 6. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

-- Product groups policies
CREATE POLICY "Allow authenticated users full access to product_groups"
  ON product_groups FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to product_groups"
  ON product_groups FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Product group items policies
CREATE POLICY "Allow authenticated users full access to product_group_items"
  ON product_group_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to product_group_items"
  ON product_group_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Product price history policies
CREATE POLICY "Allow authenticated users to read product_price_history"
  ON product_price_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to product_price_history"
  ON product_price_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================
-- 7. COMMENTS
-- =============================================

COMMENT ON COLUMN products.price_type IS 'How the price is calculated: fixed, percentage (of reference product), or surface_coefficient (Kč/m²)';
COMMENT ON COLUMN products.price_reference_product_id IS 'Reference product for percentage-based pricing';
COMMENT ON COLUMN products.price_percentage IS 'Percentage of reference product price (e.g., 10 = 10%)';
COMMENT ON COLUMN products.price_minimum IS 'Minimum price floor for percentage-based products';
COMMENT ON COLUMN products.price_coefficient IS 'Price per m² for surface coefficient pricing';
COMMENT ON COLUMN products.required_surcharge_ids IS 'Products that are automatically added when this product is selected';
COMMENT ON COLUMN products.price_version IS 'Version number, incremented on each price change';
COMMENT ON COLUMN products.tags IS 'Tags for filtering and categorization';

COMMENT ON TABLE product_groups IS 'Product groups (bundles) for quick insertion into quotes';
COMMENT ON TABLE product_group_items IS 'Items within a product group';
COMMENT ON TABLE product_price_history IS 'History of product price changes for auditing';
