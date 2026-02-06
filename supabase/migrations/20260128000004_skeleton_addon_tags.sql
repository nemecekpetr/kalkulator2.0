-- Add skeleton_addon tag to surcharge products (8mm thickness and sharp corners)
-- These products should be offered when adding a skeleton to a quote

-- Add tag to 8mm thickness product
UPDATE products
SET tags = array_append(COALESCE(tags, '{}'), 'skeleton_addon')
WHERE code = 'PRIPLATEK-8MM'
  AND NOT ('skeleton_addon' = ANY(COALESCE(tags, '{}')));

-- Add tag to sharp corners product
UPDATE products
SET tags = array_append(COALESCE(tags, '{}'), 'skeleton_addon')
WHERE code = 'PRIPLATEK-OSTRE-ROHY'
  AND NOT ('skeleton_addon' = ANY(COALESCE(tags, '{}')));
