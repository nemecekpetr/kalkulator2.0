-- Seed set_addons data for existing set products
-- Prices from: Příplatky sety - List 1.csv

-- set4 (4×3×1,2m)
UPDATE products SET set_addons = '[
  {"id": "sa-set4-h13", "name": "Hloubka 1,3m", "price": 4100, "sort_order": 0},
  {"id": "sa-set4-h14", "name": "Hloubka 1,4m", "price": 5100, "sort_order": 1},
  {"id": "sa-set4-h15", "name": "Hloubka 1,5m", "price": 6100, "sort_order": 2},
  {"id": "sa-set4-or", "name": "Ostré rohy", "price": 5110, "sort_order": 3},
  {"id": "sa-set4-ss", "name": "Schody přes šířku skeletu", "price": 15090, "sort_order": 4},
  {"id": "sa-set4-ts", "name": "Trojúhelníkové schody", "price": 7600, "sort_order": 5},
  {"id": "sa-set4-vrs", "name": "Vnější románské schody", "price": 4600, "sort_order": 6}
]'::jsonb
WHERE code = 'set4' AND category = 'sety';

-- set5 (5×3×1,2m)
UPDATE products SET set_addons = '[
  {"id": "sa-set5-h13", "name": "Hloubka 1,3m", "price": 4100, "sort_order": 0},
  {"id": "sa-set5-h14", "name": "Hloubka 1,4m", "price": 5100, "sort_order": 1},
  {"id": "sa-set5-h15", "name": "Hloubka 1,5m", "price": 6100, "sort_order": 2},
  {"id": "sa-set5-or", "name": "Ostré rohy", "price": 5790, "sort_order": 3},
  {"id": "sa-set5-ss", "name": "Schody přes šířku skeletu", "price": 15090, "sort_order": 4},
  {"id": "sa-set5-ts", "name": "Trojúhelníkové schody", "price": 7600, "sort_order": 5},
  {"id": "sa-set5-vrs", "name": "Vnější románské schody", "price": 4600, "sort_order": 6}
]'::jsonb
WHERE code = 'set5' AND category = 'sety';

-- set6 (6×3×1,2m)
UPDATE products SET set_addons = '[
  {"id": "sa-set6-h13", "name": "Hloubka 1,3m", "price": 4500, "sort_order": 0},
  {"id": "sa-set6-h14", "name": "Hloubka 1,4m", "price": 5500, "sort_order": 1},
  {"id": "sa-set6-h15", "name": "Hloubka 1,5m", "price": 6500, "sort_order": 2},
  {"id": "sa-set6-or", "name": "Ostré rohy", "price": 6520, "sort_order": 3},
  {"id": "sa-set6-ss", "name": "Schody přes šířku skeletu", "price": 15090, "sort_order": 4},
  {"id": "sa-set6-ts", "name": "Trojúhelníkové schody", "price": 7600, "sort_order": 5},
  {"id": "sa-set6-vrs", "name": "Vnější románské schody", "price": 4600, "sort_order": 6}
]'::jsonb
WHERE code = 'set6' AND category = 'sety';

-- set65 (6×3,5×1,2m)
UPDATE products SET set_addons = '[
  {"id": "sa-set65-h13", "name": "Hloubka 1,3m", "price": 4900, "sort_order": 0},
  {"id": "sa-set65-h14", "name": "Hloubka 1,4m", "price": 5900, "sort_order": 1},
  {"id": "sa-set65-h15", "name": "Hloubka 1,5m", "price": 6900, "sort_order": 2},
  {"id": "sa-set65-or", "name": "Ostré rohy", "price": 7335, "sort_order": 3},
  {"id": "sa-set65-ss", "name": "Schody přes šířku skeletu", "price": 20090, "sort_order": 4},
  {"id": "sa-set65-ts", "name": "Trojúhelníkové schody", "price": 7600, "sort_order": 5},
  {"id": "sa-set65-vrs", "name": "Vnější románské schody", "price": 4600, "sort_order": 6}
]'::jsonb
WHERE code = 'set65' AND category = 'sety';

-- set7 (7×3×1,2m)
UPDATE products SET set_addons = '[
  {"id": "sa-set7-h13", "name": "Hloubka 1,3m", "price": 4500, "sort_order": 0},
  {"id": "sa-set7-h14", "name": "Hloubka 1,4m", "price": 5500, "sort_order": 1},
  {"id": "sa-set7-h15", "name": "Hloubka 1,5m", "price": 6500, "sort_order": 2},
  {"id": "sa-set7-or", "name": "Ostré rohy", "price": 7250, "sort_order": 3},
  {"id": "sa-set7-ss", "name": "Schody přes šířku skeletu", "price": 15090, "sort_order": 4},
  {"id": "sa-set7-ts", "name": "Trojúhelníkové schody", "price": 7600, "sort_order": 5},
  {"id": "sa-set7-vrs", "name": "Vnější románské schody", "price": 4600, "sort_order": 6}
]'::jsonb
WHERE code = 'set7' AND category = 'sety';

-- set75 (7×3,5×1,2m)
UPDATE products SET set_addons = '[
  {"id": "sa-set75-h13", "name": "Hloubka 1,3m", "price": 4900, "sort_order": 0},
  {"id": "sa-set75-h14", "name": "Hloubka 1,4m", "price": 5900, "sort_order": 1},
  {"id": "sa-set75-h15", "name": "Hloubka 1,5m", "price": 6900, "sort_order": 2},
  {"id": "sa-set75-or", "name": "Ostré rohy", "price": 8365, "sort_order": 3},
  {"id": "sa-set75-ss", "name": "Schody přes šířku skeletu", "price": 20090, "sort_order": 4},
  {"id": "sa-set75-ts", "name": "Trojúhelníkové schody", "price": 7600, "sort_order": 5},
  {"id": "sa-set75-vrs", "name": "Vnější románské schody", "price": 4600, "sort_order": 6}
]'::jsonb
WHERE code = 'set75' AND category = 'sety';
