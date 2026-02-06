-- Prerequisite Products
-- Adds support for products that require other products to be in the quote first

-- =============================================
-- 1. ADD PREREQUISITE COLUMNS TO PRODUCTS TABLE
-- =============================================

-- Prerequisite product IDs (products that must be in the quote before this one can be added)
ALTER TABLE products ADD COLUMN IF NOT EXISTS prerequisite_product_ids UUID[];

-- Pool shapes where prerequisites are NOT checked (e.g., circle for 8mm - no sharp corners needed)
ALTER TABLE products ADD COLUMN IF NOT EXISTS prerequisite_pool_shapes TEXT[];

-- =============================================
-- 2. INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_products_prerequisite_product_ids
  ON products USING GIN (prerequisite_product_ids);

CREATE INDEX IF NOT EXISTS idx_products_prerequisite_pool_shapes
  ON products USING GIN (prerequisite_pool_shapes);

-- =============================================
-- 3. COMMENTS
-- =============================================

COMMENT ON COLUMN products.prerequisite_product_ids IS
  'Products that must be in the quote before this product can be added';

COMMENT ON COLUMN products.prerequisite_pool_shapes IS
  'Pool shapes where prerequisites are NOT checked (e.g., circle for 8mm material)';
