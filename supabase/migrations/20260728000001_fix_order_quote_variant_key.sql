-- orders.quote_variant_id (added in 20260727000001) is fundamentally broken:
-- quote_variants rows are deleted and recreated (new UUID) on every quote save
-- (see PUT/POST /api/admin/quotes), and the FK has ON DELETE SET NULL, so the
-- link silently goes null the moment a quote is saved — which always happens
-- right before a sync (handleSaveAndSyncOrder calls saveQuote() first).
--
-- Replace it with the variant's stable variant_key ('ekonomicka' | 'optimalni'
-- | 'premiova'), which is preserved across quote saves even though the row id
-- changes.
ALTER TABLE orders DROP COLUMN quote_variant_id;
ALTER TABLE orders ADD COLUMN quote_variant_key TEXT CHECK (quote_variant_key IN ('ekonomicka', 'optimalni', 'premiova'));
