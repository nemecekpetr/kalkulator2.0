-- Add coefficient unit and rename price_type value

-- 1. Add coefficient_unit column
ALTER TABLE products ADD COLUMN IF NOT EXISTS coefficient_unit TEXT DEFAULT 'm2'
  CHECK (coefficient_unit IN ('m2', 'bm'));

COMMENT ON COLUMN products.coefficient_unit IS 'Unit for coefficient pricing: m2 (surface area) or bm (perimeter/linear meter)';

-- 2. Update existing surface_coefficient values to coefficient
UPDATE products SET price_type = 'coefficient' WHERE price_type = 'surface_coefficient';

-- 3. Update the check constraint for price_type
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_type_check;
ALTER TABLE products ADD CONSTRAINT products_price_type_check
  CHECK (price_type IN ('fixed', 'percentage', 'coefficient'));
