-- =============================================================================
-- Migration: Product Material Thickness
-- Adds thickness variant for pool skeletons (5mm/8mm)
-- =============================================================================

-- Add material_thickness column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_thickness TEXT
  CHECK (material_thickness IS NULL OR material_thickness IN ('5mm', '8mm'));

-- Add compatible_shapes column - which pool shapes this product works with
-- NULL means all shapes are compatible
ALTER TABLE products ADD COLUMN IF NOT EXISTS compatible_shapes TEXT[];

-- Update existing skelety to be 5mm
UPDATE products
SET material_thickness = '5mm'
WHERE category = 'skelety' AND material_thickness IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.material_thickness IS 'Material thickness for skeletons: 5mm (standard) or 8mm (+10% price, only sharp corners and circles)';
COMMENT ON COLUMN products.compatible_shapes IS 'Pool shapes this product is compatible with (circle, rectangle_rounded, rectangle_sharp). NULL = all shapes.';
