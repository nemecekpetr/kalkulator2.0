-- Add 8mm material surcharge as set addon for all set products
-- Price calculated as 650 Kč/m² of pool surface area (walls + bottom)
-- Formula: surface = 2*(width*depth) + 2*(length*depth) + width*length

-- set4 (4×3×1,2m) → 28.8 m² × 650 = 18 720 Kč
UPDATE products SET set_addons = set_addons || '[{"id": "sa-set4-8mm", "name": "Materiál 8mm", "price": 18720, "sort_order": 7}]'::jsonb
WHERE code = 'set4' AND category = 'sety' AND set_addons IS NOT NULL;

-- set5 (5×3×1,2m) → 34.2 m² × 650 = 22 230 Kč
UPDATE products SET set_addons = set_addons || '[{"id": "sa-set5-8mm", "name": "Materiál 8mm", "price": 22230, "sort_order": 7}]'::jsonb
WHERE code = 'set5' AND category = 'sety' AND set_addons IS NOT NULL;

-- set6 (6×3×1,2m) → 39.6 m² × 650 = 25 740 Kč
UPDATE products SET set_addons = set_addons || '[{"id": "sa-set6-8mm", "name": "Materiál 8mm", "price": 25740, "sort_order": 7}]'::jsonb
WHERE code = 'set6' AND category = 'sety' AND set_addons IS NOT NULL;

-- set65 (6×3,5×1,2m) → 43.8 m² × 650 = 28 470 Kč
UPDATE products SET set_addons = set_addons || '[{"id": "sa-set65-8mm", "name": "Materiál 8mm", "price": 28470, "sort_order": 7}]'::jsonb
WHERE code = 'set65' AND category = 'sety' AND set_addons IS NOT NULL;

-- set7 (7×3×1,2m) → 45.0 m² × 650 = 29 250 Kč
UPDATE products SET set_addons = set_addons || '[{"id": "sa-set7-8mm", "name": "Materiál 8mm", "price": 29250, "sort_order": 7}]'::jsonb
WHERE code = 'set7' AND category = 'sety' AND set_addons IS NOT NULL;

-- set75 (7×3,5×1,2m) → 49.7 m² × 650 = 32 305 Kč
UPDATE products SET set_addons = set_addons || '[{"id": "sa-set75-8mm", "name": "Materiál 8mm", "price": 32305, "sort_order": 7}]'::jsonb
WHERE code = 'set75' AND category = 'sety' AND set_addons IS NOT NULL;
