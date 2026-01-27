-- =============================================================================
-- Migration: Product Categories v2
-- Updates product categories to match new CSV catalog structure
-- =============================================================================

-- Drop old category constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

-- Add new category constraint with updated values
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN (
    'skelety',      -- Bazénové skelety
    'sety',         -- Bazénové sety
    'schodiste',    -- Schodiště
    'technologie',  -- Filtrace, skimmery, trysky, šachty
    'osvetleni',    -- LED světla, trafo, krabice
    'uprava_vody',  -- Solná voda, UV lampa, dávkovače
    'protiproud',   -- Protiproudy
    'ohrev',        -- Tepelná čerpadla
    'material',     -- Lemová trubka, prostupy, odbočky
    'priplatky',    -- 8mm tloušťka, ostré rohy, změna hloubky
    'chemie',       -- Chlor, pH, sůl
    'zatepleni',    -- Zateplení stěn a dna
    'vysavace',     -- Ruční a robotické vysavače
    'sluzby',       -- Služby
    'doprava',      -- Doprava
    'jine'          -- Ostatní
  ));

-- Migrate existing products to new categories (if any remain)
UPDATE products SET category = 'skelety' WHERE category = 'bazeny';
UPDATE products SET category = 'jine' WHERE category = 'prislusenstvi';
UPDATE products SET category = 'jine' WHERE category = 'zastreseni';
UPDATE products SET category = 'jine' WHERE category = 'cisteni';
