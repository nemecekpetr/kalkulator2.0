-- Migration: Product Mapping Rules and Pool Base Prices
-- Purpose: Enable automatic quote generation from configurations

-- =============================================================================
-- Table: product_mapping_rules
-- Maps configurator choices to products
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_mapping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,

  -- Which product to add
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  -- Matching conditions
  config_field TEXT NOT NULL,  -- 'lighting', 'heating', 'stairs', 'roofing', 'technology', 'counterflow', 'waterTreatment'
  config_value TEXT NOT NULL,  -- 'led', 'heat_pump', 'roman', 'with_roofing', etc.

  -- Additional conditions (optional)
  pool_shape TEXT[],  -- NULL = all shapes, or ['circle'], ['rectangle_rounded', 'rectangle_sharp']
  pool_type TEXT[],   -- NULL = all types, or ['skimmer'], ['overflow']

  -- Quantity (usually 1)
  quantity INTEGER DEFAULT 1 NOT NULL,

  -- Ordering and status
  sort_order INTEGER DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL
);

-- =============================================================================
-- Table: pool_base_prices
-- Maps pool shape/type/dimensions to products
-- =============================================================================

CREATE TABLE IF NOT EXISTS pool_base_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Which product this maps to
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  -- Pool configuration
  pool_shape TEXT NOT NULL CHECK (pool_shape IN ('circle', 'rectangle_rounded', 'rectangle_sharp')),
  pool_type TEXT NOT NULL CHECK (pool_type IN ('skimmer', 'overflow')),

  -- Dimensions for rectangles
  width DECIMAL(5,2),
  length DECIMAL(5,2),

  -- Dimensions for circles
  diameter DECIMAL(5,2),

  -- Depth (common for all)
  depth DECIMAL(5,2) NOT NULL,

  -- Status
  active BOOLEAN DEFAULT true NOT NULL,

  -- Ensure unique combinations
  UNIQUE(pool_shape, pool_type, width, length, diameter, depth)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_product_mapping_rules_active ON product_mapping_rules(active) WHERE active = true;
CREATE INDEX idx_product_mapping_rules_config ON product_mapping_rules(config_field, config_value);
CREATE INDEX idx_pool_base_prices_active ON pool_base_prices(active) WHERE active = true;
CREATE INDEX idx_pool_base_prices_lookup ON pool_base_prices(pool_shape, pool_type, depth);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE TRIGGER update_product_mapping_rules_updated_at
  BEFORE UPDATE ON product_mapping_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE product_mapping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_base_prices ENABLE ROW LEVEL SECURITY;

-- Policies for product_mapping_rules
CREATE POLICY "Allow read for authenticated users" ON product_mapping_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON product_mapping_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies for pool_base_prices
CREATE POLICY "Allow read for authenticated users" ON pool_base_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON pool_base_prices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- Sample data: Mapping rules for accessories
-- =============================================================================

-- Note: These will need actual product_id values after products are synced from Pipedrive
-- For now, we create the rules with NULL product_id - admin will assign products later

-- Schodiště
INSERT INTO product_mapping_rules (name, config_field, config_value, pool_shape, sort_order) VALUES
  ('Románské schodiště', 'stairs', 'roman', ARRAY['rectangle_rounded', 'rectangle_sharp'], 10),
  ('Trojúhelníkové rohové schodiště', 'stairs', 'corner_triangle', ARRAY['rectangle_rounded', 'rectangle_sharp'], 11),
  ('Schodiště přes celou šířku', 'stairs', 'full_width', ARRAY['rectangle_rounded', 'rectangle_sharp'], 12),
  ('Schodiště s relaxační lavicí', 'stairs', 'with_bench', ARRAY['rectangle_rounded', 'rectangle_sharp'], 13),
  ('Hranaté rohové schodiště', 'stairs', 'corner_square', ARRAY['rectangle_rounded', 'rectangle_sharp'], 14);

-- Technologie
INSERT INTO product_mapping_rules (name, config_field, config_value, sort_order) VALUES
  ('Technologická šachta', 'technology', 'shaft', 20),
  ('Technologická stěna', 'technology', 'wall', 21),
  ('Jiné umístění technologie', 'technology', 'other', 22);

-- Osvětlení
INSERT INTO product_mapping_rules (name, config_field, config_value, sort_order) VALUES
  ('LED osvětlení podvodní', 'lighting', 'led', 30);

-- Protiproud
INSERT INTO product_mapping_rules (name, config_field, config_value, sort_order) VALUES
  ('Protiproud', 'counterflow', 'with_counterflow', 40);

-- Úprava vody
INSERT INTO product_mapping_rules (name, config_field, config_value, sort_order) VALUES
  ('Chlorová úprava vody', 'waterTreatment', 'chlorine', 50),
  ('Solná elektrolýza', 'waterTreatment', 'salt', 51);

-- Ohřev
INSERT INTO product_mapping_rules (name, config_field, config_value, sort_order) VALUES
  ('Příprava odbočky pro ohřev', 'heating', 'preparation', 60),
  ('Tepelné čerpadlo', 'heating', 'heat_pump', 61);

-- Zastřešení
INSERT INTO product_mapping_rules (name, config_field, config_value, sort_order) VALUES
  ('Zastřešení bazénu', 'roofing', 'with_roofing', 70);
