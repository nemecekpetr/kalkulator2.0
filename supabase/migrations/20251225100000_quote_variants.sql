-- Quote variants table for multiple pricing options (Ekonomicka, Optimalni, Premiova)
CREATE TABLE IF NOT EXISTS quote_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,  -- 'ekonomicka', 'optimalni', 'premiova'
  variant_name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_price DECIMAL(12, 2) DEFAULT 0,
  UNIQUE(quote_id, variant_key)
);

-- Junction table for many-to-many relationship between items and variants
-- An item can belong to multiple variants (e.g., pool is in all variants)
CREATE TABLE IF NOT EXISTS quote_item_variants (
  quote_item_id UUID REFERENCES quote_items(id) ON DELETE CASCADE,
  quote_variant_id UUID REFERENCES quote_variants(id) ON DELETE CASCADE,
  PRIMARY KEY (quote_item_id, quote_variant_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quote_variants_quote_id ON quote_variants(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_item_variants_item_id ON quote_item_variants(quote_item_id);
CREATE INDEX IF NOT EXISTS idx_quote_item_variants_variant_id ON quote_item_variants(quote_variant_id);

-- Enable RLS
ALTER TABLE quote_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_item_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quote_variants
CREATE POLICY "Authenticated users can view quote variants"
  ON quote_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert quote variants"
  ON quote_variants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update quote variants"
  ON quote_variants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quote variants"
  ON quote_variants FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for quote_item_variants
CREATE POLICY "Authenticated users can view quote item variants"
  ON quote_item_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert quote item variants"
  ON quote_item_variants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quote item variants"
  ON quote_item_variants FOR DELETE
  TO authenticated
  USING (true);
