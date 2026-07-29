-- Which quote variant an order was created from (needed to correctly re-sync
-- items/prices from a multi-variant quote without merging all variants together)
ALTER TABLE orders ADD COLUMN quote_variant_id UUID REFERENCES quote_variants(id) ON DELETE SET NULL;

-- Manual pool-shape override used only for the order signature-page stairs
-- sketch and the production sheet shape icon (independent of the configurator's
-- pool_shape enum, which does not have an 'oval' option)
ALTER TABLE orders ADD COLUMN diagram_shape TEXT CHECK (diagram_shape IN ('circle', 'rectangle_rounded', 'rectangle_sharp', 'oval'));
