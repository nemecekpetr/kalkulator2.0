-- Update products table with new fields from Pipedrive
-- Migration: 20260102000001_product_fields_update.sql

-- =============================================
-- ADD NEW COLUMNS
-- =============================================

-- Old code (Starý kód) - previous product code before reorganization
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_code TEXT;

-- Subcategory (Subkategorie) - more specific categorization
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Manufacturer (Výrobce) - product manufacturer/brand
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- =============================================
-- UPDATE CATEGORY CONSTRAINT
-- =============================================
-- Old categories: 'bazeny', 'prislusenstvi', 'sluzby', 'doprava'
-- New categories from Pipedrive:
--   102: bazeny, 108: zastreseni, 109: sluzby, 110: doprava, 111: prislusenstvi,
--   113: schodiste, 114: uprava_vody, 115: protiproud, 116: technologie,
--   117: material, 118: ohrev, 119: osvetleni, 120: cisteni, 121: chemie,
--   122: jine, 137: sety

-- Drop old constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

-- Add new constraint with all categories
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN (
    'bazeny',
    'zastreseni',
    'sluzby',
    'doprava',
    'prislusenstvi',
    'schodiste',
    'uprava_vody',
    'protiproud',
    'technologie',
    'material',
    'ohrev',
    'osvetleni',
    'cisteni',
    'chemie',
    'jine',
    'sety'
  ));

-- =============================================
-- INDEXES FOR NEW COLUMNS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturer);
CREATE INDEX IF NOT EXISTS idx_products_old_code ON products(old_code);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON COLUMN products.old_code IS 'Previous product code before Pipedrive reorganization';
COMMENT ON COLUMN products.subcategory IS 'More specific product categorization';
COMMENT ON COLUMN products.manufacturer IS 'Product manufacturer/brand (e.g., Rentmil, AZUR, BRILIX)';
