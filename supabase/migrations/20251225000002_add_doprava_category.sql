-- Add 'doprava' to products category constraint
-- This allows products to have category 'doprava' (transport/delivery)

-- Drop the old constraint and add new one with 'doprava'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('bazeny', 'prislusenstvi', 'sluzby', 'doprava'));
