-- Přejmenování "Vnější románské schody" na "Vnitřní románské schodiště" v set addonech
UPDATE products
SET set_addons = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'name' ILIKE '%vnější románské schody%'
      THEN jsonb_set(elem, '{name}', to_jsonb(replace(elem->>'name', 'Vnější románské schody', 'Vnitřní románské schodiště')))
      ELSE elem
    END
  )
  FROM jsonb_array_elements(set_addons) AS elem
)
WHERE set_addons::text ILIKE '%vnější románské schody%';
