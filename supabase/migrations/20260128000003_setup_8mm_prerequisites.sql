-- Setup 8mm Material Prerequisites
-- Sets up the prerequisite relationship between 8mm material and sharp corners

-- =============================================
-- 1. ENSURE PRODUCTS EXIST
-- =============================================

-- Insert sharp corners product if it doesn't exist
INSERT INTO products (name, code, description, category, unit_price, unit, active, price_type, price_percentage, tags)
SELECT
  'Příplatek za ostré rohy',
  'PRIPLATEK-OSTRE-ROHY',
  'Příplatek za ostré rohy bazénového skeletu. Cena se počítá jako 10% z ceny bazénového skeletu.',
  'priplatky',
  0,
  'ks',
  true,
  'percentage',
  10,
  ARRAY['priplatek', 'ostre_rohy']
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE code = 'PRIPLATEK-OSTRE-ROHY'
);

-- Insert 8mm material product if it doesn't exist
INSERT INTO products (name, code, description, category, unit_price, unit, active, price_type, price_coefficient, coefficient_unit, tags)
SELECT
  'Příplatek 8mm tloušťka dna a stěn',
  'PRIPLATEK-8MM',
  'Příplatek za silnější 8mm materiál na dno a stěny bazénu. Cena se počítá podle povrchu bazénu (650 Kč/m²). Pro obdélníkové bazény vyžaduje příplatek za ostré rohy.',
  'priplatky',
  0,
  'm²',
  true,
  'coefficient',
  650,
  'm2',
  ARRAY['priplatek', 'material', '8mm']
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE code = 'PRIPLATEK-8MM'
);

-- =============================================
-- 2. SET UP PREREQUISITES FOR 8MM
-- =============================================

-- Set prerequisite_product_ids for 8mm (requires sharp corners)
UPDATE products
SET
  prerequisite_product_ids = (
    SELECT ARRAY_AGG(id)
    FROM products
    WHERE code = 'PRIPLATEK-OSTRE-ROHY'
  ),
  -- For circular pools, prerequisites are not checked (no corners to make sharp)
  prerequisite_pool_shapes = ARRAY['circle']
WHERE code = 'PRIPLATEK-8MM';

-- =============================================
-- 3. VERIFY SETUP
-- =============================================

-- This will show the setup after migration
DO $$
DECLARE
  sharp_corners_id UUID;
  product_8mm_record RECORD;
BEGIN
  -- Get sharp corners ID
  SELECT id INTO sharp_corners_id FROM products WHERE code = 'PRIPLATEK-OSTRE-ROHY';

  -- Get 8mm product
  SELECT * INTO product_8mm_record FROM products WHERE code = 'PRIPLATEK-8MM';

  -- Log setup
  RAISE NOTICE 'Sharp corners product ID: %', sharp_corners_id;
  RAISE NOTICE '8mm product prerequisite_product_ids: %', product_8mm_record.prerequisite_product_ids;
  RAISE NOTICE '8mm product prerequisite_pool_shapes: %', product_8mm_record.prerequisite_pool_shapes;

  -- Verify the setup
  IF product_8mm_record.prerequisite_product_ids IS NULL OR array_length(product_8mm_record.prerequisite_product_ids, 1) = 0 THEN
    RAISE WARNING '8mm product has no prerequisites set!';
  ELSIF sharp_corners_id = ANY(product_8mm_record.prerequisite_product_ids) THEN
    RAISE NOTICE '✅ 8mm product correctly requires sharp corners';
  ELSE
    RAISE WARNING '8mm product prerequisites do not include sharp corners!';
  END IF;

  IF product_8mm_record.prerequisite_pool_shapes IS NULL OR NOT 'circle' = ANY(product_8mm_record.prerequisite_pool_shapes) THEN
    RAISE WARNING '8mm product does not skip prerequisites for circle pools!';
  ELSE
    RAISE NOTICE '✅ 8mm product correctly skips prerequisites for circle pools';
  END IF;
END $$;
