-- Expand quote_items and order_items category to match ProductCategory (16 categories)
-- Migration: 20260103000001_expand_quote_item_category.sql

-- =============================================
-- QUOTE_ITEMS CATEGORY CONSTRAINT
-- =============================================
-- Old categories: 'bazeny', 'prislusenstvi', 'sluzby', 'prace', 'doprava', 'jine'
-- New categories: All 16 ProductCategory values + 'prace' for legacy

ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS quote_items_category_check;
ALTER TABLE quote_items ADD CONSTRAINT quote_items_category_check
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
    'sety',
    'prace'  -- Legacy category for manual work items
  ));

-- =============================================
-- ORDER_ITEMS CATEGORY CONSTRAINT
-- =============================================
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_category_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_category_check
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
    'sety',
    'prace'  -- Legacy category for manual work items
  ));

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON CONSTRAINT quote_items_category_check ON quote_items IS 'Category must match ProductCategory or legacy prace';
COMMENT ON CONSTRAINT order_items_category_check ON order_items IS 'Category must match ProductCategory or legacy prace';
