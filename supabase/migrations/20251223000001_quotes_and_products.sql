-- Rentmil Nabídkovač - Products and Quotes Schema
-- This migration adds tables for the quote generator functionality

-- =============================================
-- PRODUCTS (synchronized from Pipedrive)
-- =============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Pipedrive sync
  pipedrive_id INTEGER UNIQUE,
  pipedrive_synced_at TIMESTAMPTZ,

  -- Product info
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('bazeny', 'prislusenstvi', 'sluzby')),

  -- Pricing
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'ks',

  -- Media
  image_url TEXT,

  -- Status
  active BOOLEAN DEFAULT true NOT NULL
);

-- =============================================
-- REFERENCE PHOTOS (for quotes visualization)
-- =============================================
CREATE TABLE reference_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Photo info
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,

  -- Pool attributes for matching
  pool_shape TEXT CHECK (pool_shape IN ('circle', 'rectangle_rounded', 'rectangle_sharp')),
  pool_type TEXT CHECK (pool_type IN ('skimmer', 'overflow')),
  pool_color TEXT CHECK (pool_color IN ('blue', 'white', 'gray', 'combination')),

  -- Tags for flexible filtering
  tags TEXT[],

  -- Ordering
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true NOT NULL
);

-- =============================================
-- QUOTES (main quotes table)
-- =============================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Quote number (human readable)
  quote_number TEXT UNIQUE NOT NULL,

  -- Link to configuration (optional)
  configuration_id UUID REFERENCES configurations(id) ON DELETE SET NULL,

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,

  -- Pool configuration (copied or entered manually)
  pool_config JSONB,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  -- Validity
  valid_until DATE,

  -- Pricing
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_price DECIMAL(12, 2) DEFAULT 0,

  -- Additional info
  notes TEXT,
  internal_notes TEXT,
  terms_and_conditions TEXT,

  -- Metadata
  created_by UUID,
  sent_at TIMESTAMPTZ
);

-- =============================================
-- QUOTE ITEMS (line items in quotes)
-- =============================================
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Parent quote
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Product reference (optional - can be custom item)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Item details (copied from product or entered manually)
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('bazeny', 'prislusenstvi', 'sluzby', 'prace', 'doprava', 'jine')),

  -- Pricing
  quantity DECIMAL(10, 2) DEFAULT 1 NOT NULL,
  unit TEXT DEFAULT 'ks',
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,

  -- Ordering
  sort_order INTEGER DEFAULT 0
);

-- =============================================
-- QUOTE VERSIONS (for versioning/history)
-- =============================================
CREATE TABLE quote_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Parent quote
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Version info
  version_number INTEGER NOT NULL,

  -- Snapshot of the quote at this version
  snapshot JSONB NOT NULL,

  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID,
  notes TEXT,

  -- Unique version per quote
  UNIQUE(quote_id, version_number)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_pipedrive_id ON products(pipedrive_id);

CREATE INDEX idx_reference_photos_pool_shape ON reference_photos(pool_shape);
CREATE INDEX idx_reference_photos_active ON reference_photos(active);

CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_configuration_id ON quotes(configuration_id);
CREATE INDEX idx_quotes_customer_email ON quotes(customer_email);

CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_category ON quote_items(category);

CREATE INDEX idx_quote_versions_quote_id ON quote_versions(quote_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at for products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for quotes
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate quote number (format: NAB-2025-0001)
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_quote_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 10 FOR 4) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM quotes
  WHERE quote_number LIKE 'NAB-' || current_year || '-%';

  new_quote_number := 'NAB-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN new_quote_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate quote totals
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quotes
  SET
    subtotal = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM quote_items
      WHERE quote_id = NEW.quote_id
    ),
    total_price = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM quote_items
      WHERE quote_id = NEW.quote_id
    ) * (1 - COALESCE(discount_percent, 0) / 100) - COALESCE(discount_amount, 0)
  WHERE id = NEW.quote_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate totals when items change
CREATE TRIGGER recalculate_quote_totals_insert
  AFTER INSERT ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

CREATE TRIGGER recalculate_quote_totals_update
  AFTER UPDATE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

CREATE TRIGGER recalculate_quote_totals_delete
  AFTER DELETE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Allow authenticated users full access to products"
  ON products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to products"
  ON products FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Reference photos policies
CREATE POLICY "Allow authenticated users full access to reference_photos"
  ON reference_photos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to reference_photos"
  ON reference_photos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Quotes policies
CREATE POLICY "Allow authenticated users full access to quotes"
  ON quotes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to quotes"
  ON quotes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Quote items policies
CREATE POLICY "Allow authenticated users full access to quote_items"
  ON quote_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to quote_items"
  ON quote_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Quote versions policies
CREATE POLICY "Allow authenticated users full access to quote_versions"
  ON quote_versions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to quote_versions"
  ON quote_versions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
